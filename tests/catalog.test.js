import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  defaultCatalog,
  parseBackupBundle,
  validateItem,
} from "../src/model.js";
import { snapshot, mutate, addPreset, removePreset } from "../src/store.js";

const legacyItem = {
  id: "legacy",
  name: "Passport",
  room: "Bedroom",
  location: "Blue box",
  category: "documents",
  notes: "Original notes",
  image: "data:image/jpeg;base64,YWJj",
  updatedAt: "2026-10-22T12:00:00.000Z",
};
test("catalog migration and persistent operations preserve inventory", async (t) => {
  const old = await new Promise((resolve, reject) => {
    const request = indexedDB.open("where-did-i-put-it", 1);
    request.onupgradeneeded = () =>
      request.result
        .createObjectStore("items", { keyPath: "id" })
        .put(legacyItem);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  old.close();
  await t.test(
    "version 1 upgrade preserves exact records and creates default lists",
    async () => {
      const state = await snapshot();
      assert.deepEqual(state.items, [legacyItem]);
      assert.deepEqual(state.catalog.categories, defaultCatalog().categories);
      assert.equal(state.catalog.rooms[0].name, legacyItem.room);
    },
  );
  let category, place;
  await t.test(
    "saved rooms work without items, survive backup and preserve existing item room text on removal",
    async () => {
      const room = await addPreset("rooms", "Guest room");
      let state = await snapshot();
      assert.ok(state.catalog.rooms.some((p) => p.id === room.id));
      const restored = parseBackupBundle(
        JSON.stringify({ app: "where-did-i-put-it", version: 2, ...state }),
      );
      assert.deepEqual(restored.catalog.rooms, state.catalog.rooms);
      await mutate([{ ...legacyItem, id: "guest-item", room: room.name }]);
      await removePreset("rooms", room.id);
      state = await snapshot();
      assert.equal(
        state.items.find((i) => i.id === "guest-item").room,
        "Guest room",
      );
      assert.ok(!state.catalog.rooms.some((p) => p.id === room.id));
    },
  );
  await t.test(
    "custom category and location survive storage reads; duplicates fail",
    async () => {
      category = await addPreset("categories", "Travel");
      place = await addPreset("locations", "Second drawer");
      await assert.rejects(
        addPreset("categories", " travel "),
        /duplicatePreset/,
      );
      const state = await snapshot();
      assert.ok(state.catalog.categories.some((p) => p.id === category.id));
      assert.ok(state.catalog.locations.some((p) => p.id === place.id));
    },
  );
  await t.test(
    "one-time category and place remain item-only and round-trip in backup",
    async () => {
      const oneTime = validateItem({
        ...legacyItem,
        id: "once",
        category: "general",
        categoryLabel: "Trip 2026",
        location: "Temporary bag",
      });
      await mutate([oneTime]);
      const state = await snapshot();
      assert.ok(!state.catalog.categories.some((p) => p.name === "Trip 2026"));
      assert.ok(
        !state.catalog.locations.some((p) => p.name === "Temporary bag"),
      );
      const restored = parseBackupBundle(
        JSON.stringify({ app: "where-did-i-put-it", version: 2, ...state }),
      );
      assert.deepEqual(restored, state);
    },
  );
  await t.test(
    "category deletion atomically reassigns items without changing content or dates",
    async () => {
      const custom = {
        ...legacyItem,
        id: "custom-item",
        category: category.id,
      };
      await mutate([custom]);
      const stored = (await snapshot()).items.find((i) => i.id === custom.id);
      await removePreset("categories", category.id);
      const state = await snapshot();
      assert.deepEqual(
        state.items.find((i) => i.id === "custom-item"),
        { ...stored, category: "general" },
      );
      assert.ok(!state.catalog.categories.some((p) => p.id === category.id));
      await assert.rejects(removePreset("categories", "general"));
    },
  );
  await t.test(
    "deleting a place preserves the recorded location on existing items",
    async () => {
      const item = { ...legacyItem, id: "at-place", location: place.name };
      await mutate([item]);
      const stored = (await snapshot()).items.find((i) => i.id === item.id);
      await removePreset("locations", place.id);
      const state = await snapshot();
      assert.deepEqual(
        state.items.find((i) => i.id === item.id),
        stored,
      );
      assert.ok(!state.catalog.locations.some((p) => p.id === place.id));
    },
  );
  await t.test(
    "invalid imported references roll back both catalog and item writes",
    async () => {
      const before = await snapshot();
      const incoming = defaultCatalog();
      incoming.categories.push({ id: "custom-import", name: "Imported" });
      await assert.rejects(
        mutate(
          [{ ...legacyItem, category: "does-not-exist" }],
          undefined,
          incoming,
        ),
      );
      assert.deepEqual(await snapshot(), before);
    },
  );
  await t.test(
    "v2 import restores empty presets and custom item categories; v1 stays readable",
    async () => {
      const catalog = defaultCatalog();
      catalog.categories.push({ id: "custom-import", name: "Imported" });
      catalog.locations.push({ id: "custom-empty", name: "Empty shelf" });
      const bundle = parseBackupBundle(
        JSON.stringify({
          app: "where-did-i-put-it",
          version: 2,
          catalog,
          items: [{ ...legacyItem, id: "imported", category: "custom-import" }],
        }),
      );
      await mutate(bundle.items, undefined, bundle.catalog);
      const state = await snapshot();
      assert.ok(state.catalog.locations.some((p) => p.id === "custom-empty"));
      assert.equal(
        state.items.find((i) => i.id === "imported").category,
        "custom-import",
      );
      assert.deepEqual(
        parseBackupBundle(
          JSON.stringify({
            app: "where-did-i-put-it",
            version: 1,
            items: [legacyItem],
          }),
        ).items,
        [legacyItem],
      );
    },
  );
  await t.test(
    "import keeps existing records by default at transaction time and replaces only when requested",
    async () => {
      const original = {
        ...legacyItem,
        id: "conflict",
        notes: "Newer local note",
      };
      await mutate([original]);
      const stored = (await snapshot()).items.find((i) => i.id === original.id);
      const result = await mutate(
        [
          { ...original, notes: "Older backup note" },
          { ...legacyItem, id: "added-by-import" },
        ],
        undefined,
        defaultCatalog(),
        { skipExisting: true },
      );
      assert.deepEqual(result, { written: 1, skipped: 1 });
      assert.deepEqual(
        (await snapshot()).items.find((i) => i.id === "conflict"),
        stored,
      );
      await mutate(
        [{ ...original, notes: "Explicit replacement" }],
        undefined,
        defaultCatalog(),
        { skipExisting: false },
      );
      assert.equal(
        (await snapshot()).items.find((i) => i.id === "conflict").notes,
        "Explicit replacement",
      );
    },
  );
});
test("backups reject malformed custom categories and missing fallback category", () => {
  const catalog = defaultCatalog();
  assert.throws(() =>
    parseBackupBundle(
      JSON.stringify({
        app: "where-did-i-put-it",
        version: 2,
        catalog,
        items: [{ ...legacyItem, category: "unlisted" }],
      }),
    ),
  );
  catalog.categories = catalog.categories.filter((p) => p.id !== "general");
  assert.throws(() =>
    parseBackupBundle(
      JSON.stringify({
        app: "where-did-i-put-it",
        version: 2,
        catalog,
        items: [],
      }),
    ),
  );
});
test("older version 2 catalogs without rooms import without changing their items", () => {
  const catalog = defaultCatalog();
  delete catalog.rooms;
  const parsed = parseBackupBundle(
    JSON.stringify({
      app: "where-did-i-put-it",
      version: 2,
      catalog,
      items: [legacyItem],
    }),
  );
  assert.deepEqual(parsed.catalog.rooms, []);
  assert.deepEqual(parsed.items, [legacyItem]);
});
