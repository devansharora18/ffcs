# Plan

Built in 13 steps. Each one is a commit.

| # | Step | Status |
|---|---|---|
| 1 | Recon of FFCS on the Go and FFCS-inator, plan, unit economics | done |
| 2 | Scaffold + slot grid as time intervals, no database | done |
| 3 | Catalog importer: 151 courses, 1,755 offerings, 600 faculty | done |
| 4 | Conflict engine over minute intervals + tests | done |
| 5 | Solver: search over slot patterns, ranked by soft constraints | done |
| 6 | Agent tool layer with replayable state ops | done |
| 7 | Streaming chat route, tool loop, rate limit, cost guards | done |
| 8 | Timetable grid (desktop) and agenda (mobile) | done |
| 9 | Chat panel, requirements list, undo, local persistence | done |
| 10 | PNG export | done |
| 11 | Ad slot, metadata, monetization model | done |
| 12 | Hardening: types, tests, build, docs | done |
| 13 | Standalone Python solver, teacher list and installable skill | done |

## Not in scope for v1

- Accounts, share links, cloud sync.
- Credits and `maxCredits` (source data has none).
- Faculty correction feed.
- Scraping pipeline to replace the vendored dataset.
