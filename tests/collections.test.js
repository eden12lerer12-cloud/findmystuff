import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { defaultCatalog, validateCatalog } from "../src/model.js";
import {
  snapshot,
  mutate,
  saveCollection,
  deleteCollection,
  addLocation,
  removePreset,
  eraseAll,
} from "../src/store.js";
import { createBackup, readBackup } from "../src/backup-core.js";
test("collections preserve memberships, packing plans and items through v4 backup/delete", async () => {
  const start = await snapshot();
  const item = {
    id: "travel-passport",
    name: "Passport",
    room: "Bedroom",
    location: "Drawer",
    category: "general",
    notes: "",
    image: "",
    updatedAt: "2026-10-22T00:00:00Z",
  };
  await mutate([item]);
  const box = await addLocation({ name: "Moving box", kind: "box" });
  const group = {
    id: "travel-kit",
    name: "Travel kit",
    kind: "collection",
    entries: [{ itemId: item.id }],
  };
  await saveCollection(group, start.generation);
  const move = {
    id: "move-home",
    name: "Move",
    kind: "moving",
    entries: [
      { itemId: item.id, packed: true, boxId: box.id, boxName: "Moving box" },
    ],
  };
  await saveCollection(move, start.generation);
  const state = await snapshot(),
    roundtrip = await readBackup(createBackup(state));
  assert.deepEqual(roundtrip.catalog.collections, state.catalog.collections);
  assert.equal(JSON.parse(await createBackup(state).text()).version, 4);
  assert.equal(state.items[0].location, "Drawer");
  assert.equal(state.items[0].history.length, 1);
  await removePreset("locations", box.id);
  const detached = (await snapshot()).catalog.collections.find(
    (g) => g.id === move.id,
  ).entries[0];
  assert.equal(detached.boxId, undefined);
  assert.equal(detached.boxName, "Moving box");
  assert.equal(detached.packed, true);
  await deleteCollection(group.id, start.generation);
  assert.equal((await snapshot()).items.length, 1);
  await eraseAll();
  await assert.rejects(saveCollection(group, start.generation), /erased/);
  const old = defaultCatalog();
  delete old.collections;
  assert.deepEqual(validateCatalog(old).collections, []);
});
test("malformed collections fail before storage writes", () => {
  const catalog = defaultCatalog();
  for (const group of [
    {
      id: "a",
      name: "A",
      kind: "moving",
      entries: [{ itemId: "x", packed: true }],
    },
    {
      id: "a",
      name: "A",
      kind: "collection",
      entries: [{ itemId: "x" }, { itemId: "x" }],
    },
    {
      id: "a",
      name: "A",
      kind: "moving",
      entries: [{ itemId: "x", packed: true, boxId: "missing" }],
    },
    { id: "a", name: "A", kind: "unknown", entries: [] },
  ])
    assert.throws(() => validateCatalog({ ...catalog, collections: [group] }));
});
