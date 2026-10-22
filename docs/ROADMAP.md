# Incremental roadmap

The [mission](MISSION.md) is the long-term direction. This list distinguishes shipped features from future work.

## Completed for 0.4.0

1. Stability: clean dependency install, shared export/import bounds, validated background backup work, duplicate preview/default preservation, cancel and atomic restore. Old backup/database fixtures pass.
2. Organization: additive v3 schema, nested home tree/renaming/descendant browsing, manual fallback, recorded location history and bilingual local search.
3. UX: quick add, details actions, light/dark/system themes, mobile RTL/LTR, optional onboarding, recent locations, incremental card rendering and explicit erase-all.
4. Release preparation: static build, Pages pipeline, fictional opt-in demo, feedback warning, community/security/dependency documentation and honest readiness assessment. See [verification log](IMPLEMENTATION_LOG.md) for actual deployment evidence.

## Milestone 5 — small, opt-in extensions

Implement and verify in separate increments, keeping the initial release simple:

- Printable QR labels linking to opaque local location IDs. Explain same-browser/device limits. Never embed inventory, names or photos in public URLs.
- Local collections for related items, independent of physical storage. Preserve memberships in backups, avoid deleting items when deleting groups.
- Separate moving checklist using selected items/boxes with confirmed packing status, not automatic physical tracking.
- Installable offline PWA: scoped static-asset allowlist, explicit update behavior, no private-data response caching. Check offline startup and backup worker loading under Pages path.
- Optional voice input with clear disclosure that some browsers send audio to a recognition service; detect support, require opt-in/microphone consent, preview parsed fields and confirm manually.
- Optional photo recognition remains an experiment: provider selection, explicit photo-upload consent, uncertain suggestions and user confirmation. No credentials in frontend, no paid default or mandatory service.

## Reliability and community follow-ups

- Multipart backup design for inventories exceeding bounds; never weaken import validation.
- Broader bilingual query evaluation, explain approximate matches and improve Arabic/Hebrew keyboard/device testing based on real bug reports.
- Automated browser accessibility/mobile checks, storage quota failures and larger-inventory benchmarks.
- External testers and contributors, reproducible public issues using fictional data and releases tied to verified fixes.
- Encrypted cross-device sync only after a separate privacy/permissions design. No synchronization is currently promised.
