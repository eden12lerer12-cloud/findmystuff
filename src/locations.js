import { normalize } from "./text.js";
export function resolveLocation(catalog, id) {
  const byId = new Map(catalog.locations.map((node) => [node.id, node]));
  const nodes = [],
    seen = new Set();
  let node = byId.get(id),
    roomId = null;
  if (!node) throw new Error("Unknown location");
  while (node) {
    if (seen.has(node.id) || nodes.length >= 8)
      throw new Error("Invalid location nesting");
    seen.add(node.id);
    nodes.unshift(node);
    if (node.roomId) {
      if (roomId && roomId !== node.roomId) throw new Error("Conflicting room");
      roomId = node.roomId;
    }
    if (!node.parentId) break;
    node = byId.get(node.parentId);
    if (!node) throw new Error("Missing parent location");
  }
  const room = roomId ? catalog.rooms.find((room) => room.id === roomId) : null;
  if (roomId && !room) throw new Error("Unknown room");
  return {
    roomId,
    room: room?.name ?? "",
    location: nodes.map((node) => node.name).join(" › "),
    nodes,
  };
}
export function validateLocationGraph(catalog) {
  for (const node of catalog.locations) resolveLocation(catalog, node.id);
  return catalog;
}
export function itemPlace(item, catalog) {
  if (!item.locationId) return { room: item.room, location: item.location };
  try {
    const place = resolveLocation(catalog, item.locationId);
    return { room: place.room || item.room, location: place.location };
  } catch {
    return { room: item.room, location: item.location };
  }
}
export function isInLocation(item, locationId, catalog) {
  return item.locationId
    ? resolveLocation(catalog, item.locationId).nodes.some(
        (node) => node.id === locationId,
      )
    : false;
}
export function withLocationHistory(previous, item) {
  const sameLinkedPlace =
    previous?.locationId && previous.locationId === item.locationId;
  const moved =
    previous &&
    !sameLinkedPlace &&
    (previous.room !== item.room ||
      previous.location !== item.location ||
      previous.locationId !== item.locationId);
  const entry = (value) => ({
    room: value.room,
    location: value.location,
    recordedAt: value.locationRecordedAt ?? value.updatedAt,
    ...(value.locationId ? { locationId: value.locationId } : {}),
  });
  if (!previous)
    return {
      ...item,
      locationRecordedAt: item.locationRecordedAt ?? item.updatedAt,
      history: item.history ?? [entry(item)],
    };
  if (!moved)
    return {
      ...item,
      locationRecordedAt: previous.locationRecordedAt ?? previous.updatedAt,
      ...(previous.history ? { history: previous.history } : {}),
    };
  const history = previous.history ? [...previous.history] : [entry(previous)];
  if (history.length >= 1000) throw new Error("Location history limit reached");
  history.push(entry({ ...item, locationRecordedAt: item.updatedAt }));
  return { ...item, locationRecordedAt: item.updatedAt, history };
}

export function homeRooms(items, catalog) {
  const rooms = [...catalog.rooms];
  for (const item of items) {
    const name = itemPlace(item, catalog).room;
    if (name && !rooms.some((room) => normalize(room.name) === normalize(name)))
      rooms.push({ id: null, name });
  }
  return rooms;
}
