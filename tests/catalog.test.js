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
      assert.deepEqual(state.catalog, defaultCatalog());
    },
  );
  let category, place;
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
      await removePreset("categories", category.id);
      const state = await snapshot();
      assert.deepEqual(
        state.items.find((i) => i.id === "custom-item"),
        { ...custom, category: "general" },
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
      await removePreset("locations", place.id);
      const state = await snapshot();
      assert.deepEqual(
        state.items.find((i) => i.id === item.id),
        item,
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
