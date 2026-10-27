---
name: ffcs-planner
description: Use when planning or checking a VIT FFCS timetable — which faculty teach a slot, whether two slots clash, or generating a clash-free schedule from a JSON request. Runs a deterministic solver over the bundled Vellore catalog and never guesses a course, faculty or slot.
---

# FFCS planner

A deterministic timetable engine plus a 450-course VIT Vellore catalog. You edit JSON; the solver
does the placement. You never construct a timetable by hand.

## Files

| Path | What it is |
|---|---|
| `data/catalog.vellore.json` | 450 courses, ~3,060 faculty offerings |
| `scripts/solve.ts` | Solver CLI — prints the timetable and writes `*.solved.json` |
| `src/lib/ffcs/grid.ts` | Slot → day/time cells |
| `src/lib/ffcs/conflicts.ts` | Minute-level overlap and constraint checks |
| `src/lib/ffcs/solver.ts` | Search, scoring, ranking |

## Workflow

1. **Find the course code. Never invent one.**

   ```bash
   node -e "const c=require('./data/catalog.vellore.json'); console.log(c.courses.filter(x=>/DATA STRUCTURES/i.test(x.title)).map(x=>x.code).join('\n'))"
   ```

   ```bash
   node -e "const c=require('./data/catalog.vellore.json'); console.log(JSON.stringify(c.courses.find(x=>x.code==='BCSE202L').offerings,null,1))"
   ```

2. **Write `timetable.json`** (copy `skill/ffcs-planner/timetable.example.json`).

3. **Solve.**

   ```bash
   npm run solve -- timetable.json
   ```

4. Read the printed grid. Change the request, run again. The solver is deterministic: same input,
   same output.

## Request format

```json
{
  "requirements": [
    { "courseCode": "BCSE202L" },
    { "courseCode": "BCSE202L", "offeringId": "BCSE202L~B1+TB1~IYAPPAN P~SJT522" }
  ],
  "constraints": {
    "avoidDays": [0],
    "avoidWindows": [{ "start": "08:00", "end": "09:00" }],
    "preferredFaculty": ["IYAPPAN P"],
    "avoidedFaculty": ["SOMEONE ELSE"]
  }
}
```

- `avoidDays`: 0 = Monday … 4 = Friday.
- `avoidWindows`: minutes from midnight, or `"HH:MM"`. Applied to every day.
- `offeringId`: pin one offering. Get it from the catalog; omit it to let the solver choose.
- `preferredFaculty` is a bonus; `avoidedFaculty` is a hard filter.

## Rules the solver enforces

- **Theory hours are 50 minutes; labs are 2-hour blocks.** A lab `L1+L2` runs 08:00–09:40, so it
  clashes with a 09:00 theory hour. Never reason in slot letters alone.
- **Theory and lab periods are not aligned.** Compare real intervals, not period indices.
- **Embedded courses publish two offerings under one code.** `BCSE101E` has a `TBB2` theory
  offering and an `L5+L6+L27+L28` lab offering. Add both if the student needs both.
- **Course-code suffixes are unreliable.** `L` usually means theory, `P` lab, `E` embedded — but
  MTech codes (`CSI1007`) carry no suffix. Trust the slot codes.
- **`unscheduled` courses have no hours** (projects, Indian Constitution). They never clash.
- **Credits are `null`** for every course: the source has no credit values. Never invent them.

## Output

The CLI prints one line per scheduled block and writes `<name>.solved.json` with the ranked
solutions, score breakdown, unsolved courses and conflict list. Exit code is 1 when nothing fits.
