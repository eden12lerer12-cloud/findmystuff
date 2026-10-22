# Open-source readiness — 2026-10-22

## Honest assessment

FindMyStuff solves an ordinary problem: remembering where household belongings were placed. The free, bilingual, local-first app can be used without accounts or paid services. It is ready for an **early public testing release**, not yet evidence of an established open-source ecosystem. Technical polish alone does not demonstrate adoption or guarantee program selection.

## Verified evidence

GitHub API/CLI inspection of `eden12lerer12-cloud/findmystuff` on 2026-10-22:

| Signal                                       | Observed                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Public repository                            | Yes                                                                                                                |
| Detected license                             | MIT                                                                                                                |
| Default branch / Pages source                | `main` / GitHub Actions                                                                                            |
| Stars / forks                                | 0 / 0                                                                                                              |
| Reported contributor accounts                | 1, repository owner; no verified outside contributors                                                              |
| Issues at inspection                         | 0                                                                                                                  |
| Published releases before this preparation   | 0                                                                                                                  |
| Prior CI and Pages runs                      | Successful for commit `841aab3`                                                                                    |
| Current validation                           | 54 local tests, clean install/build and manual browser QA; latest deploy recorded separately in implementation log |
| Actual users, installs, retention, downloads | Unknown; no telemetry or independent usage evidence                                                                |

The maintainer's own activity and development screenshots are not independent adoption. No users/stars/downloads have been invented. Metrics can change after this snapshot; verify before applying.

## Strengths

- Useful household workflow, Hebrew RTL/English LTR, accessible native controls and mobile layout.
- Local data/photos, no mandatory registration, optional demonstration, explicit destructive-data confirmation.
- Versioned schema, old database fixtures, validated bounded backups and atomic restore.
- Small maintainable modules, MIT license, CI, contribution/security policies, issue/PR templates and beginner task list.

## Weak points and next evidence

- No verified external usage or outside contributor history; invite a small consenting test group and collect concrete issues without private inventories.
- Device/screen-reader coverage and browser automation are limited; document findings and fix reproducible problems.
- Memory/quota and 50 MiB backup bounds limit very large inventories; multipart recovery needs a deliberate design.
- Broader ecosystem relevance has not been demonstrated. Measure usefulness through voluntary feedback and resolved reports, without adding tracking by default.
- Optional QR/collections/offline tools are available; voice hardware testing and recognition/sync remain weak points. Feature count is not evidence of demand.

## Codex for Open Source

[OpenAI's official program](https://developers.openai.com/community/codex-for-oss) describes six months of ChatGPT Pro with Codex and possible additional benefits for selected maintainers. Its [terms](https://learn.chatgpt.com/docs/codex-for-oss-terms) say usage, ecosystem importance, maintenance and maintainer role may be considered; selection is discretionary and never guaranteed. There is no invented numeric threshold here.

**Recommended timing:** release and invite real testers first; resolve reported issues and document a period of meaningful maintenance. Apply when there is concrete evidence of usefulness or a credible ecosystem contribution. An earlier application must accurately disclose the project's newness and limited adoption. This assessment is a project judgment, not an OpenAI eligibility decision. No application was submitted and no program terms were accepted on the maintainer's behalf.
