#!/usr/bin/env python3
"""Deterministic FFCS timetable solver.

    python3 scripts/solve.py timetable.json

Reads a request (courses + constraints), prints the best clash-free arrangement
and writes <name>.solved.json next to the input. No network, no dependencies.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

WEIGHTS = {
    "preferred": 50.0,
    "gap": 0.15,
    "day": 12.0,
    "early": 0.25,
    "late": 0.25,
    "same_teacher": 80.0,
    "split_day": 30.0,
    "same_half": 20.0,
    "side_conflict": 18.0,
    "venue_spread": 6.0,
}
LAB_SLOT = re.compile(r"^L\d+$")
EARLY_CUTOFF = 9 * 60
LATE_CUTOFF = 17 * 60
DEFAULT_LIMIT = 5
DEFAULT_MAX_NODES = 200_000
DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI"]

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def clock(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def to_minutes(value) -> int:
    if isinstance(value, (int, float)):
        return int(value)
    hours, minutes = str(value).split(":")
    return int(hours) * 60 + int(minutes)


def offering_cells(offering: dict, slot_cells: dict) -> list[tuple[str, int, int]]:
    cells: list[tuple[str, int, int]] = []
    for slot in offering["slots"]:
        for cell in slot_cells.get(slot, []):
            cells.append((cell[0], int(cell[1]), int(cell[2])))
    return cells


def is_allowed(entry: dict, constraints: dict) -> bool:
    faculty = entry["faculty"].strip().lower()
    if any(name.strip().lower() == faculty for name in constraints["avoidedFaculty"]):
        return False

    for day, start, end in entry["cells"]:
        if DAY_ORDER.index(day) in constraints["avoidDays"]:
            return False
        for window in constraints["avoidWindows"]:
            if start < window["end"] and window["start"] < end:
                return False

    return True


def overlaps(a: dict, b: dict) -> bool:
    for day_a, start_a, end_a in a["cells"]:
        for day_b, start_b, end_b in b["cells"]:
            if day_a == day_b and start_a < end_b and start_b < end_a:
                return True
    return False


def gap_minutes(entries: list[dict]) -> int:
    by_day: dict[str, list[tuple[int, int]]] = {}
    for entry in entries:
        for day, start, end in entry["cells"]:
            by_day.setdefault(day, []).append((start, end))

    if not by_day:
        return 0

    gaps = 0
    for blocks in by_day.values():
        blocks.sort()
        cursor = blocks[0][1]
        for start, end in blocks[1:]:
            if start > cursor:
                gaps += start - cursor
            cursor = max(cursor, end)
    return gaps


def base_code(code: str) -> str:
    return re.sub(r"[LPE]$", "", code)


def is_lab_entry(entry: dict) -> bool:
    return bool(entry["slots"]) and all(LAB_SLOT.match(slot) for slot in entry["slots"])


def half_of(entry: dict) -> str:
    if not entry["cells"]:
        return "mixed"
    if all(cell[1] < 13 * 60 for cell in entry["cells"]):
        return "morning"
    if all(cell[1] >= 13 * 60 for cell in entry["cells"]):
        return "afternoon"
    return "mixed"


def side_of(entry: dict) -> str | None:
    for slot in entry["slots"]:
        if re.search(r"[12]$", slot):
            return "1" if slot.endswith("1") else "2"
    return None


def venue_prefix(venue: str | None) -> str | None:
    match = re.match(r"^[A-Z]+", venue or "")
    return match.group(0) if match else None


def score(entries: list[dict], constraints: dict) -> dict:
    preferred = {name.strip().lower() for name in constraints["preferredFaculty"]}
    days = set()
    hits = 0
    early = 0
    late = 0

    for entry in entries:
        if entry["faculty"].strip().lower() in preferred:
            hits += 1
        for day, start, end in entry["cells"]:
            days.add(day)
            if start < EARLY_CUTOFF:
                early += EARLY_CUTOFF - start
            if end > LATE_CUTOFF:
                late += end - LATE_CUTOFF

    pairs: dict[str, dict] = {}
    for entry in entries:
        bucket = pairs.setdefault(base_code(entry["code"]), {})
        if is_lab_entry(entry):
            bucket["lab"] = entry
        else:
            bucket["theory"] = entry

    same_teacher = 0.0
    split_day = 0.0
    for bucket in pairs.values():
        theory = bucket.get("theory")
        lab = bucket.get("lab")
        if not theory or not lab:
            continue

        if theory["faculty"].strip().lower() == lab["faculty"].strip().lower():
            same_teacher += WEIGHTS["same_teacher"]

        theory_half = half_of(theory)
        lab_half = half_of(lab)
        if theory_half != "mixed" and lab_half != "mixed":
            split_day += -WEIGHTS["same_half"] if theory_half == lab_half else WEIGHTS["split_day"]

    sides = {"1": 0, "2": 0}
    for entry in entries:
        if is_lab_entry(entry):
            continue
        side = side_of(entry)
        if side:
            sides[side] += 1
    exam_side = -min(sides["1"], sides["2"]) * WEIGHTS["side_conflict"]

    venues = {venue_prefix(entry["venue"]) for entry in entries}
    venues.discard(None)
    venue = -max(0, len(venues) - 1) * WEIGHTS["venue_spread"]

    parts = {
        "preferredFaculty": round(hits * WEIGHTS["preferred"], 3),
        "gaps": round(-gap_minutes(entries) * WEIGHTS["gap"], 3),
        "days": round(-len(days) * WEIGHTS["day"], 3),
        "earliness": round(-early * WEIGHTS["early"], 3),
        "lateness": round(-late * WEIGHTS["late"], 3),
        "sameTeacher": round(same_teacher, 3),
        "splitDay": round(split_day, 3),
        "examSide": round(exam_side, 3),
        "venue": round(venue, 3),
    }
    total = round(sum(parts.values()), 3)
    if total == 0:
        total = 0.0
    return {"entries": entries, "score": total, "parts": parts}


def signature(entry: dict) -> str:
    return ",".join(f"{day}:{start}-{end}" for day, start, end in sorted(entry["cells"]))


def build_groups(
    catalog: dict, slot_cells: dict, requirements: list[dict], constraints: dict
):
    by_code = {course["code"]: course for course in catalog["courses"]}
    preferred = {name.strip().lower() for name in constraints["preferredFaculty"]}
    seen: set[str] = set()
    groups = []
    unsolved = []

    for requirement in requirements:
        code = requirement["courseCode"]
        if code in seen:
            continue
        seen.add(code)

        course = by_code.get(code)
        if course is None:
            unsolved.append(code)
            continue

        pinned = requirement.get("offeringId")
        wanted_slots = requirement.get("slots")

        candidates = []
        for offering in course["offerings"]:
            if pinned and offering["id"] != pinned:
                continue
            if wanted_slots and "+".join(offering["slots"]).upper() != "+".join(wanted_slots).upper():
                continue

            entry = {
                "id": offering["id"],
                "code": course["code"],
                "title": course["title"],
                "kind": course["kind"],
                "faculty": offering["faculty"],
                "venue": offering["venue"],
                "slots": offering["slots"],
                "cells": offering_cells(offering, slot_cells),
            }
            if is_allowed(entry, constraints):
                candidates.append(entry)

        best_per_signature: dict[str, dict] = {}
        for entry in candidates:
            key = signature(entry)
            current = best_per_signature.get(key)
            rank = 1 if entry["faculty"].strip().lower() in preferred else 0
            current_rank = 1 if current and current["faculty"].strip().lower() in preferred else 0
            if current is None or rank > current_rank:
                best_per_signature[key] = entry

        ordered = [best_per_signature[key] for key in sorted(best_per_signature)]
        if not ordered:
            unsolved.append(code)
        else:
            groups.append({"courseCode": code, "candidates": ordered})

    groups.sort(key=lambda group: (len(group["candidates"]), group["courseCode"]))
    return groups, unsolved


def solve(groups: list[dict], constraints: dict, limit: int, max_nodes: int):
    solutions: list[dict] = []
    seen: set[str] = set()
    nodes = 0

    def key_of(solution: dict) -> str:
        return "|".join(sorted(entry["id"] for entry in solution["entries"]))

    def keep(solution: dict) -> None:
        key = key_of(solution)
        if key in seen:
            return
        seen.add(key)
        solutions.append(solution)
        solutions.sort(key=lambda item: (-item["score"], key_of(item)))
        if len(solutions) > limit:
            dropped = solutions.pop()
            seen.discard(key_of(dropped))

    def visit(index: int, placed: list[dict]) -> None:
        nonlocal nodes
        nodes += 1
        if nodes > max_nodes:
            return

        if index == len(groups):
            keep(score(list(placed), constraints))
            return

        for candidate in groups[index]["candidates"]:
            if any(overlaps(entry, candidate) for entry in placed):
                continue
            placed.append(candidate)
            visit(index + 1, placed)
            placed.pop()

    visit(0, [])
    if not groups:
        solutions = []

    conflicts = []
    if not solutions and groups:
        forced = [group["candidates"][0] for group in groups]
        for i, left in enumerate(forced):
            for right in forced[i + 1 :]:
                for day_a, start_a, end_a in left["cells"]:
                    for day_b, start_b, end_b in right["cells"]:
                        if day_a == day_b and start_a < end_b and start_b < end_a:
                            conflicts.append(
                                {
                                    "a": left["id"],
                                    "b": right["id"],
                                    "day": day_a,
                                    "start": max(start_a, start_b),
                                    "end": min(end_a, end_b),
                                }
                            )

    return {"solutions": solutions, "unsolved": [], "conflicts": conflicts, "nodes": nodes}


def describe(entries: list[dict]) -> None:
    for day in DAY_ORDER:
        blocks = []
        for entry in entries:
            for cell in entry["cells"]:
                if cell[0] == day:
                    blocks.append((cell[1], cell[2], entry))
        for start, end, entry in sorted(blocks):
            print(
                f"{day}  {clock(start)}-{clock(end)}  "
                f"{entry['code']:<11} {entry['title'][:30]:<31} "
                f"{entry['faculty'][:22]:<23} {entry['venue'] or ''}"
            )


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: python3 scripts/solve.py timetable.json", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1]).resolve()
    try:
        request = load_json(input_path)
    except (OSError, json.JSONDecodeError) as error:
        print(f"Could not read {input_path}: {error}", file=sys.stderr)
        return 2

    if not isinstance(request.get("requirements"), list):
        print('timetable.json needs a "requirements" array', file=sys.stderr)
        return 2

    slot_cells = load_json(DATA / "slots.json")
    catalog = load_json(DATA / "catalog.json")

    constraints = {
        "avoidDays": request.get("constraints", {}).get("avoidDays", []),
        "avoidWindows": request.get("constraints", {}).get("avoidWindows", []),
        "preferredFaculty": request.get("constraints", {}).get("preferredFaculty", []),
        "avoidedFaculty": request.get("constraints", {}).get("avoidedFaculty", []),
    }
    constraints["avoidWindows"] = [
        {"start": to_minutes(window["start"]), "end": to_minutes(window["end"])}
        for window in constraints["avoidWindows"]
    ]

    groups, unsolved = build_groups(catalog, slot_cells, request["requirements"], constraints)
    result = solve(groups, constraints, DEFAULT_LIMIT, DEFAULT_MAX_NODES)
    result["unsolved"] = unsolved

    output_path = input_path.with_name(f"{input_path.stem}.solved.json")
    output_path.write_text(
        json.dumps({"request": request, "result": result}, indent=2) + "\n",
        encoding="utf-8",
    )

    if unsolved:
        print(f"cannot place: {', '.join(unsolved)}")

    if not result["solutions"]:
        if result["conflicts"]:
            print("no clash-free arrangement. forced overlaps:")
            for conflict in result["conflicts"][:6]:
                print(
                    f"  {conflict['day']} {clock(conflict['start'])}-{clock(conflict['end'])}"
                    f"  {conflict['a']} x {conflict['b']}"
                )
        else:
            print("no clash-free arrangement.")
        print(f"wrote {output_path}")
        return 1

    best = result["solutions"][0]
    print(
        f"{len(request['requirements'])} courses · {len(result['solutions'])} arrangement(s) · "
        f"score {best['score']} · {result['nodes']} nodes"
    )
    print()
    describe(best["entries"])
    print()
    print(f"score parts: {json.dumps(best['parts'])}")
    print(f"wrote {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
