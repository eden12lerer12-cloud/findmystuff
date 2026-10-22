export const categories = {
  general: ["📦", "כללי"],
  documents: ["📄", "מסמכים"],
  electronics: ["🎧", "אלקטרוניקה"],
  keys: ["🔑", "מפתחות"],
  clothing: ["🧣", "ביגוד"],
  tools: ["🛠️", "כלי עבודה"],
};
export const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "")
    .toLocaleLowerCase("he")
    .trim();
export function filterItems(
  items,
  query = "",
  room = "",
  category = "",
  sort = "recent",
) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return items
    .filter(
      (item) =>
        (!room || item.room === room) &&
        (!category || item.category === category) &&
        words.every((word) =>
          normalize(
            [
              item.name,
              item.room,
              item.location,
              item.notes,
              item.categoryLabel ?? "",
            ].join(" "),
          ).includes(word),
        ),
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
  return {
    id,
    name: field(
      preset.name,
      type === "categories" ? 60 : type === "rooms" ? 80 : 180,
      true,
    ),
  };
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
  return result;
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
    room: field(item.room, 80, true),
    location: field(item.location, 180, true),
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
  return result;
}
export function parseBackupBundle(text) {
  const backup = JSON.parse(text);
  if (
    !backup ||
    backup.app !== "where-did-i-put-it" ||
    ![1, 2].includes(backup.version) ||
    !Array.isArray(backup.items) ||
    backup.items.length > 2000
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
