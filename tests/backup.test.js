import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCatalog, parseBackupBundle } from "../src/model.js";
import { createBackup, readBackup, importPreview } from "../src/backup-core.js";
import { BACKUP_LIMITS } from "../src/limits.js";
const item = {
  id: "fixture",
  name: "דרכון Passport",
  room: "חדר שינה",
  location: "מדף עליון",
  category: "general",
  notes: "Fictional fixture only",
  image: "data:image/jpeg;base64,YWJj",
  updatedAt: "2026-10-22T12:00:00.000Z",
};
const state = () => ({ items: [{ ...item }], catalog: defaultCatalog() });
test("every successful export round-trips items, photos and all reusable options", async () => {
  const original = state();
  original.catalog.rooms.push({ id: "room-fixture", name: "Guest room" });
  original.catalog.locations.push({ id: "place-fixture", name: "Empty box" });
  const blob = createBackup(original);
  assert.ok(blob.size <= BACKUP_LIMITS.maxBytes);
  assert.deepEqual(await readBackup(blob), original);
});
test("byte limit counts UTF-8, accepts the exact boundary and refuses one byte below", async () => {
  const blob = createBackup(state());
  assert.ok(blob.size > (await blob.text()).length);
  assert.equal(
    createBackup(state(), { ...BACKUP_LIMITS, maxBytes: blob.size }).size,
    blob.size,
  );
  assert.throws(
    () => createBackup(state(), { ...BACKUP_LIMITS, maxBytes: blob.size - 1 }),
    (error) => error.code === "backupTooLarge",
  );
});
test("large inventories beyond the former 2000-record limit round-trip", async () => {
  const original = state();
  original.items = Array.from({ length: 2500 }, (_, i) => ({
    ...item,
    id: `fixture-${i}`,
    image: "",
  }));
  const restored = await readBackup(createBackup(original));
  assert.deepEqual(restored, original);
});
test("export refuses excess record counts, duplicate IDs and invalid category references", () => {
  assert.throws(
    () =>
      createBackup(
        { ...state(), items: [item, item] },
        { ...BACKUP_LIMITS, maxItems: 1 },
      ),
    (error) => error.code === "backupTooMany",
  );
  assert.throws(() => createBackup({ ...state(), items: [item, item] }));
  assert.throws(() =>
    createBackup({ ...state(), items: [{ ...item, category: "missing" }] }),
  );
});
test("oversized import is refused before reading the file", async () => {
  let read = false;
  await assert.rejects(
    readBackup({
      size: BACKUP_LIMITS.maxBytes + 1,
      text: async () => {
        read = true;
        return "{}";
      },
    }),
    (error) => error.code === "backupTooLarge",
  );
  assert.equal(read, false);
});
test("legacy v1 and v2 without rooms remain importable; malformed files fail", async () => {
  for (const version of [1, 2]) {
    const catalog = defaultCatalog();
    delete catalog.rooms;
    const source = JSON.stringify({
      app: "where-did-i-put-it",
      version,
      catalog,
      items: [item],
    });
    assert.deepEqual((await readBackup(new Blob([source]))).items, [item]);
  }
  await assert.rejects(readBackup(new Blob(["{bad json"])));
  assert.throws(() =>
    parseBackupBundle(
      JSON.stringify({
        app: "where-did-i-put-it",
        version: 2,
        catalog: defaultCatalog(),
        items: [item, item],
      }),
    ),
  );
});
test("preview distinguishes new records from IDs that might replace stored records", () => {
  assert.deepEqual(
    importPreview({ items: [item, { ...item, id: "new" }] }, [
      "fixture",
      "other",
    ]),
    { total: 2, existing: 1, newItems: 1 },
  );
});
