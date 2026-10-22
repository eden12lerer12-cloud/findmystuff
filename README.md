# FindMyStuff · איפה שמתי?

A small, private place to remember where you put things. A Hebrew/English web application that stores item names, photos, rooms, last recorded locations and notes on your own device. It retrieves what you recorded; it does not track objects in real time.

![FindMyStuff Hebrew interface with fictional sample items](docs/screenshot.jpg)

## Run locally

Install Node.js 22 or newer, then:

```sh
npm start
```

Open http://127.0.0.1:4173. There are no runtime dependencies to install, no account requirement and no API keys. Run `npm ci` to install the development-only IndexedDB test helper before running tests.

## Features

- Add, edit and delete items; undo the most recent deletion during the current session.
- Search names, locations and notes, including Hebrew text with vowel marks.
- Filter by room or category; sort by name or most recent update.
- Add or remove reusable categories and storage places from the dashboard or item editor.
- Use a one-time category or typed location without adding it to the reusable lists.
- Category removal moves affected items to General; removing a place never changes previously recorded locations. General stays as a protected fallback.
- Choose a photo from your device, or use the camera option offered by your mobile browser.
- Resize images locally before saving. Supported formats: JPEG, PNG and WebP, up to 12 MB input.
- Export a JSON backup including photos; preview an import summary before merging it.
- Refresh other open tabs when an item changes.
- Responsive design, keyboard controls, native dialogs and reduced-motion support.
- Hebrew and English interfaces with RTL/LTR switching; changing the interface language does not translate or modify your records.

## Privacy and storage

Records and photos are stored in IndexedDB for this browser, device and origin. They are not uploaded to GitHub or a server. The application has no analytics, remote fonts or external image requests. Hosting providers still receive ordinary website requests.

This version does not have accounts, cloud sync, background backup or a service worker for offline installation. Clearing site data or losing the device can lose records. Localhost, a deployed website and another browser have separate storage. Export a backup to move your data.

**Backup files contain unencrypted private data and photos.** Store them privately and do not commit them to the source repository. Version 2 backups include reusable category and place lists; version 1 backups still import. Lists merge by ID without removing existing options. Imports merge by item ID: an imported item replaces an existing item with the same ID. Other items stay unchanged. Imports are limited to 50 MB and 2,000 items; export size depends on your collection. **Known limitation:** exports beyond either import limit cannot currently be restored through the app. Bounded, round-trippable backups are the next priority; see the [review](docs/AUDIT.md) and [roadmap](docs/ROADMAP.md).

## Development

```sh
npm ci
npm test
npm run build
```

`npm test` covers Hebrew search, filters, sorting, backup validation, translation completeness, schema migration, category reassignment, item-only values and atomic import rollback. `npm run build` creates a static `dist/` folder with only the application files. Serve `dist/` with any static HTTPS host.

Source: `src/app.js` handles UI, `src/model.js` handles validation/search, `src/store.js` handles IndexedDB transactions, and `src/i18n.js` handles interface translations. DOM text is inserted with `textContent`; imported image URLs are restricted to supported inline image types. There are no external runtime dependencies. See [architecture](docs/ARCHITECTURE.md).

## GitHub updates

Saving a file on your computer does not update GitHub. After reviewing and testing a change, commit and push it:

```sh
git add .
git commit -m "Describe the change"
git push
```

The included CI workflow checks each push and pull request. The Pages workflow deploys changes pushed to `main` after GitHub Pages is enabled under **Settings → Pages → Source → GitHub Actions**. Updating the code and deploying the website are separate operations. Neither operation synchronizes people's stored items.

## First release scope

Version 0.2.0 is a working local-first prototype. Independent rooms, nested storage locations, fuzzy/conversational search, recognition, voice, history, erase-all, encrypted sync and installable offline support are not implemented yet. See the prioritized [roadmap](docs/ROADMAP.md) and [project vision](docs/VISION.md).

## Optional AI services

None are required or integrated in this release. Photos are resized and stored locally, without object recognition. A future optional AI adapter must obtain explicit consent before sending any household photo or text off-device, distinguish suggestions from confirmed records and protect credentials on a backend. Basic functionality must remain free of paid API requirements.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). Please use fictional items and locations in public issues and screenshots.

## License

MIT — see [LICENSE](LICENSE).
