import { test } from "node:test";
import assert from "node:assert/strict";
import { filterItems } from "../src/model.js";
const base = {
  room: "Bedroom",
  location: "Closet › Second drawer",
  category: "general",
  notes: "",
  image: "",
  updatedAt: "2026-10-22T00:00:00.000Z",
};
const items = [
  { ...base, id: "passport", name: "דרכון" },
  {
    ...base,
    id: "keys",
    name: "מפתחות רכב",
    room: "Entrance",
    location: "Blue box",
  },
  {
    ...base,
    id: "audio",
    name: "Black headphones",
    room: "Office",
    location: "Desk",
  },
  { ...base, id: "jacket", name: "Winter jacket" },
];
for (const [query, expected] of [
  ["Find my passport.", ["passport"]],
  ["Where are my car keys?", ["keys"]],
  ["Show everything stored in my bedroom.", ["passport", "jacket"]],
  ["Where did I put my black headphones?", ["audio"]],
  ["איפה הדרכון שלי", ["passport"]],
  ["הצג את כל החפצים בחדר שינה", ["passport", "jacket"]],
  ["אוזניות שחורות", ["audio"]],
  ["passpor", ["passport"]],
  ["pasport", ["passport"]],
  ["blue container", ["keys"]],
  ["red headphones", []],
  ["wallet", []],
])
  test(`local bilingual query: ${query}`, () =>
    assert.deepEqual(
      filterItems(items, query).map((i) => i.id),
      expected,
    ));
