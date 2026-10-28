# Catalog sources

| File | What it is |
|---|---|
| `site-snapshot.json` | The public catalogue snapshot used as the base: school → category → course → offerings. |
| `catalog-source.json` | The merged source: the snapshot plus the newer allotment data, de-duplicated by faculty + venue + slot. |

Both files hold VIT course allotment data (codes, titles, slots, faculty, venues).
They contain no application code.

## Rebuild

```bash
npx tsx scripts/build-catalog-source.ts vendor/site-snapshot.json <allotment src/data>
npm run catalog:import
```

`catalog:import` regenerates `data/catalog.vellore.json`, the skill data and the
downloadable zip in one step.
