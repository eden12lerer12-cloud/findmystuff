# Contributing

Bug reports and focused improvements are welcome. For a bug, include the browser, reproduction steps, expected behavior and actual behavior. Use fictional records; do not include personal photos, backup files or sensitive locations.

Install Node.js 22+ and run `npm ci` first. Before submitting a pull request, run `npm test` and `npm run build`. For UI changes, check the complete affected flow on both narrow and wide screens. For storage changes, verify existing records survive refresh and that export/import still round-trips.

Keep the core usable without accounts, API keys or paid services. Discuss changes to storage format or external network requests before implementing them. Do not add secrets or personal data to the repository.

Beginner-friendly tasks: [GOOD_FIRST_ISSUES.md](docs/GOOD_FIRST_ISSUES.md). Translation keys must stay in parity. Use [SCHEMA_V3.md](docs/SCHEMA_V3.md) and migration fixtures before changing storage. See [SECURITY.md](SECURITY.md) for sensitive reports.
