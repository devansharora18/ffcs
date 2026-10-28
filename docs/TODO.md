# TODO

## Inference

Verified working on 2026-10-27:

| Gateway | Billing | Status |
|---|---|---|
| `https://opencode.ai/zen/go/v1` | OpenCode Go subscription | **works** — needs `x-opencode-session` |
| `https://opencode.ai/inference/openai/v1` | credit balance | 402 `Insufficient account funds` (balance is $0) |

`src/lib/agent/config.ts` sends the session header and defaults to the Go gateway, so the app works
on the subscription. `npm run agent:check` confirms key, model and tool calling:

```bash
npm run agent:check
# baseURL  https://opencode.ai/zen/go/v1
# reply    "ok"      tools ok → get_weather {"city": "Vellore"}
# usage    billing_source: "go"
```

Notes:

- `muse-spark-1.3-contributor` also returns 200 on the Go gateway, but a 40-token probe came back
  with `content: null` — it spends the budget on reasoning first. Default stays
  `deepseek-v4.1-flash`. Switch with `OPENCODE_MODEL` and re-run `npm run agent:check`.
- The Go gateway rejects provider-prefixed ids (`opencode-go/deepseek-v4.1-flash`). Use the bare id.
- The Zen path also rejects `muse-spark-1.3-contributor` with 400 "Model is unavailable"; it is a
  Go-only model in practice.
- `.env` is gitignored. Never commit the key.

## Ads

1. Apply for AdSense, then set `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_SLOT`.
2. Add `public/ads.txt`:
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
3. Add a consent banner (a Google-certified CMP is required in the EEA/UK; India still expects
   notice). Without consent, do not serve personalised ads.
4. Sell the direct sponsor slot instead — see `docs/MONETIZATION.md`.

## Deploy

```bash
npx vercel --prod
# set OPENCODE_API_KEY, OPENCODE_BASE_URL, OPENCODE_MODEL in the project env
```

Move the rate limiter to a shared store before running more than one instance (Upstash free tier is
enough): `src/app/api/chat/route.ts` keeps the bucket in process memory.

## Data

- **Credits are unknown for all 701 courses.** Import VIT's official credit list before enabling a
  credit total or `maxCredits`.
- **The catalog is vendored, not scraped.** Replace `vendor/ffcs-data` with an importer from VIT's
  published FFCS Excel/PDF when available, then re-run `npm run catalog:import`.
- **No faculty-correction feed.** Students cannot report "this faculty is not actually offering this
  slot", which both competitors get wrong every semester.

## Product

- Visual pass on real iOS Safari and Android Chrome. Verified in headless Chrome at 390/1440 only.
- First-run onboarding: the grid is empty with no example timetable.
- No analytics. Decide tracking before launch, and keep it off the timetable itself.
- Rate limit is per request, not per solve. See the leverage section in `docs/MONETIZATION.md`.
