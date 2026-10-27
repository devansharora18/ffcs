# Monetization

The honest version: **ads do not pay for an agent-heavy planner at Indian student CPMs.** One
sponsor does. The product should be built so ads are a subsidy and a sponsor is the business.

## Unit costs

Two gateways bill differently:

- **OpenCode Go** (`/zen/go/v1`): flat subscription with rolling/weekly/monthly allowances. Marginal
  cost per turn is **₹0** inside the allowance — this is what the app uses.
- **Pay-as-you-go** (`/inference/openai/v1`): per-token, `deepseek-v4.1-flash` at $0.15 / $0.60 per
  million tokens, ₹90 to the dollar. The table below covers this case.

| Turn | Tokens in | Tokens out | Cost |
|---|---|---|---|
| Chat answer | 8,000 | 800 | $0.00168 ≈ **₹0.15** |
| Full solve (tool loop) | 40,000 | 4,000 | $0.00840 ≈ **₹0.76** |

Assumptions: 8k input includes the system prompt, the last 12 messages and tool results.
Prompt-cache hits will pull this down; nothing is cached today.

## Per 1,000 students, one FFCS window

6 sessions × 6 pageviews = 36,000 pageviews. 8 agent messages and 3 solves each.

| Line | Amount |
|---|---|
| AdSense @ ₹30 RPM | **+₹1,080** |
| AdSense @ ₹60 RPM | +₹2,160 |
| One campus sponsor, ₹5,000/semester | +₹5,000 |
| AI: 8,000 messages | −₹1,208 |
| AI: 3,000 solve turns | −₹2,268 |
| Hosting (serverless + free tiers) | −₹200 |

| Scenario | Net |
|---|---|
| Pay-per-token, ads only @ ₹30 RPM | **−₹2,596** |
| Pay-per-token, ads + one sponsor | +₹2,404 |
| **Go subscription, ads @ ₹30 RPM** | **+₹880 + sponsor** |
| Go subscription, ads + one sponsor | **+₹5,880** |

On the Go plan the token lines disappear, so the only costs are the subscription fee and hosting.
Ads cover hosting; one sponsor covers the subscription several times over. The per-token table
above matters only if the app is ever moved to credits or scaled past the allowance.

## The three levers that actually change the sign

1. **Do not call `solve` after `add_course`.** The tool already returns the arrangement. Removing
   that redundant round trip cuts solve turns from 3 to ~1 per student: AI drops from ₹3,476 to
   ₹1,964, and "ads + sponsor" becomes +₹4,116.
2. **Cap free solves per device per day** (5 is generous). The limiter in
   `src/app/api/chat/route.ts` covers requests, not solves, so add a per-state counter.
3. **Sell the sponsor slot directly.** ₹3,000–8,000 per semester from one campus-adjacent business
   (print shop, food delivery, test prep, hostel) beats AdSense by 5x at this traffic level and does
   not need a consent banner.

## Placement policy

- Exactly one slot: below the timetable, above "How this works". Never inside the grid, never
  between two class blocks, never as a fake course.
- When `NEXT_PUBLIC_ADSENSE_CLIENT` is unset the slot renders a house ad for the slot itself. No
  fake network response, no placeholder brand.
- No interstitial, no sticky overlay on the grid. A student is mid-registration; a popup costs them
  a slot.

## What to measure before trusting any of this

- Actual tokens per turn from the OpenCode dashboard, once the account is funded.
- Actual RPM during the window, not a generic education CPM.
- Solve-turns per student. Every reduction is linear savings.
