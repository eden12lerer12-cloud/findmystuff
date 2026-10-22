import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { snapshot, mutate, eraseAll, addPreset } from "../src/store.js";
import { recentLocations } from "../src/preferences.js";
test("erasing application data resets inventory/catalog and rejects stale imports and drafts", async () => {
  const state = await snapshot();
  const item = {
    id: "fixture",
    name: "Test",
    room: "Room",
    location: "Box",
    category: "general",
    notes: "",
    image: "",
    updatedAt: new Date().toISOString(),
  };
  await mutate([item]);
  await addPreset("rooms", "Test room");
  await eraseAll();
  const empty = await snapshot();
  assert.deepEqual(empty.items, []);
  assert.deepEqual(empty.catalog.rooms, []);
  assert.notEqual(empty.generation, state.generation);
  await assert.rejects(
    mutate([item], undefined, state.catalog, {
      expectedGeneration: state.generation,
    }),
    /erased/,
  );
  await assert.rejects(
    mutate([item], undefined, undefined, {
      expectedGeneration: state.generation,
    }),
    /erased/,
  );
  assert.deepEqual((await snapshot()).items, []);
  await mutate([item], undefined, undefined, {
    expectedGeneration: empty.generation,
  });
  assert.equal((await snapshot()).items.length, 1);
});
test("recent places discard stale/invalid IDs, duplicates and excess entries", () => {
  const catalog = {
    locations: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` })),
  };
  assert.deepEqual(recentLocations("invalid", catalog), []);
  assert.deepEqual(recentLocations("{}", catalog), []);
  assert.deepEqual(recentLocations('["p1","p1",null,"missing"]', catalog), [
    "p1",
  ]);
  assert.equal(
    recentLocations(JSON.stringify(catalog.locations.map((p) => p.id)), catalog)
      .length,
    6,
  );
});
