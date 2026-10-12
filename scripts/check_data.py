#!/usr/bin/env python3
"""Sanity checks for the sample data. Run: python3 scripts/check_data.py"""
import csv, json, os, re, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
J = lambda n: json.load(open(os.path.join(D, n), encoding="utf-8"))
emps = list(csv.DictReader(open(os.path.join(D, "employees.csv"), encoding="utf-8")))
qs = [q["id"] for q in J("questionnaire.json")]
assets, subs = J("assets.json"), J("submissions.json")
bad = []
if len(emps) != 20: bad.append(f"expected 20 employees, found {len(emps)}")
if len({e['empId'] for e in emps}) != len(emps): bad.append("duplicate empIds")
for e in emps:
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", e["dor"]): bad.append(f"{e['empId']}: bad dor")
for a in assets:
    if a["type"] == "Questionnaire":
        ids = [x["qid"] for x in a["qa"]]
        if ids != qs: bad.append(f"{a['id']}: answers {ids} != {qs}")
        for x in a["qa"]:
            if len(x["a"].split()) < 30: bad.append(f"{a['id']} {x['qid']}: answer too short ({len(x['a'].split())} words)")
    if not a["tags"]: bad.append(f"{a['id']}: no tags")
for eid, s in subs.items():
    answered = [q for q in qs if (s["answers"].get(q) or "").strip()]
    if answered and len(answered) != len(qs): bad.append(f"{eid}: submission has {len(answered)}/{len(qs)} answers (must be all or none)")
q_assets = [a for a in assets if a["type"] == "Questionnaire"]
print(f"{len(emps)} employees | {len(assets)} assets ({len(q_assets)} questionnaires, all with {len(qs)}/{len(qs)} answers) | {len(subs)} submission records")
print("\n".join("PROBLEM: " + b for b in bad) if bad else "DATA OK: every questionnaire and every draft has all questions answered")
sys.exit(1 if bad else 0)
