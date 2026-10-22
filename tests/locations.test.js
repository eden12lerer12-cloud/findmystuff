import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { defaultCatalog, validateCatalog, validateItem } from "../src/model.js";
import {
  resolveLocation,
  withLocationHistory,
  itemPlace,
  isInLocation,
} from "../src/locations.js";
import {
  addPreset,
  addLocation,
  renamePlace,
  snapshot,
  mutate,
  removePreset,
} from "../src/store.js";
import { createBackup, readBackup } from "../src/backup-core.js";
const item = {
  id: "passport",
  name: "Passport",
  room: "Bedroom",
  location: "Old drawer",
  category: "general",
  notes: "Keep this",
  image: "data:image/jpeg;base64,YWJj",
  updatedAt: "2026-10-01T10:00:00.000Z",
};
test("hierarchy validates references, cycles, room consistency and depth", () => {
  const catalog = defaultCatalog();
  catalog.rooms = [
    { id: "bedroom", name: "Bedroom" },
    { id: "office", name: "Office" },
  ];
  catalog.locations = [
    { id: "closet", name: "Closet", roomId: "bedroom" },
    { id: "drawer", name: "Second drawer", parentId: "closet", kind: "drawer" },
  ];
  assert.equal(
    resolveLocation(validateCatalog(catalog), "drawer").location,
    "Closet › Second drawer",
  );
  assert.equal(resolveLocation(catalog, "drawer").room, "Bedroom");
  for (const bad of [
    [{ id: "a", name: "A", parentId: "a" }],
    [{ id: "a", name: "A", parentId: "missing" }],
    [{ id: "a", name: "A", roomId: "missing" }],
    [
      { id: "a", name: "A", roomId: "bedroom" },
      { id: "b", name: "B", parentId: "a", roomId: "office" },
    ],
  ])
    assert.throws(() => validateCatalog({ ...catalog, locations: bad }));
  const chain = Array.from({ length: 9 }, (_, i) => ({
    id: `n${i}`,
    name: `Place ${i}`,
    ...(i ? { parentId: `n${i - 1}` } : {}),
  }));
  assert.throws(() => validateCatalog({ ...catalog, locations: chain }));
});
test("history records moves, preserves baseline timestamps and ignores notes/renames", () => {
  const moved = withLocationHistory(item, {
    ...item,
    room: "Office",
    location: "Shelf",
    updatedAt: "2026-10-02T10:00:00.000Z",
  });
  assert.equal(moved.history.length, 2);
  assert.equal(moved.history[0].recordedAt, item.updatedAt);
  assert.equal(moved.locationRecordedAt, moved.updatedAt);
  const edited = withLocationHistory(moved, {
    ...moved,
    notes: "Changed notes",
    updatedAt: "2026-10-03T10:00:00.000Z",
  });
  assert.deepEqual(edited.history, moved.history);
  assert.equal(edited.locationRecordedAt, moved.locationRecordedAt);
  const linked = { ...moved, locationId: "same" };
  assert.equal(
    withLocationHistory(linked, { ...linked, location: "Renamed shelf" })
      .history.length,
    2,
  );
});
test("version 2 migration preserves every record and ID; structured saves and backups round-trip", async () => {
  const catalog = defaultCatalog();
  catalog.rooms = [{ id: "existing-room", name: "Bedroom" }];
  catalog.locations = [{ id: "legacy-place", name: "Old box" }];
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("where-did-i-put-it", 2);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("items", { keyPath: "id" }).put(item);
      request.result
        .createObjectStore("settings", { keyPath: "id" })
        .put({ id: "catalog", ...catalog });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  let state = await snapshot();
  assert.deepEqual(state.items, [item]);
  assert.deepEqual(state.catalog, catalog);
  const closet = await addLocation({
    name: "Closet",
    roomId: "existing-room",
    kind: "furniture",
  });
  const drawer = await addLocation({
    name: "Second drawer",
    parentId: closet.id,
    kind: "drawer",
  });
  await mutate([
    { ...item, locationId: drawer.id, updatedAt: "2026-10-02T10:00:00.000Z" },
  ]);
  state = await snapshot();
  const saved = state.items[0];
  assert.equal(saved.location, "Closet › Second drawer");
  assert.equal(saved.history.length, 2);
  assert.ok(isInLocation(saved, closet.id, state.catalog));
  await renamePlace("locations", closet.id, "Wardrobe");
  state = await snapshot();
  assert.equal(
    itemPlace(state.items[0], state.catalog).location,
    "Wardrobe › Second drawer",
  );
  assert.equal(state.items[0].history.length, 2);
  await assert.rejects(removePreset("locations", closet.id));
  await assert.rejects(removePreset("rooms", "existing-room"));
  assert.deepEqual(await readBackup(createBackup(state)), {
    items: state.items,
    catalog: state.catalog,
  });
  await removePreset("locations", drawer.id);
  state = await snapshot();
  assert.equal(state.items[0].locationId, undefined);
  assert.equal(state.items[0].location, "Wardrobe › Second drawer");
  assert.equal(state.items[0].history.length, 2);
  assert.throws(() =>
    validateItem({ ...item, locationId: "missing" }, state.catalog),
  );
});

test("undoing deletion preserves the full location history and recorded timestamp", () => {
  const moved = withLocationHistory(item, {
    ...item,
    location: "New shelf",
    updatedAt: "2026-10-03T10:00:00Z",
  });
  const restored = withLocationHistory(undefined, moved);
  assert.deepEqual(restored.history, moved.history);
  assert.equal(restored.locationRecordedAt, moved.locationRecordedAt);
});
