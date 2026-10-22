# Changelog

## 0.4.0 — 2026-10-22

Early public testing release. Existing inventory IDs/photos/notes survive the additive database v3 upgrade.

- Bounded, background JSON backup validation/export and previewed atomic restore. Existing items preserved by default. Imports support versions 1–3.
- Nested home storage, rename and descendant browsing; item location history distinguishes confirmed moves from note edits.
- Local Hebrew/English natural-language filler, synonyms and conservative typo handling.
- Quick add, clickable details with edit/delete, light/dark/system themes, optional guide, recent places and incremental inventory rendering.
- Explicit erase-all confirmation and stale import/draft protection across tabs.
- Updated contribution/security/architecture/readiness docs and dependency maintenance.

Known limits: 50 MiB/20,000-item backups, 500 saved options per list, eight storage levels and 1,000 history entries per item. Storage remains device/browser/origin-specific. No cloud sync, AI recognition, QR, voice, offline installation, groups or moving checklist in this release.

## 0.3.0

Saved rooms, direct category creation, clickable read-only item details, removal of new one-time category UI with legacy data compatibility.

## 0.2.0

Reusable category and flat storage-place lists; version 2 backups and additive catalog storage.
