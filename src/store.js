import {
  defaultCatalog,
  validateCatalog,
  validateItem,
  validatePreset,
  normalize,
} from "./model.js";
let database;
export async function openStore() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("where-did-i-put-it", 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("items"))
          db.createObjectStore("items", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings")) {
          const settings = db.createObjectStore("settings", { keyPath: "id" });
          settings.put({ id: "catalog", ...defaultCatalog() });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
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
    tx.oncomplete = () => {
      try {
        resolve({
          items: items.result,
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
// Catalog and item updates share a transaction, so deletion cannot orphan items.
async function update(operation) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["items", "settings"], "readwrite");
    const items = tx.objectStore("items");
    const settings = tx.objectStore("settings");
    const request = settings.get("catalog");
    let failure, result;
    request.onsuccess = () => {
      try {
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
      reject(failure ?? tx.error ?? new Error("Transaction aborted"));
  });
}
export async function mutate(changes = [], deletedId, importedCatalog) {
  return update(({ items, settings, catalog }) => {
    if (importedCatalog) {
      const incoming = validateCatalog(importedCatalog);
      for (const type of ["categories", "locations", "rooms"]) {
        const ids = new Set(catalog[type].map((preset) => preset.id));
        catalog[type].push(
          ...incoming[type].filter((preset) => !ids.has(preset.id)),
        );
      }
      validateCatalog(catalog);
    }
    const validated = changes.map((item) => validateItem(item, catalog));
    if (deletedId) items.delete(deletedId);
    for (const item of validated) items.put(item);
    if (importedCatalog) settings.put({ id: "catalog", ...catalog });
  });
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
    catalog[type] = catalog[type].filter((preset) => preset.id !== id);
    settings.put({ id: "catalog", ...catalog });
    if (type === "categories") {
      const cursor = items.openCursor();
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) return;
        if (current.value.category === id)
          current.update({ ...current.value, category: "general" });
        current.continue();
      };
    }
  });
}
