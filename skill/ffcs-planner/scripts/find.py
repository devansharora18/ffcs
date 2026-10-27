#!/usr/bin/env python3
"""Query the bundled catalog.

    python3 scripts/find.py "data structures"     courses by code or title
    python3 scripts/find.py --teacher iyappan     everything one teacher runs
    python3 scripts/find.py --slot A1             who teaches a slot
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def load(name: str) -> dict:
    with (DATA / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser(description="Query the FFCS catalog")
    parser.add_argument("query", nargs="?", default="", help="course code or title fragment")
    parser.add_argument("--teacher", help="faculty name fragment")
    parser.add_argument("--slot", help="slot code, e.g. A1 or L3")
    parser.add_argument("--school", help="filter by school, e.g. SCORE")
    args = parser.parse_args()

    catalog = load("catalog.json")

    if args.teacher:
        needle = args.teacher.strip().lower()
        rows = []
        for course in catalog["courses"]:
            for offering in course["offerings"]:
                if needle in offering["faculty"].lower():
                    rows.append(
                        (
                            offering["faculty"],
                            course["code"],
                            course["title"],
                            "+".join(offering["slots"]),
                            offering["venue"] or "-",
                        )
                    )
        if not rows:
            print(f"no teacher matches {args.teacher!r}")
            return 1
        for faculty, code, title, slots, venue in sorted(set(rows)):
            print(f"{faculty:<24} {code:<11} {slots:<16} {venue:<8} {title}")
        return 0

    if args.slot:
        wanted = args.slot.strip().upper()
        rows = []
        for course in catalog["courses"]:
            for offering in course["offerings"]:
                if wanted in offering["slots"]:
                    rows.append(
                        (
                            offering["faculty"],
                            course["code"],
                            "+".join(offering["slots"]),
                            course["title"],
                        )
                    )
        if not rows:
            print(f"nobody teaches {wanted}")
            return 1
        teachers = sorted({row[0] for row in rows})
        print(f"{len(teachers)} faculty teach {wanted}")
        for faculty, code, slots, title in sorted(rows)[:60]:
            print(f"{faculty:<24} {code:<11} {slots:<16} {title}")
        return 0

    needle = args.query.strip().lower()
    if not needle:
        parser.print_help()
        return 2

    matches = [
        course
        for course in catalog["courses"]
        if (needle in course["code"].lower() or needle in course["title"].lower())
        and (
            not args.school
            or any(args.school.lower() in name.lower() for name in course["schools"])
        )
    ]
    if not matches:
        print(f"no course matches {args.query!r}")
        return 1

    for course in matches[:40]:
        slots = sorted({"+".join(offering["slots"]) for offering in course["offerings"]})
        print(
            f"{course['code']:<11} {course['title'][:48]:<49} "
            f"[{', '.join(course['schools'])}]  {len(course['offerings'])} offerings  "
            f"{' '.join(slots[:4])}"
        )
    if len(matches) > 40:
        print(f"… {len(matches) - 40} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
