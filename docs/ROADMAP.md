# FindMyStuff roadmap

This is an implementation sequence, not a promise that planned capabilities already exist. The product retrieves user-recorded locations; it does not locate objects in real time. The original brief is in [VISION.md](VISION.md).

## Milestone 0 — trustworthy bilingual baseline

- Existing manual inventory, editing, photos, search, persistent storage and backup.
- Hebrew/English UI, RTL/LTR switching, accurate “last recorded” wording.
- Public contribution documentation, license, issue templates, architecture and tests.
- No changes to stored inventory fields or IDs.

Acceptance: existing records survive a language change and refresh; English and Hebrew user flows work; backups still import; tests and static build pass.

## Completed follow-up — reusable and one-time options

Version 0.2 adds manageable category and flat storage-place lists, item-only category labels, and version 2 backup metadata with version 1 import support. Storage migration and atomic reassignment are covered by tests. This is not a nested location hierarchy; rooms still come from items.

## Milestone 1 — reliable data recovery

Highest priority before structural migrations:

- Make every successful export restorable, including collections beyond current import limits. Prefer bounded backup parts with clear file naming, manifest and complete-import validation.
- Keep imports atomic and retain compatibility with current version 1 backups.
- Add an explicit erase-all workflow with confirmation and cross-tab cleanup; never erase as a migration workaround.
- Cover export/import boundaries, storage failure and restore in automated browser tests.

Acceptance: large inventories round-trip without loss; malformed/incomplete backups leave existing records intact; erase-all actually removes inventory and cached undo state.

## Milestone 2 — My Home: rooms and nested storage

Smallest core organizational milestone after recovery:

- Create independent rooms, even when empty.
- Add storage nodes with stable IDs, room ID, optional parent ID and name.
- Move an item by selecting a location path; show all descendants of a room or storage node.
- Prevent cycles; define behavior for deleting occupied locations and duplicate names.
- Migrate existing room/location strings without losing spelling, photos, IDs or notes. Preserve legacy strings until migration is verified. Ship a versioned backup migration with the database migration.

Proposed storage direction: additive `rooms` and `locations` stores and an optional item `locationId`. Keep current fields for compatibility initially. Document and review the exact schema before implementation; do not commit to a frontend framework or server infrastructure.

Acceptance: fresh and upgraded databases work; migration preserves the baseline fixture and backups; a user can create a room, add a shelf, move an item there and retrieve it.

## Milestone 3 — smarter local search and item details

- Extract a dedicated search module. Add tested English/Hebrew synonym groups, conservative fuzzy matching and room/date intents.
- Show why a result matched; distinguish exact matches from suggestions.
- Establish a bilingual query/expected-result dataset and evaluate improvements before semantic AI.
- Add optional location history and a details screen with the latest confirmed record.

## Milestone 4 — optional input assistance

- Natural-language registration proposes structured fields; the user confirms before save.
- Optional speech adapter with availability detection and manual fallback. Explain if the chosen speech provider sends audio off-device.
- Image recognition adapter remains off by default. Clearly describe the service, photo transmission and cost before explicit consent. Store suggestions separately from confirmed inventory. Keep credentials on a secure backend, never in frontend code.
- Basic inventory remains usable without paid services or accounts.

## Later — community-led expansion

Offline installation, QR labels, optional encrypted synchronization, explicit household permissions and additional languages follow actual user needs. Each requires its own privacy and migration design. Do not expose inventories through public APIs.
