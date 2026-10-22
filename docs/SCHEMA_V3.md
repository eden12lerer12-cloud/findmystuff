# Additive organization schema (milestone 2)

The database name and `items`/`settings` stores remain unchanged. Database version 3 adds no destructive store changes. During upgrade, existing records and IDs are preserved exactly. Existing room names without a saved-room preset receive new room IDs up to the 500-room catalog limit (additional legacy names remain in item records and filters); existing saved-room IDs are retained. Legacy location strings are never guessed into a hierarchy.

- `catalog.locations` retains all old `{ id, name }` entries. Structured nodes may additionally contain `roomId`, `parentId` and `kind` (furniture, shelf, drawer, box or other). References must exist; parent/room ownership must agree; cycles and nesting beyond eight levels are rejected. Unassigned legacy presets remain accessible.
- Items keep `room` and `location` snapshots for compatibility. An optional `locationId` links to a structured node. The form resolves a selected node to its room and path, while manual locations remain supported. Paths may contain up to 2,000 characters.
- Optional `history` stores confirmed location snapshots with `recordedAt`, room, path and optional location ID. New items begin with one entry. Existing items obtain a baseline entry only when a location is first changed. Notes-only edits do not create a movement event.
- Optional `locationRecordedAt` separates recording a location from editing other details. Legacy items fall back to `updatedAt` until saved.
- Renaming a room/node changes display labels for linked items; it does not claim that the item physically moved. Saved historical snapshots retain their original labels.
- Backups export version 3 and import versions 1, 2 and 3. Validation covers the full graph and history before any write. Existing v1/v2 data remains readable. The UI uses “last recorded location”, never real-time tracking language.

History is bounded to 1,000 entries per item. Exceeding it rejects the save rather than discarding history silently. Backup size/item bounds remain shared. Tests must cover legacy databases, graph constraints, moves, notes-only edits, rename behavior and backup round trips before upgrading the browser's real database.
