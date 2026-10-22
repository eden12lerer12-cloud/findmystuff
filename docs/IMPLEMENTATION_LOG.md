# Implementation log

## Milestone 1 — stability

Completed locally on 2026-10-22, on top of v0.3.0. No destructive migration or paid service was introduced.

- **Changed:** shared backup bounds, validated bounded UTF-8 exports, background JSON processing, cancelable preparation/preview, safe conflict preview, explicit replacement and atomic skip-existing imports. Fixed a blocked database-open connection leak. Preserved version 1/2 backups and all existing record IDs.
- **Files:** `src/limits.js`, `backup-core.js`, `backup-worker.js`, `backup-ui.js`, `model.js`, `store.js`, `app.js`, `i18n.js`, `index.html`, `styles.css`; regression tests in `tests/backup.test.js` and `tests/catalog.test.js`.
- **Verification:** clean `npm ci` installed the locked development dependency. All 28 tests passed. Production build passed. A browser-generated backup was parsed independently and imported through the real worker/UI; preview cancellation left records unchanged; default import reported 0 writes and 3 preserved existing records. No browser console errors were observed.
- **Limits:** at most 50 MiB and 20,000 records per backup. Beyond those bounds, export is refused before a download, without truncation. Workers keep processing off the UI thread; this is not an assertion of unlimited browser memory capacity. Multipart backup is future work. Cancel is available before the atomic write phase.
- **Next:** structured home locations, safe additive migration, location history and local multilingual search. Define and test the schema before modifying real databases.

## Milestone 2 — Organization

Implemented additive database v3 migration, nested home storage (up to eight levels), room/location renaming, descendant browsing, optional structured links and manual locations, and confirmed location history. Deterministic Hebrew/English search handles common synonyms, partial terms and single-character typos; this is not AI semantic search. Quick Add puts name and location first; photo and notes are collapsible. Category and room creation remain available; removed one-time category UI stays removed.

Validation: 43 automated tests, production build, legacy v1/v2 database fixtures preserved, v1/v2/v3 backup compatibility and v3 round trip. Live browser: nested drawer creation, rename, descendant filtering, reload persistence, notes-only edit and confirmed move produced exactly two history entries. Worker-exported v3 backup parsed independently and reimported with all four existing IDs preserved. Temporary test item/locations removed afterward; original three fictional demo records retained.

Limits: 500 saved rooms/locations per catalog, eight hierarchy levels, 1,000 history events per item; limits reject instead of silently truncating. Backups retain the 50 MiB/20,000-item safety limits. Synonyms are intentionally finite. Screenshots are fictional examples. Next: dashboard, theme, onboarding and release verification.
