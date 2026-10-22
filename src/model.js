import { BACKUP_LIMITS } from "./limits.js";
import { validateLocationGraph, itemPlace } from "./locations.js";
import { normalize } from "./text.js";
import { matchSearch } from "./search.js";
export { normalize } from "./text.js";
export const categories = {
  general: ["📦", "כללי"],
  documents: ["📄", "מסמכים"],
  electronics: ["🎧", "אלקטרוניקה"],
  keys: ["🔑", "מפתחות"],
  clothing: ["🧣", "ביגוד"],
  tools: ["🛠️", "כלי עבודה"],
};
export function filterItems(
  items,
  query = "",
  room = "",
  category = "",
  sort = "recent",
  catalog = null,
) {
  return items
    .filter(
      (item) =>
        (!room ||
          (catalog ? itemPlace(item, catalog).room : item.room) === room) &&
        (!category || item.category === category) &&
        matchSearch(
          [
            item.name,
            catalog ? itemPlace(item, catalog).room : item.room,
            catalog ? itemPlace(item, catalog).location : item.location,
            item.notes,
            item.categoryLabel ?? "",
            item.category,
            catalog?.categories.find(
              (category) => category.id === item.category,
            )?.name ?? "",
          ].join(" "),
          query,
        ).matches,
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "he")
        : b.updatedAt.localeCompare(a.updatedAt),
    );
}
function field(value, max, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("Invalid item field");
  return value.trim();
}
export function defaultCatalog() {
  return {
    categories: Object.entries(categories).map(([id, [, name]]) => ({
      id,
      name,
    })),
    locations: [],
    rooms: [],
    collections: [],
  };
}
export function validatePreset(preset, type) {
  if (!preset || typeof preset !== "object") throw new Error("Invalid preset");
  const id = field(preset.id, 80, true);
  if (
    !/^[a-zA-Z0-9_-]+$/.test(id) ||
    ["__proto__", "__once__", "__add__", "constructor", "prototype"].includes(
      id,
    )
  )
    throw new Error("Invalid preset ID");
  const result = {
    id,
    name: field(
      preset.name,
      type === "categories" ? 60 : type === "rooms" ? 80 : 180,
      true,
    ),
  };
  if (type === "locations") {
    for (const key of ["roomId", "parentId"])
      if (preset[key] != null) result[key] = field(preset[key], 80, true);
    if (preset.kind !== undefined) {
      if (
        !["furniture", "shelf", "drawer", "box", "other"].includes(preset.kind)
      )
        throw new Error("Invalid location kind");
      result.kind = preset.kind;
    }
  }
  return result;
}
export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== "object")
    throw new Error("Invalid catalog");
  const result = {};
  for (const [type, limit] of [
    ["categories", 500],
    ["locations", 1000],
    ["rooms", 500],
  ]) {
    const list =
      type === "rooms" && catalog.rooms === undefined ? [] : catalog[type];
    if (!Array.isArray(list) || list.length > limit)
      throw new Error("Invalid catalog list");
    result[type] = list.map((preset) => validatePreset(preset, type));
    if (
      new Set(result[type].map((preset) => preset.id)).size !==
      result[type].length
    )
      throw new Error("Duplicate preset IDs");
  }
  if (!result.categories.some((preset) => preset.id === "general"))
    throw new Error("Missing fallback category");
  const collections = catalog.collections ?? [];
  if (!Array.isArray(collections) || collections.length > 100)
    throw new Error("Invalid collections");
  result.collections = collections.map((group) => validateCollection(group));
  if (
    new Set(result.collections.map((group) => group.id)).size !==
    result.collections.length
  )
    throw new Error("Duplicate collection IDs");
  for (const group of result.collections)
    for (const entry of group.entries) {
      if (
        entry.boxId &&
        !result.locations.some(
          (place) => place.id === entry.boxId && place.kind === "box",
        )
      )
        throw new Error("Unknown packing box");
    }
  return validateLocationGraph(result);
}
export function validateItem(item, catalog = defaultCatalog()) {
  if (!item || typeof item !== "object" || Array.isArray(item))
    throw new Error("Invalid item");
  const image = field(item.image ?? "", 2000000);
  if (
    image &&
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)
  )
    throw new Error("Invalid image");
  if (
    typeof item.category !== "string" ||
    !catalog.categories.some((preset) => preset.id === item.category)
  )
    throw new Error("Invalid category");
  if (
    typeof item.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(item.updatedAt))
  )
    throw new Error("Invalid date");
  const result = {
    id: field(item.id, 80, true),
    name: field(item.name, 100, true),
    room: field(item.room, 80),
    location: field(item.location, 2000, true),
    notes: field(item.notes ?? "", 1200),
    category: item.category,
    image,
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
  if (item.categoryLabel !== undefined) {
    result.categoryLabel = field(item.categoryLabel, 60, true);
    if (result.category !== "general")
      throw new Error("One-time category must use the fallback ID");
  }
  if (item.locationId !== undefined) {
    result.locationId = field(item.locationId, 80, true);
    if (!catalog.locations.some((node) => node.id === result.locationId))
      throw new Error("Unknown item location");
  }
  if (item.locationRecordedAt !== undefined) {
    if (
      typeof item.locationRecordedAt !== "string" ||
      !Number.isFinite(Date.parse(item.locationRecordedAt))
    )
      throw new Error("Invalid location date");
    result.locationRecordedAt = new Date(item.locationRecordedAt).toISOString();
  }
  if (item.history !== undefined) {
    if (!Array.isArray(item.history) || item.history.length > 1000)
      throw new Error("Invalid history");
    result.history = item.history.map((entry) => {
      if (
        !entry ||
        typeof entry.recordedAt !== "string" ||
        !Number.isFinite(Date.parse(entry.recordedAt))
      )
        throw new Error("Invalid history date");
      return {
        room: field(entry.room, 80),
        location: field(entry.location, 2000, true),
        recordedAt: new Date(entry.recordedAt).toISOString(),
        ...(entry.locationId
          ? { locationId: field(entry.locationId, 80, true) }
          : {}),
      };
    });
  }
  return result;
}
export function parseBackupBundle(text) {
  return validateBackupObject(JSON.parse(text));
}
export function validateBackupObject(backup) {
  if (
    !backup ||
    backup.app !== "where-did-i-put-it" ||
    ![1, 2, 3, 4].includes(backup.version) ||
    !Array.isArray(backup.items) ||
    backup.items.length > BACKUP_LIMITS.maxItems
  )
    throw new Error("Invalid backup");
  const catalog =
    backup.version === 1 ? defaultCatalog() : validateCatalog(backup.catalog);
  const items = backup.items.map((item) => validateItem(item, catalog));
  if (new Set(items.map((i) => i.id)).size !== items.length)
    throw new Error("Duplicate IDs");
  return { items, catalog };
}
export function parseBackup(text) {
  return parseBackupBundle(text).items;
}

export function validateCollection(group) {
  const preset = validatePreset(group, "rooms");
  if (
    !["collection", "moving"].includes(group.kind) ||
    !Array.isArray(group.entries) ||
    group.entries.length > BACKUP_LIMITS.maxItems
  )
    throw new Error("Invalid collection");
  const entries = group.entries.map((entry) => {
    if (!entry || typeof entry !== "object")
      throw new Error("Invalid collection entry");
    const value = { itemId: field(entry.itemId, 80, true) };
    if (group.kind === "moving") {
      if (typeof entry.packed !== "boolean")
        throw new Error("Invalid packing status");
      value.packed = entry.packed;
      if (entry.boxId !== undefined) value.boxId = field(entry.boxId, 80, true);
      if (entry.boxName !== undefined)
        value.boxName = field(entry.boxName, 2000, true);
      if (value.packed && !value.boxId && !value.boxName)
        throw new Error("Choose a packing box");
    }
    return value;
  });
  if (new Set(entries.map((entry) => entry.itemId)).size !== entries.length)
    throw new Error("Duplicate collection entries");
  return { ...preset, kind: group.kind, entries };
}
