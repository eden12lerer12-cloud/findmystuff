# FindMyStuff · איפה שמתי?

**Remember where you put your things.** A free, private Hebrew/English household inventory. Record an item and its location, then search when you need it. FindMyStuff retrieves what you recorded; it does not track physical objects in real time.

[Try FindMyStuff](https://eden12lerer12-cloud.github.io/findmystuff/) · [Report a bug](https://github.com/eden12lerer12-cloud/findmystuff/issues) · [Contribute](CONTRIBUTING.md)

![Hebrew dashboard with fictional sample items](docs/screenshot.jpg)

[Dark appearance](docs/dark-mode.jpg) · [Mobile view](docs/mobile.jpg) · [QR labels](docs/qr-label.jpg) · [Moving checklist](docs/moving-checklist.jpg)

## What you can do

- Add an item quickly with its name and location; photos and notes are optional.
- Create, rename and browse rooms, furniture, shelves, drawers and boxes in an expandable home tree. See all items inside a storage location, including descendants.
- Keep using manual room/location text. Add or remove reusable categories, rooms and places. General remains a safe category fallback.
- Click any item card/photo for details, edit/delete actions and confirmed location history. Renaming storage or editing notes does not invent a move.
- Search in Hebrew and English using partial words, common synonyms and conservative one-character typo tolerance. Natural-language filler is removed locally; this is deterministic search, not AI.
- Filter by room/category, sort recent updates or names, reopen recent storage locations and load large result lists in batches.
- Choose Light, Dark or Device appearance. Use keyboard navigation, RTL/LTR layouts and an optional four-step guide.
- Try fictional demo items from the empty screen. Demo records never replace existing data.
- Export validated JSON backups, preview imports, keep existing IDs by default and cancel preparation before writing. Explicitly opt into replacement when needed.
- Delete all application data from this browser using a confirmation screen.

## Privacy and limits

No registration, analytics, paid API or cloud database. Records and locally resized photographs stay in IndexedDB in **this browser, device and website origin**. Hosting providers still see normal requests for static application files. Public GitHub Issues are for fictional reproduction examples only.

Localhost, the public demo, another browser and another device each have separate storage. Clearing site data, browser eviction or losing your device can lose records. Export backups regularly. There is no automatic GitHub backup of your inventory.

**Backup JSON is unencrypted and includes private photos.** Keep files private; do not commit them. Export/import share a 50 MiB / 20,000-item limit. Oversized or invalid exports are refused before download without truncating data. Local Web Workers process backups off the UI thread. Imports validate everything first and write atomically. Versions 1–4 import; new exports use version 4, including hierarchy, history and collections. Limits: 500 categories, 500 rooms, 1,000 saved storage nodes, 100 collections, 20,000 members per collection, hierarchy depth eight and 1,000 history events per item. Exceeding a bound produces an error, never silent loss.

Deleting a nonempty parent storage location is blocked. Deleting a leaf preserves its items' last recorded location text. Removing categories reassigns their items to General. Legacy item-only category labels are preserved; creating new one-time categories is intentionally unavailable.

## Optional tools in 0.5.0

- **QR labels:** generate/download/print locally from My home. Codes contain a URL with an opaque location ID only. Names on printed labels are visible. Another device needs a private backup import first; QR is not a public inventory page or automatic sync.
- **Collections:** group related belongings without changing their locations. A separate moving checklist lets you choose saved boxes and confirm packing. Packing is a plan; it does not automatically move the item's recorded location. Missing item references are shown explicitly, and deleting lists never deletes inventory.
- **Type or speak:** typed sentences work everywhere. Supported browsers offer opt-in speech recognition, with disclosure and microphone permission. Browser speech services may transmit audio externally and may require internet. No audio is stored by this app. A recognized location opens an editable draft; the user must confirm Save. Microphone hardware/remote provider behavior still needs device testing.
- **Offline PWA:** production builds precache an explicit set of static files only. After the first complete online load, reopen the same origin offline. Supported browsers can install through their browser menu (iOS: Share → Add to Home Screen). Close all app windows and reopen to activate a waiting update. Installation prompts depend on browser policy. Private data remains in IndexedDB, never in publicly hosted inventory files or service-worker caches. Clearing app records leaves static shell files available; clearing website data removes those too. Development source mode (`npm start`) does not register a worker; test offline from the production build.

Cloud sync and AI photo recognition remain unimplemented. No photos are uploaded or guesses automatically saved. A future recognition provider must have explicit consent, tested uncertain suggestions and protected backend credentials. See the [roadmap](docs/ROADMAP.md) and [third-party notice](THIRD_PARTY_NOTICES.md).

## Run locally

Install Node.js 22 or newer:

```sh
git clone https://github.com/eden12lerer12-cloud/findmystuff.git
cd findmystuff
npm start
```

Open http://127.0.0.1:4173. No API keys or server are needed. The QR encoder is vendored locally with its MIT notice; development dependencies provide IndexedDB and an independent QR decoder for tests:

```sh
npm ci
npm test
npm run build
npm start -- --dist --base /findmystuff
```

The last command previews the exact deployment path at http://127.0.0.1:4173/findmystuff/ (stop an existing preview server first). `dist/` contains only static runtime files and can be served over HTTPS.

## Development and contributing

Small ES modules, native dialogs, IndexedDB and CSS; one pinned locally bundled QR encoder, no framework. Tests cover old database upgrades, atomic writes, history, graph constraints, bilingual search, backup limits/round trips and stale-write protection after erasure. Browser QA checks desktop/mobile, both languages, photos, persistence and worker-based backup flows. Broader screen-reader/device testing is welcome.

Start with [CONTRIBUTING.md](CONTRIBUTING.md), [architecture](docs/ARCHITECTURE.md), [good first tasks](docs/GOOD_FIRST_ISSUES.md) and the [code of conduct](CODE_OF_CONDUCT.md). See [release notes](CHANGELOG.md), [milestone verification](docs/IMPLEMENTATION_LOG.md) and the honest [open-source readiness assessment](docs/OPEN_SOURCE_READINESS.md).

## GitHub updates

Saving a local file does not update GitHub. After testing, commit and push. CI checks pushes and pull requests; changes pushed to `main` deploy through the GitHub Pages workflow. Neither source updates nor deployments transfer anyone's locally stored inventory.

## License

MIT — [LICENSE](LICENSE).
