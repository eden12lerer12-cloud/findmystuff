# Architecture

FindMyStuff is a buildless, local-first application using native browser APIs. A pinned MIT QR encoder is bundled locally; there are no external runtime requests or paid services for the core.

| Module                                                            | Responsibility                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `app.js`, `i18n.js`, `preferences.js`                             | Inventory UI, bilingual text, optional local preferences              |
| `home-ui.js`, `catalog-ui.js`                                     | Native home tree and list management dialogs                          |
| `model.js`, `locations.js`                                        | Validated data contracts, location graph and history                  |
| `search.js`, `text.js`                                            | Deterministic bilingual synonyms/typos/normalization                  |
| `store.js`                                                        | IndexedDB migrations and atomic transactions                          |
| `backup-core.js`, `backup-worker.js`, `backup-ui.js`, `limits.js` | Bounded validated backup preparation, confirmation and atomic restore |

## Data and migration

Database `where-did-i-put-it`, version **3**, stores `items` and `settings`, both keyed by `id`. Upgrade preserves every old item and identifier exactly. Existing saved room IDs are retained; room names in old items seed missing presets up to the catalog bound. Legacy location text is never guessed into a hierarchy. See [the schema defined before migration](SCHEMA_V3.md).

Items retain `id`, `name`, `room`, `location`, `category`, `notes`, `image`, `updatedAt` and optional legacy `categoryLabel`. Additive fields are `locationId`, `locationRecordedAt` and `history`. History records confirmed location snapshots, not physical sensor observations. Updating only notes/photos or renaming a linked node adds no move. Manual locations remain valid. A structured link resolves the current room/path for display; historical labels stay unchanged.

The catalog in settings contains category, location and room arrays. IDs are stable and language-independent. Structured locations have optional `roomId`, `parentId`, `kind`. Validation checks references, cycles, ownership and depth. Catalog/item changes share transactions. Removing a category reassigns to General; removing a leaf detaches links while preserving resolved text; parents with children and rooms with storage nodes cannot be removed.

## Backups and deletion

JSON `{app:'where-did-i-put-it',version:4,exportedAt,catalog,items}`. Versions 1/2/3/4 import. All input is validated before writing. Lists merge by ID, preserving existing names; existing items are skipped by default or replaced only after explicit choice. A single transaction prevents partial writes. Workers keep preparation/JSON processing off the main thread; cancel terminates preparation/preview. Commit is atomic and cannot be interrupted through the UI.

Export validates references, uniqueness and UTF-8 byte size before creating a downloadable Blob. Both directions share 50 MiB/20,000-item limits. Oversized data is refused rather than truncated. Worker availability and sufficient browser memory/quota remain required. Multipart backups are future work.

Erase-all clears this app's items/settings and restores an empty default catalog in one transaction. It changes a generation token. Stale imported bundles and editor drafts cannot restore pre-erase data. BroadcastChannel sends only change/erase notifications, never inventory contents; other tabs cancel workers, clear drafts/undo and reread storage. Focus refresh also checks generation for missed notifications. Tests exercise erasure in an isolated database.

## Interface and security

User text uses `textContent`, never injected HTML. Images are local JPEG/PNG/WebP data URLs; external photo URLs are rejected. CSP allows same-origin scripts/styles/workers and local images; no third-party scripts, telemetry or remote fonts. Optional preferences use `findmystuff-language`, `theme`, `onboarding`, `recent-locations` keys (the same prefix applies to all). Recent places store at most six opaque IDs. Failure to persist preferences does not block inventory use.

Inventory renders 36 cards at a time. Search is debounced; finite synonyms and conservative Levenshtein distance are local. IndexedDB snapshots still load records into memory. Bounded DOM rendering is not a claim of unlimited-scale performance.

## Hosting and future adapters

Relative asset/module paths support GitHub Pages under `/findmystuff/`. Build copies only runtime files; source/tests/docs/private backups are not deployed. Production path validation is separate from the development server.

QR uses an unmodified locally vendored encoder; tests decode output through an independent decoder. URLs contain opaque IDs in fragments, with no inventory text. `qr.js` routes only IDs present in the local catalog.

`collections-ui.js` uses additive catalog metadata and the generation guard; [schema v4](SCHEMA_V4.md) defines membership and packing snapshots. Collections are independent of physical storage. Imported same-ID collections preserve existing contents. Deleted item references remain explicit missing members; deleting a box preserves the packing label.

`voice-core.js` parses finite Hebrew/English registration phrases and search fallback; `voice-ui.js` requests recognition only after opt-in and a click. The browser's own recognition service may transmit audio; typing remains available. Suggestions become editable drafts and never write directly. Real microphone/provider behavior is not covered by mocked adapter tests. No photo recognition or API credentials are integrated.

Production builds generate `sw.js` with a content hash and exact static-asset allowlist (including worker modules), plus an install manifest/icons. Cache names include the full registration scope so cleanup cannot remove another application's caches. No runtime responses are added to caches. A failed install retains the previous complete shell; there is no forced `skipWaiting`, so open tabs retain a coherent version. Close all app windows to activate an update. A private record erasure leaves the nonprivate static shell, while browser website-data removal also clears caches. Source mode skips registration. Build checks resolve all relative assets/imports and icon dimensions. See [ROADMAP.md](ROADMAP.md).
