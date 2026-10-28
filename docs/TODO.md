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

## Deploy

```bash
npx vercel --prod
# set OPENCODE_API_KEY, OPENCODE_BASE_URL, OPENCODE_MODEL in the project env
```

Move the rate limiter to a shared store before running more than one instance (Upstash free tier is
enough): `src/app/api/chat/route.ts` keeps the bucket in process memory.

## Security

- **Rate limiting is per isolate.** `src/app/api/chat/route.ts` keeps the counter in process memory,
  so on Cloudflare/Vercel it resets with every cold start and scales out. Move it to a shared store
  (Upstash, Cloudflare KV or a Durable Object) before promoting the site widely.
- **The session cookie is a speed bump, not authentication.** `/api/chat` requires a signed,
  same-site cookie and a same-origin `Origin`, which stops drive-by abuse; it does not stop someone
  who fetches a cookie first. Add real auth (or a proof-of-work challenge) if the key is ever drained.
- **Set a spend cap in the provider dashboard.** That is the only limit an attacker cannot bypass.
- Set `SESSION_SECRET` in production so the cookie does not depend on the API key.

## Data

- **Credits are known for 75 of 728 courses** (one curriculum sheet). The rest stay `null`. Import VIT's official credit list before enabling a
  credit total or `maxCredits`.
- **The catalog is compiled, not scraped live.** Replace `vendor/catalog-source.json` with an importer from VIT's
  published FFCS Excel/PDF when available, then re-run `npm run catalog:import`.
- **No faculty-correction feed.** Students cannot report "this faculty is not actually offering this
  slot", which both competitors get wrong every semester.

## Product

- Visual pass on real iOS Safari and Android Chrome. Verified in headless Chrome at 390/1440 only.
- First-run onboarding: the grid is empty with no example timetable.
- No analytics. Decide tracking before launch, and keep it off the timetable itself.
- Rate limit is per request, not per solve.
