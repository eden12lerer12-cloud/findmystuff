import {
  defaultCatalog,
  validateCatalog,
  validateItem,
  validatePreset,
  normalize,
} from "./model.js";
import {
  resolveLocation,
  itemPlace,
  withLocationHistory,
} from "./locations.js";
let database;
export async function openStore() {
  if (!database)
    database = new Promise((resolve, reject) => {
      let abandoned = false;
      const request = indexedDB.open("where-did-i-put-it", 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("items"))
          db.createObjectStore("items", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings")) {
          const settings = db.createObjectStore("settings", { keyPath: "id" });
          settings.put({ id: "catalog", ...defaultCatalog() });
        }
        const settings = request.transaction.objectStore("settings");
        const read = settings.get("catalog");
        read.onsuccess = () => {
          const catalog = validateCatalog(read.result);
          const items = request.transaction.objectStore("items").openCursor();
          items.onsuccess = () => {
            const cursor = items.result;
            if (cursor) {
              const item = cursor.value;
              if (
                item.room &&
                catalog.rooms.length < 500 &&
                !catalog.rooms.some(
                  (room) => normalize(room.name) === normalize(item.room),
                )
              )
                catalog.rooms.push({
                  id: `legacy-room-${crypto.randomUUID()}`,
                  name: item.room,
                });
              cursor.continue();
            } else settings.put({ id: "catalog", ...validateCatalog(catalog) });
          };
        };
      };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        abandoned = true;
        database = undefined;
        reject(
          new Error(
            "Close or refresh other application tabs to upgrade storage",
          ),
        );
      };
    });
  return database;
}
export async function snapshot() {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["items", "settings"], "readonly");
    const items = tx.objectStore("items").getAll();
    const catalog = tx.objectStore("settings").get("catalog");
    const generation = tx.objectStore("settings").get("generation");
    tx.oncomplete = () => {
      try {
        resolve({
          items: items.result,
          generation: generation.result?.value ?? "initial",
          catalog: validateCatalog(catalog.result),
        });
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Read aborted"));
  });
}
export async function allItems() {
  return (await snapshot()).items;
}
export async function itemKeys() {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readonly");
    const request = tx.objectStore("items").getAllKeys();
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Read aborted"));
  });
}
// Catalog and item updates share a transaction, so deletion cannot orphan items.
async function update(operation, expectedGeneration) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["items", "settings"], "readwrite");
    const items = tx.objectStore("items");
    const settings = tx.objectStore("settings");
    const generation = settings.get("generation");
    const request = settings.get("catalog");
    let failure, result;
    request.onsuccess = () => {
      try {
        if (
          expectedGeneration !== undefined &&
          expectedGeneration !== (generation.result?.value ?? "initial")
        )
          throw new Error("Data was erased; reload before saving");
        result = operation({
          items,
          settings,
          catalog: validateCatalog(request.result),
          tx,
        });
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(failure ?? tx.error);
    tx.onabort = () =>
      reject(
        failure ??
          result?.failure ??
          tx.error ??
          new Error("Transaction aborted"),
      );
  });
}
export async function mutate(
  changes = [],
  deletedId,
  importedCatalog,
  options = {},
) {
  return update(({ items, settings, catalog, tx }) => {
    if (importedCatalog) {
      const incoming = validateCatalog(importedCatalog);
      for (const type of ["categories", "locations", "rooms", "collections"]) {
        const ids = new Set(catalog[type].map((preset) => preset.id));
        catalog[type].push(
          ...incoming[type].filter((preset) => !ids.has(preset.id)),
        );
      }
      validateCatalog(catalog);
    }
    const validated = changes.map((item) => {
      if (!importedCatalog && item.locationId) {
        const place = resolveLocation(catalog, item.locationId);
        item = {
          ...item,
          room: place.room || item.room,
          location: place.location,
        };
      }
      return validateItem(item, catalog);
    });
    if (deletedId) items.delete(deletedId);
    const result = { written: 0, skipped: 0 };
    for (const item of validated) {
      if (options.skipExisting || !importedCatalog) {
        const request = items.get(item.id);
        request.onsuccess = () => {
          if (options.skipExisting && request.result !== undefined)
            result.skipped++;
          else {
            try {
              items.put(
                importedCatalog
                  ? item
                  : validateItem(
                      withLocationHistory(request.result, item),
                      catalog,
                    ),
              );
              result.written++;
            } catch (error) {
              result.failure = error;
              tx.abort();
            }
          }
        };
      } else {
        items.put(item);
        result.written++;
      }
    }
    if (importedCatalog) settings.put({ id: "catalog", ...catalog });
    return result;
  }, options.expectedGeneration);
}
export async function addPreset(type, name) {
  if (!["categories", "locations", "rooms"].includes(type))
    throw new Error("Invalid preset type");
  const preset = validatePreset(
    { id: `custom-${crypto.randomUUID()}`, name },
    type,
  );
  await update(({ catalog, settings }) => {
    if (
      catalog[type].some(
        (existing) => normalize(existing.name) === normalize(preset.name),
      )
    )
      throw new Error("duplicatePreset");
    catalog[type].push(preset);
    validateCatalog(catalog);
    settings.put({ id: "catalog", ...catalog });
  });
  return preset;
}
export async function removePreset(type, id) {
  if (
    !["categories", "locations", "rooms"].includes(type) ||
    (type === "categories" && id === "general")
  )
    throw new Error("Protected preset");
  await update(({ catalog, items, settings }) => {
    if (
      type === "locations" &&
      catalog.locations.some((node) => node.parentId === id)
    )
      throw new Error("Location has children");
    if (
      type === "rooms" &&
      catalog.locations.some((node) => node.roomId === id)
    )
      throw new Error("Room has locations");
    if (type === "locations") {
      for (const group of catalog.collections)
        for (const entry of group.entries)
          if (entry.boxId === id) {
            entry.boxName = resolveLocation(catalog, id).location;
            delete entry.boxId;
          }
    }
    const previous = catalog;
    const oldLocations = [...catalog.locations];
    catalog[type] = catalog[type].filter((preset) => preset.id !== id);
    settings.put({ id: "catalog", ...catalog });
    if (type === "categories" || type === "locations") {
      const cursor = items.openCursor();
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) return;
        if (type === "categories" && current.value.category === id)
          current.update({ ...current.value, category: "general" });
        if (type === "locations" && current.value.locationId === id) {
          const place = itemPlace(current.value, {
            ...previous,
            locations: oldLocations,
          });
          const value = { ...current.value, ...place };
          delete value.locationId;
          current.update(value);
        }
        current.continue();
      };
    }
  });
}
export async function addLocation(input) {
  const node = validatePreset(
    { id: `location-${crypto.randomUUID()}`, ...input },
    "locations",
  );
  await update(({ catalog, settings }) => {
    catalog.locations.push(node);
    settings.put({ id: "catalog", ...validateCatalog(catalog) });
  });
  return node;
}
export async function renamePlace(type, id, name) {
  if (!["locations", "rooms"].includes(type))
    throw new Error("Invalid location type");
  await update(({ catalog, settings, items }) => {
    const preset = catalog[type].find((p) => p.id === id);
    if (!preset) throw new Error("Unknown location");
    const oldName = preset.name;
    Object.assign(preset, validatePreset({ ...preset, name }, type));
    settings.put({ id: "catalog", ...validateCatalog(catalog) });
    if (type === "rooms") {
      const request = items.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (!cursor.value.locationId && cursor.value.room === oldName)
          cursor.update({ ...cursor.value, room: preset.name });
        cursor.continue();
      };
    }
  });
}

// One transaction clears only this app's inventory and settings. In-flight stale
// imports/drafts cannot reintroduce data using the previous generation.
export async function eraseAll() {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["items", "settings"], "readwrite");
    tx.objectStore("items").clear();
    const settings = tx.objectStore("settings");
    settings.clear();
    settings.put({ id: "catalog", ...defaultCatalog() });
    settings.put({ id: "generation", value: crypto.randomUUID() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Erase aborted"));
  });
}

export async function saveCollection(group, expectedGeneration) {
  await update(({ catalog, settings }) => {
    const index = catalog.collections.findIndex(
      (value) => value.id === group.id,
    );
    if (index < 0) catalog.collections.push(group);
    else catalog.collections[index] = group;
    settings.put({ id: "catalog", ...validateCatalog(catalog) });
  }, expectedGeneration);
}
export async function deleteCollection(id, expectedGeneration) {
  await update(({ catalog, settings }) => {
    catalog.collections = catalog.collections.filter(
      (group) => group.id !== id,
    );
    settings.put({ id: "catalog", ...catalog });
  }, expectedGeneration);
}
