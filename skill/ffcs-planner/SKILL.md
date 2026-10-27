---
name: ffcs-planner
description: Use when planning or checking a VIT FFCS timetable — which faculty teach a slot, which slots a course runs, or generating a clash-free schedule from a JSON request. Ships a VIT Vellore catalog, a greppable teacher list, and a deterministic Python solver. No install, no API key.
---

# FFCS planner

A deterministic timetable engine plus the VIT Vellore catalog. You edit JSON; the solver places
courses. Never build a timetable by hand — the solver catches clashes you will miss.

## What is here

| Path | What it is |
|---|---|
| `data/catalog.json` | 450 courses, 3066 offerings, 902 faculty |
| `data/teachers.txt` | every offering, one line: `FACULTY \| CODE \| Title \| slots \| venue` |
| `data/slots.json` | slot code → day/start/end cells |
| `scripts/solve.py` | the solver — reads a request, prints the timetable |
| `scripts/find.py` | catalog queries |

Python 3.9+. No dependencies.

## Look things up first

```bash
python3 scripts/find.py "data structures"     # courses by code or title
python3 scripts/find.py --teacher iyappan     # everything one teacher runs
python3 scripts/find.py --slot A1             # who teaches a slot
grep -i "iyappan" data/teachers.txt           # raw list, if you prefer
```

Never invent a course code, slot or faculty name. Every code you use must come from
`find.py` or `teachers.txt`.

## Build a timetable

1. Find the codes you need (above).
2. Write `timetable.json` — copy `timetable.example.json`.
3. Run it:

   ```bash
   python3 scripts/solve.py timetable.json
   ```

4. Read the printed grid. Change the request, run again. Same input, same output.

## Request format

```json
{
  "requirements": [
    { "courseCode": "BCSE202L" },
    { "courseCode": "BCSE304L", "slots": ["A1", "TA1"] },
    { "courseCode": "BCSE209L", "offeringId": "BCSE209L~A1+TA1~NALINI N~SJT607" }
  ],
  "constraints": {
    "avoidDays": [0],
    "avoidWindows": [{ "start": "08:00", "end": "09:00" }],
    "preferredFaculty": ["IYAPPAN P"],
    "avoidedFaculty": ["SOMEONE ELSE"]
  }
}
```

| Field | Meaning |
|---|---|
| `courseCode` | Required. Must exist in the catalog. |
| `slots` | Optional. Require one slot pattern; the solver still picks the teacher. |
| `offeringId` | Optional. Pin one exact offering (id comes from the catalog / `teachers.txt` is not enough — use `find.py --teacher`). |
| `avoidDays` | 0 = Monday … 4 = Friday. Hard filter. |
| `avoidWindows` | `HH:MM` or minutes from midnight, applied to every day. Hard filter. |
| `preferredFaculty` | Soft bonus (+50 per course). |
| `avoidedFaculty` | Hard filter. |

## Rules the solver enforces

- **Theory hours are 50 minutes; labs are 2-hour blocks.** `L1+L2` runs 08:00–09:40 and clashes
  with a 09:00 theory hour. Never reason in slot letters alone.
- **Theory and lab periods are not aligned**, so overlap is checked on real intervals.
- **Embedded courses publish two offerings under one code** (`BCSE101E` has a `TBB2` theory
  offering and an `L5+L6+L27+L28` lab offering). Add both if the student takes both parts.
- **Course-code suffixes are unreliable.** `L` usually means theory, `P` lab, `E` embedded, but
  MTech codes (`CSI1007`) carry no suffix. Trust the slot codes.
- **`unscheduled` courses have no hours** (projects, Indian Constitution). They never clash.
- **Credits are unknown** in this catalog. Never invent a credit count.

## Output

The CLI prints one line per scheduled block, the score breakdown, and writes
`<name>.solved.json` with:

- `solutions` — up to 5 ranked arrangements, best first, each with the full score breakdown.
- `unsolved` — course codes that could not be placed.
- `conflicts` — forced overlaps when nothing fits.

Exit code is `1` when no arrangement exists.
