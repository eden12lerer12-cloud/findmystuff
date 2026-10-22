# Implementation log

## Milestone 1 — stability

Completed locally on 2026-10-22, on top of v0.3.0. No destructive migration or paid service was introduced.

- **Changed:** shared backup bounds, validated bounded UTF-8 exports, background JSON processing, cancelable preparation/preview, safe conflict preview, explicit replacement and atomic skip-existing imports. Fixed a blocked database-open connection leak. Preserved version 1/2 backups and all existing record IDs.
- **Files:** `src/limits.js`, `backup-core.js`, `backup-worker.js`, `backup-ui.js`, `model.js`, `store.js`, `app.js`, `i18n.js`, `index.html`, `styles.css`; regression tests in `tests/backup.test.js` and `tests/catalog.test.js`.
- **Verification:** clean `npm ci` installed the locked development dependency. All 28 tests passed. Production build passed. A browser-generated backup was parsed independently and imported through the real worker/UI; preview cancellation left records unchanged; default import reported 0 writes and 3 preserved existing records. No browser console errors were observed.
- **Limits:** at most 50 MiB and 20,000 records per backup. Beyond those bounds, export is refused before a download, without truncation. Workers keep processing off the UI thread; this is not an assertion of unlimited browser memory capacity. Multipart backup is future work. Cancel is available before the atomic write phase.
- **Next:** structured home locations, safe additive migration, location history and local multilingual search. Define and test the schema before modifying real databases.
