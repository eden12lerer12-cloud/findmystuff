# Security and privacy

Supported security-fix target: the latest published release and `main`. Export a private backup before testing storage changes.

Do not post passwords, photos, inventories, backups or sensitive locations in public issues. Use fictional minimal reproductions for ordinary bugs. For a security vulnerability, use the repository's **Security → Report a vulnerability** private reporting option when available. If unavailable, contact the maintainer through a contact method they have published and ask for a private channel before sending details. Never publish a sensitive exploit report solely because private reporting is unavailable.

The application contains no API credentials or cloud account system. Browser storage is not encrypted by the app; device/browser access can expose records. Downloaded JSON backups are unencrypted. GitHub hosting and source code do not contain users' inventory.

CSP and strict text/image validation reduce injection risk. Dependency maintenance covers the development-only test helper and GitHub Actions. Static hosting cannot set every recommended HTTP response header; no claim of complete security certification is made. Report suspected data loss with fictional details and retain your backup privately.
