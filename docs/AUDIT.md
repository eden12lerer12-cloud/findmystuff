# Baseline review

Historical baseline only. For the current v0.5.0 implementation and verification, see [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

Reviewed 2026-10-22, before extending the initial implementation against the FindMyStuff vision. This is a code and functional review, not an independent security audit.

## Existing architecture

The existing application uses buildless HTML, CSS and JavaScript ES modules. There are no runtime packages, API dependencies or server-side application services. Node scripts provide a loopback development server, a static build and tests. `src/app.js` coordinates the DOM and user flows, `src/model.js` validates records and performs search, and `src/store.js` owns IndexedDB transactions.

IndexedDB database `where-did-i-put-it`, version 1, contains one `items` store. Each record has `id`, `name`, `room`, `location`, `category`, `notes`, `image` and `updatedAt`. Rooms and exact locations are strings. Images are resized JPEG data URLs. JSON backups use application ID `where-did-i-put-it`, version 1. These identifiers must remain stable through the product rename.

## Functionality observed

- Manual creation, editing and deletion, with undo of the most recent deletion in the current session.
- Item photos, compressed locally; persistent item and image storage across refresh.
- Search over name, room, exact location and notes; Hebrew vowel normalization.
- Room/category filters and name/date sorting.
- Export and confirmed merge import of JSON backups, including images.
- Cross-tab refresh using BroadcastChannel, Hebrew RTL and responsive layouts.
- Build/test CI and a GitHub Pages workflow prepared, but not connected to an authenticated remote at review time.

## Gaps and risks, in priority order

1. **Backup restore limits can reject an app-created export.** Import is capped at 50 MB and 2,000 records while export has no equivalent cap. Before encouraging large inventories, support bounded backup parts or another round-trippable format with end-to-end boundary tests. Do not truncate data or pretend exports are always restorable. Existing small-backup round trips have passed.
2. **Rooms only exist through items.** No independent rooms, storage nodes, nesting or stable location IDs. A schema migration is needed before implementing My Home. Keep all existing item fields and IDs, and import version 1 backups.
3. **Privacy/data management is incomplete.** There is individual deletion but no deliberate “erase all local data” workflow. Add a clear confirmation, removal of all stores and undo buffers, cross-tab updates and a documented browser-level fallback. No telemetry or cloud inventory API exists.
4. **Language was Hebrew-only.** The first incremental milestone adds English, language preference and direction changes without translating user content or modifying inventory records.
5. **Location wording was too strong.** Use “Last recorded location”; never imply tracking hardware or real-time detection. Save timestamps are user record timestamps, not measurements of the physical world.
6. **Search is literal structured search.** No conversational intent parsing, cross-language synonyms, fuzzy matching or date queries. Add evaluated deterministic improvements before any semantic service.
7. **No item history or AI/voice layer.** These are intentionally deferred. Images are user-supplied attachments, not recognized objects. Any future cloud recognition needs explicit per-upload consent and confirmation of suggestions.
8. **UI module will grow.** Keep this stack now. Extract editor, inventory rendering and backup controllers as new screens arrive; a framework rewrite is not justified.
9. **No offline install or browser automation in CI yet.** Node tests cover critical pure logic. The baseline was checked interactively for persistence, CRUD, photos, backup restore, filters and narrow-screen layout. Add repeatable browser storage tests with the schema milestone.

## Security observations

The app inserts user text with `textContent`, restricts imported images to supported inline raster types, validates backup fields, uses atomic import transactions and has a same-origin CSP. There are no embedded credentials, network AI calls or public inventory endpoints. JSON exports and IndexedDB are not encrypted. Any script with access to the app origin could read local records; local-first does not mean encrypted. Deployment-origin changes require explicit export/import.

Image decoding happens before the pixel-count check; input-byte and output-dimension limits reduce risk but do not eliminate large-image decode memory pressure. Add dimensions-before-decode handling if field testing exposes memory problems. Imported image MIME headers are checked, but the importer does not independently decode every image.

## First incremental milestone

Add a small translation module, Hebrew/English UI switching and accurate recorded-location wording. Preserve the database name, version, record IDs and backup format. Test translation completeness, both direction modes, existing-data persistence and English item creation. Add community documentation separately from runtime logic. See [ROADMAP.md](ROADMAP.md) for the next milestone.

## Stability follow-up (2026-10-22)

The export/import asymmetry is fixed using shared bounds and validation before download. Record capacity increased from 2,000 to 20,000; file capacity remains 50 MiB. Background processing, preview cancellation, safe default conflict handling and transactional existence checks are implemented. Oversized exports are refused, not split or truncated. Clean `npm ci`, 28 tests, production build and the real browser worker export/import/cancel flow passed. Three fictional pre-existing demonstration records were preserved. Large file boundary regression tests use reduced limits for deterministic UTF-8 boundaries; no claim of exhaustive mobile memory stress testing is made.
