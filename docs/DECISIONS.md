# Decisions

Assumptions made while building, with the reason. Change one and the diff is visible.

1. **No database.** The catalog is a static JSON file and the timetable lives in `localStorage`.
   A student uses this for two weeks a year; a DB would add fixed cost and a cold-start failure mode
   during the one traffic spike that matters.
2. **No share links.** Product decision: share is a rendered PNG. That removed the only remaining
   server-side state.
3. **One campus, union of sources.** Vellore only. The data is the union of CodeChefVIT `prod` and
   PRs 293/296/297/298: every course from every tree is kept, so nothing a PR deletes disappears.
   `term` stays `null` because the source does not state it — it is never guessed.
4. **Course kind comes from slot codes, not the code suffix.** MTech codes (`CSI1007`) have no
   suffix and embedded courses publish theory and lab as separate offerings under one code.
5. **Credits stay `null`.** The source has no credit values. A wrong credit count is worse than a
   dash, and `maxCredits` is therefore a no-op today.
6. **Conflicts are minute intervals, not grid cells.** Theory hours are 8:00–8:50; labs are
   8:51–9:40. A lab `L1+L2` ends at 9:40 and clashes with a 9:00 theory hour, which period-index
   comparison misses.
7. **Offerings that occupy identical time collapse to one candidate.** The search branches on slot
   patterns (2–6 per course), not on faculty variants (up to 40). The best-scoring faculty per
   pattern is kept.
8. **Hard constraints filter; soft constraints score.** `avoidedFaculty`, `avoidDays` and
   `avoidWindows` remove candidates before search. `preferredFaculty`, gaps, days used, early starts
   and late finishes only influence the ranking.
9. **Unscheduled courses are kept.** Projects and Indian Constitution have slot `NIL`. They are
   real registrations with zero hours, so they are marked `unscheduled`, not deleted.
10. **Anonymous only.** One `localStorage` snapshot, no accounts, no session table, nothing to leak.
11. **Rate limiting is in-memory per instance.** Best effort on one process. It must move to a
    shared store before running on more than one instance (see TODO).
12. **Default model is `deepseek-v4.1-flash` on the OpenCode Go gateway.** Both gateways exist:
    `/zen/go/v1` bills the Go subscription and needs an `x-opencode-session` header;
    `/inference/openai/v1` bills credits. The credit balance is $0, so the app defaults to Go.
    `muse-spark-1.3-contributor` answers on Go but spends its budget on reasoning before content.
13. **Ads are one slot below the timetable, never inside the grid.** An ad that looks like a class
    destroys the only thing this product sells: trust in the grid.
14. **Chat history is client-side, last 40 messages.** Only the last 12 are sent per turn.
15. **No offline mode.** The solver runs server-side so the 604 KB catalog never enters the client
    bundle.
16. **Community FFCS conventions are soft rules, not hard filters.** Same teacher for theory+lab
    (+80), theory/lab in opposite halves (+30), one exam side per week (−18 per minority course),
    one building (−6 per extra). Encoding them as hard constraints would make some real requests
    unsolvable, and students do accept a mixed week when they must.
17. **Course school is data, not a code prefix.** `BITE303L` is SCORE-only, `BCSE303L` is shared
    SCOPE+SCORE. The agent must read `schools` from the tool result; both the tool and the skill
    enforce this.
