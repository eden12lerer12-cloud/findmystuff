import { test } from "node:test";
import assert from "node:assert/strict";
import { filterItems, parseBackup, validateItem } from "../src/model.js";
const item = {
  id: "test",
  name: "מַפְתֵּחַ רזרבי",
  room: "כניסה",
  location: "מגירה כחולה",
  notes: "ליד הדלת",
  category: "keys",
  image: "",
  updatedAt: "2026-10-22T12:00:00.000Z",
};
test("Hebrew search ignores vowel marks and searches multiple fields", () => {
  assert.equal(filterItems([item], "מפתח כחולה").length, 1);
  assert.equal(filterItems([item], "מפתח אדומה").length, 0);
});
test("Room and category filters combine with the query", () => {
  assert.equal(filterItems([item], "דלת", "כניסה", "keys").length, 1);
  assert.equal(filterItems([item], "", "סלון").length, 0);
  assert.equal(filterItems([item], "", "", "documents").length, 0);
});
test("Backup round trip preserves photos and notes", () => {
  const photo = { ...item, image: "data:image/jpeg;base64,YWJj" };
  assert.deepEqual(
    parseBackup(
      JSON.stringify({ app: "where-did-i-put-it", version: 1, items: [photo] }),
    ),
    [photo],
  );
});
test("Import rejects unsupported version, duplicate IDs and remote or executable images", () => {
  const backup = (items) =>
    JSON.stringify({ app: "where-did-i-put-it", version: 1, items });
  assert.throws(() => parseBackup(backup([item, item])));
  assert.throws(() =>
    parseBackup(backup([{ ...item, image: "https://example.com/track.png" }])),
  );
  assert.throws(() =>
    parseBackup(backup([{ ...item, image: "data:image/svg+xml;base64,YWJj" }])),
  );
  assert.throws(() => parseBackup('{"app":"other","version":1,"items":[]}'));
});
test("Reject missing fields, oversized notes and inherited categories", () => {
  assert.throws(() => validateItem({ ...item, name: "  " }));
  assert.throws(() => validateItem({ ...item, notes: "x".repeat(1201) }));
  assert.throws(() => validateItem({ ...item, category: "constructor" }));
});
test("Sort newest update first and sort names", () => {
  const newer = {
    ...item,
    id: "new",
    name: "אוזניות",
    updatedAt: "2026-10-23T00:00:00.000Z",
  };
  assert.equal(filterItems([item, newer])[0].id, "new");
  assert.equal(
    filterItems([item, newer], "", "", "", "name")[0].name,
    "אוזניות",
  );
});
