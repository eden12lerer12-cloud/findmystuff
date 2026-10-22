# Architecture

FindMyStuff uses native browser capabilities and small JavaScript modules. No framework, database service, paid API or account is needed to run the current application.

```text
index.html + styles.css
        │
    src/app.js ─── src/i18n.js (interface text and direction)
        ├──────── src/model.js (record validation and search)
        └──────── src/store.js (IndexedDB transactions)
```

## Data contracts

- Database: `where-did-i-put-it`, version 2, object stores `items` and `settings`, key path `id`. The upgrade adds a catalog and preserves version 1 items unchanged.
- Record fields: `id`, `name`, `room`, `location`, `category`, `notes`, `image`, `updatedAt`, plus optional item-only `categoryLabel`.
- `updatedAt` is the timestamp of a user's saved record, not a sensor observation.
- Category IDs are language-independent. Rooms, locations, names and notes are user text and are never translated by changing the UI language.
- Images are JPEG data URLs after local resizing. Imported PNG/WebP data URLs are accepted too. No external photo URLs are loaded.
- JSON backup: `{ app: 'where-did-i-put-it', version: 2, exportedAt, items, catalog }`. Version 1 imports remain supported. Renaming the product does not rename the application ID.
- Language preference is the non-sensitive localStorage key `findmystuff-language`. Failure to persist that preference does not disable the app.

Validation completes before import writes begin. All records in an import are written in one transaction. Same-ID imports replace existing records only after user confirmation. Other records are retained. Cross-tab messages request a fresh database read; the channel does not transport private item contents.

## UI boundaries

The current single-screen UI renders an inventory with filters and native modal dialogs. Values from users and backups are inserted as text rather than HTML. CSP restricts resources to the app origin and inline/local images. There is no AI integration and no automatic network synchronization.

The UI controller is intentionally small for now. Extract controllers as My Home, item history and settings arrive. Keep search/validation and storage independent of UI translation. A full framework rewrite is unnecessary for the next milestones.

## Future adapters and migrations

Do not call a cloud AI service directly from this browser application with an embedded key. Future recognition/voice providers must be optional, explicitly consented and isolated behind adapters. Keep confirmed inventory separate from suggestions.

Independent rooms and nested locations will require an additive schema migration and versioned backup changes. Before implementing that, fix large-backup recovery, add migration fixtures and document the schema. Maintain compatibility with version 1 records and backups. See [ROADMAP.md](ROADMAP.md).

## Verification

`npm test` uses Node's built-in test runner. `npm run build` copies only application runtime files to `dist/`. `npm start` serves the project on loopback for local development; it is not a production server. GitHub workflows run tests/builds and can deploy the static artifact after Pages is enabled. Browser-level persistence, photo and backup flows have been checked manually; automated browser coverage remains a roadmap item.

## Reusable options and one-time values

`src/catalog-ui.js` manages the category/place dialog. `settings` stores a `catalog` record with category, location and saved-room arrays. Older catalogs without a rooms field default to an empty room list. Preset IDs are stable; custom names remain user text. General is the protected fallback. Removing a category reassigns its items atomically without changing their timestamps or other fields. Places are suggestions: deleting a preset does not rewrite any item location.

An optional legacy `categoryLabel` on a General item remains readable for compatibility. New one-time categories are no longer available in the UI; editing unrelated fields preserves the legacy label. Locations remain text, and typed values do not implicitly create presets. Version 2 backups preserve empty presets and one-time labels. Imports merge lists by ID and retain current names when a matching ID already exists. All item references are validated against the merged catalog before writes.

Automated storage tests use the development-only `fake-indexeddb` package; the shipped application has no external runtime dependency. Run `npm ci` before tests.

## Item details and quick creation

The inventory card has a keyboard-accessible open button across its image and content; Edit/Delete remain separate controls. A read-only native dialog shows the recorded room, location, category, notes, photo and timestamp, with a separate Edit action. The category picker includes an Add action. Quick category/room creation selects the new option and returns to the existing draft without resetting its fields. Room presets are included in version 2 backups as an additive optional catalog field; item room strings are preserved.

## Stability milestone: backup processing

`src/limits.js` is the single source of export/import bounds: 50 MiB and 20,000 items. `backup-core.js` validates records and measures UTF-8 bytes incrementally before constructing a Blob; no oversized or partial backup is downloaded. `backup-worker.js` reads the database and processes JSON off the UI thread. On import it retains the validated bundle in worker memory until the user confirms, then performs one atomic transaction. Preview reports new versus existing IDs. Existing records are skipped by default, with the existence check performed inside the write transaction. Replacement is explicit. Canceling preparation or preview terminates the worker without a write. Cancel is disabled only during the short atomic commit.

Worker support is required for backup processing, with a clear fallback message when unavailable. Original inventories above the safety bounds remain untouched; multipart backups are not yet implemented. Version 1/2 files still import. The storage schema is unchanged for this milestone.
