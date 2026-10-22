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

Limits: 500 saved rooms and 1,000 storage nodes per catalog, eight hierarchy levels, 1,000 history events per item; limits reject instead of silently truncating. Backups retain the 50 MiB/20,000-item safety limits. Synonyms are intentionally finite. Screenshots are fictional examples. Next: dashboard, theme, onboarding and release verification.

## Milestone 3 — User experience and privacy controls

Added persisted Light/Dark/System appearance, optional four-step onboarding, recently opened structured locations (six IDs stored locally), public-feedback privacy warning, keyboard focus/reduced-motion refinements and 36-card incremental rendering with debounced search. Details have separate Edit/Delete actions. Added explicit erase-all confirmation; one transaction resets this application's inventory/settings only. A generation token rejects imports and drafts prepared before an erase. Cross-tab notifications cancel pending workers, clear undo/drafts/photo previews and reload the empty state.

Validation: 45 automated tests, build, browser checks at 390 px (no horizontal overflow), Hebrew RTL/English LTR, theme persistence after reload, optional guide dismissal and erase-dialog cancellation. Erasure and stale-write rollback tested only against isolated fake IndexedDB, never the live inventory. Browser console had no warnings/errors. Screenshots show fictional examples.

Limits: storage quota/browser eviction still require private backups. Large inventories remain in memory; pagination bounds DOM work, not database size. Broader screen-reader and device testing needs outside contributors. Next: production path and public release verification.

## Milestone 4 — Public release preparation

Verified repository owner/name, origin, `main` default branch and Pages `workflow` source with HTTPS. Prepared v0.4.0, updated README/screenshots, architecture/schema references, contribution/security docs, roadmap, release notes, beginner tasks and Dependabot. Added exact-path `--dist --base /findmystuff` production preview.

Validation before push: clean `npm ci`, 45 passing tests, static build, production dependency audit (no runtime dependencies), diff whitespace check and live browser from the built `/findmystuff/` path. All modules/CSS/icons loaded; version metadata showed 0.4.0, three original fictional samples persisted and details exposed separate Edit/Delete. No credentials or personal inventories are included in the runtime artifact. Source and Pages deploy verification follow below.

Known risks: external testing and long-term adoption remain unverified; static hosting has ordinary provider request logs. Advanced features are intentionally separate increments. The readiness document records actual zero-star/zero-fork metrics and one maintainer account, with no invented users.

### Milestone 4 — verified deployment

Commit `041c2e2` passed the GitHub Pages workflow [39803856459](https://github.com/eden12lerer12-cloud/findmystuff/actions/runs/39803856459). The public HTTPS site was opened in Chrome and its metadata read as 0.4.0; onboarding appeared and inventory began empty, confirming it did not inherit localhost records. Published [v0.4.0](https://github.com/eden12lerer12-cloud/findmystuff/releases/tag/v0.4.0), added truthful topics and set the verified homepage.

## Milestone 5 — optional organization/input/offline tools

Implemented local QR labels, collection membership, separate packing checklists, typed/optional speech command drafts and an installable static-shell PWA. A pinned MIT QR encoder is vendored locally with attribution; an independent development-only decoder verifies its output. Schema v4 was documented before adding optional collection metadata; database stores/old IDs remain unchanged. Backups export v4 and import v1–4.

Validation: 54 tests covering QR decode/privacy, worker cache isolation, collection packing/deletion/round trips, stale saves and explicit-start speech mocks, alongside all earlier regression cases. Live browser: offline reload retrieved existing records and downloaded a worker-prepared backup; networking was restored afterward. QR dialog/link filtered the correct local box; packing survived reload and box removal preserved its name/status. Exported v4 JSON was parsed independently and reimported while preserving three existing IDs. Comparing all three records to the original M1 export gave exact equality. Typed Hebrew suggestions opened a draft without a database write; a multiword-name parser bug found in browser QA was fixed and regression-tested. Temporary box/list fixtures were removed; original records retained.

Limits: browser microphone and provider audio were deliberately not activated; adapter tests use a mock, with typed fallback verified live. Browser/OS installation prompts vary; manifest/offline behavior are tested, not every phone platform. AI photo recognition is still future work: no approved provider/backend is configured and no uploads occur. The core remains free. Final production/deployment checks follow below.

Final review also caught an undo regression: restoring a deleted item could reset its earlier location history. Undo now preserves the full timeline/timestamp and falls back to captured location text if its linked storage node was removed; a regression test covers timeline preservation.

The home overview also includes rooms from manually entered/demo items without inventing or rewriting stored IDs; regression coverage checks that saved catalog entries remain unchanged.
