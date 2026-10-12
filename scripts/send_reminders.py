#!/usr/bin/env python3
"""Sends Smriti emails from GitHub Actions (or any cron host) and records every attempt.

Modes
  auto    : email everyone whose superannuation date is within LEAD_DAYS (default 60) and who has
            not yet received an 'auto-2m' mail.  Run daily by .github/workflows/reminders.yml.
  manual  : email the employees listed in --emp-ids with the given --kind
            (invite | reminder | nudge | auto-2m).  Triggered by the admin "Send" buttons.

Input   : data/employees.csv, data/mail_templates.json, data/mail_log.json (history)
Output  : appends to data/mail_log.json  (status = sent | failed, with the error text)
SMTP    : environment variables SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, MAIL_FROM,
          PORTAL_URL.  Store them as GitHub *Actions secrets*, never in the repo.
Dry run : --dry-run prints what would be sent and writes nothing.
"""
import argparse, csv, json, os, smtplib, ssl, sys, time
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DATA = os.path.join(ROOT, "data")
IST = timezone(timedelta(hours=5, minutes=30))


def load_json(name, default):
    p = os.path.join(DATA, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def fill(tpl, v):
    for k, val in v.items():
        tpl = tpl.replace("{{" + k + "}}", str(val))
    return tpl


def fmt_date(d):
    return f"{d.day} {d.strftime('%b %Y')}"


def employees():
    with open(os.path.join(DATA, "employees.csv"), encoding="utf-8") as f:
        return list(csv.DictReader(f))


def due_for_auto(emps, log, today, lead):
    sent = {m["empId"] for m in log if m["kind"] == "auto-2m" and m["status"] == "sent"}
    out = []
    for e in emps:
        dor = date.fromisoformat(e["dor"])
        days = (dor - today).days
        if 0 <= days <= lead and e["empId"] not in sent:
            out.append(e)
    return out


def build(e, kind, tpls, today, portal):
    dor = date.fromisoformat(e["dor"])
    v = {"name": e["name"], "dor": fmt_date(dor), "days": max((dor - today).days, 0), "link": portal}
    t = tpls[kind]
    msg = EmailMessage()
    msg["Subject"] = fill(t["subject"], v)
    msg["To"] = e["email"]
    msg.set_content(fill(t["body"], v))
    return msg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["auto", "manual"], default="auto")
    ap.add_argument("--emp-ids", default="", help="comma separated empIds (manual mode)")
    ap.add_argument("--kind", default="auto-2m", choices=["auto-2m", "invite", "reminder", "nudge"])
    ap.add_argument("--lead-days", type=int, default=int(os.getenv("LEAD_DAYS", "60")))
    ap.add_argument("--today", default="", help="override today's date YYYY-MM-DD (testing)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    today = date.fromisoformat(a.today) if a.today else datetime.now(IST).date()
    emps = employees()
    by_id = {e["empId"]: e for e in emps}
    log = load_json("mail_log.json", [])
    tpls = load_json("mail_templates.json", {})["templates"]
    portal = os.getenv("PORTAL_URL", "https://YOUR-USER.github.io/smriti-portal/")

    if a.mode == "auto":
        targets, kind = due_for_auto(emps, log, today, a.lead_days), "auto-2m"
    else:
        ids = [x.strip() for x in a.emp_ids.split(",") if x.strip()]
        missing = [i for i in ids if i not in by_id]
        if missing:
            print("Unknown employee IDs:", ", ".join(missing), file=sys.stderr)
            return 2
        targets, kind = [by_id[i] for i in ids], a.kind

    print(f"[{today}] mode={a.mode} kind={kind} recipients={len(targets)}")
    if not targets:
        print("Nothing to send.")
        return 0

    host = os.getenv("SMTP_HOST")
    smtp = None
    if not a.dry_run:
        if not host:
            print("SMTP_HOST is not set (add the SMTP_* repository secrets).", file=sys.stderr)
            return 2
        smtp = smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=30)
        smtp.starttls(context=ssl.create_default_context())
        if os.getenv("SMTP_USER"):
            smtp.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASS", ""))

    failures = 0
    now = datetime.now(IST).isoformat(timespec="seconds")
    for e in targets:
        msg = build(e, kind, tpls, today, portal)
        msg["From"] = os.getenv("MAIL_FROM", "knowledge-team@example.org")
        entry = {"id": f"G{int(time.time())}-{e['empId']}-{kind}", "empId": e["empId"], "kind": kind,
                 "sentAt": now, "status": "sent", "channel": "smtp", "note": ""}
        if a.dry_run:
            print(f"  DRY-RUN to {e['email']:<38} | {msg['Subject']}")
            continue
        try:
            smtp.send_message(msg)
            print(f"  sent   -> {e['email']}")
        except Exception as ex:  # keep going; record the failure so the admin can retry
            failures += 1
            entry.update(status="failed", note=str(ex)[:200])
            print(f"  FAILED -> {e['email']}: {ex}", file=sys.stderr)
        log.append(entry)

    if smtp:
        smtp.quit()
    if not a.dry_run:
        with open(os.path.join(DATA, "mail_log.json"), "w", encoding="utf-8") as f:
            json.dump(log, f, indent=1, ensure_ascii=False)
    return 1 if failures and failures == len(targets) else 0


if __name__ == "__main__":
    sys.exit(main())
