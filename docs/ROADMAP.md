# Incremental roadmap

The [mission](MISSION.md) is the long-term direction. This list distinguishes shipped features from future work.

## Completed for 0.4.0

1. Stability: clean dependency install, shared export/import bounds, validated background backup work, duplicate preview/default preservation, cancel and atomic restore. Old backup/database fixtures pass.
2. Organization: additive v3 schema, nested home tree/renaming/descendant browsing, manual fallback, recorded location history and bilingual local search.
3. UX: quick add, details actions, light/dark/system themes, mobile RTL/LTR, optional onboarding, recent locations, incremental card rendering and explicit erase-all.
4. Release preparation: static build, Pages pipeline, fictional opt-in demo, feedback warning, community/security/dependency documentation and honest readiness assessment. See [verification log](IMPLEMENTATION_LOG.md) for actual deployment evidence.

## Milestone 5 — optional tools in 0.5.0

Implemented and tested incrementally after the 0.4.0 release:

- Local printable QR labels with opaque IDs and explicit same-device/browser limits.
- Related-item collections and a separate moving/packing plan with saved boxes, QR access and explicit checkboxes. Physical location records remain independent.
- Static-only scoped PWA caching, install metadata and safe waiting updates. Offline startup, record retrieval and backup export checked in a real browser.
- Typed natural-language input and optional browser speech adapter. Consent/disclosure precedes recognition; suggestions open a reviewable editor. Hardware microphone/recognition-provider testing remains open.

**Still future:** AI photo recognition. No provider/backend/key has been configured, so no upload or recognition is offered. Implement only with explicit informed consent, uncertain suggestions, manual confirmation and tested credential protection. Free manual photos and typed search stay available. This is intentionally documented as unfinished, rather than exposing a cosmetic AI button.

## Reliability and community follow-ups

- Multipart backup design for inventories exceeding bounds; never weaken import validation.
- Broader bilingual query evaluation, explain approximate matches and improve Arabic/Hebrew keyboard/device testing based on real bug reports.
- Automated browser accessibility/mobile checks, storage quota failures and larger-inventory benchmarks.
- External testers and contributors, reproducible public issues using fictional data and releases tied to verified fixes.
- Encrypted cross-device sync only after a separate privacy/permissions design. No synchronization is currently promised.
