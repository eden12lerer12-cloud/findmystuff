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

- Database: `where-did-i-put-it`, version 1, object store `items`, key path `id`.
- Record fields: `id`, `name`, `room`, `location`, `category`, `notes`, `image`, `updatedAt`.
- `updatedAt` is the timestamp of a user's saved record, not a sensor observation.
- Category IDs are language-independent. Rooms, locations, names and notes are user text and are never translated by changing the UI language.
- Images are JPEG data URLs after local resizing. Imported PNG/WebP data URLs are accepted too. No external photo URLs are loaded.
- JSON backup: `{ app: 'where-did-i-put-it', version: 1, exportedAt, items }`. Renaming the product does not rename this format.
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
