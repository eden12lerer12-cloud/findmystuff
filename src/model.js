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
            [item.name, item.room, item.location, item.notes].join(" "),
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
export function validateItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item))
    throw new Error("Invalid item");
  const image = field(item.image ?? "", 2000000);
  if (
    image &&
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)
  )
    throw new Error("Invalid image");
  if (
    !(item.category in categories) ||
    !Object.hasOwn(categories, item.category)
  )
    throw new Error("Invalid category");
  if (
    typeof item.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(item.updatedAt))
  )
    throw new Error("Invalid date");
  return {
    id: field(item.id, 80, true),
    name: field(item.name, 100, true),
    room: field(item.room, 80, true),
    location: field(item.location, 180, true),
    notes: field(item.notes ?? "", 1200),
    category: item.category,
    image,
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}
export function parseBackup(text) {
  const backup = JSON.parse(text);
  if (
    !backup ||
    backup.app !== "where-did-i-put-it" ||
    backup.version !== 1 ||
    !Array.isArray(backup.items) ||
    backup.items.length > 2000
  )
    throw new Error("Invalid backup");
  const items = backup.items.map(validateItem);
  if (new Set(items.map((i) => i.id)).size !== items.length)
    throw new Error("Duplicate IDs");
  return items;
}
