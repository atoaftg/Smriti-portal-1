#!/usr/bin/env python3
"""One-time generator for FICTIONAL sample data (names, emails and stories are invented).

Writes: data/employees.csv, data/questionnaire.json, data/assets.json,
        data/submissions.json, data/mail_log.json (empty), data/taxonomy.json
Run:    python3 scripts/make_sample_data.py && python3 scripts/build_seed.py
"""
import csv, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sample_answers_extra import EXTRA

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
D = os.path.join(ROOT, "data")
os.makedirs(D, exist_ok=True)

# ---------------------------------------------------------------- employees
# empId, name, designation, discipline, location, doj, dor
EMP = [
 ("E1001","Suresh Chandra Mehta","General Manager","Drilling Services","Mumbai","1992-07-01","2026-09-30"),
 ("E1002","Anita Raghavan","Chief General Manager","Well Services","Ahmedabad","1991-08-12","2026-10-31"),
 ("E1003","Dr. Prakash Venkataraman","Executive Director","Reservoir","Dehradun","1990-11-05","2026-11-30"),
 ("E1004","Harpreet Singh Bedi","General Manager","Logging","Vadodara","1993-02-10","2026-11-30"),
 ("E1005","Dr. Meenakshi Iyer","Chief General Manager","Geophysics","Dehradun","1991-09-16","2026-10-31"),
 ("E1006","Dr. Rajiv Narang","General Manager","Chemistry","Dehradun","1994-01-03","2026-12-31"),
 ("E1007","Biswajit Dutta Choudhury","Executive Director","Geology","Jorhat","1990-06-18","2026-11-30"),
 ("E1008","Vikram Pratap Rao","Chief General Manager","Production (Surface Operations)","Mumbai","1991-03-25","2026-12-31"),
 ("E1009","Sanjay Kulkarni","General Manager","Mechanical","Mumbai","1993-07-08","2027-01-31"),
 ("E1010","Debashish Mukherjee","Chief General Manager","Electrical","Rajahmundry","1992-05-14","2026-11-30"),
 ("E1011","Kavita Sharma","General Manager","E&T / Instrumentation","Delhi","1992-12-01","2026-12-11"),
 ("E1012","Rekha Pillai","Executive Director","Human Resources","Delhi","1992-04-20","2027-02-28"),
 ("E1013","Anil Kumar Joshi","Chief General Manager","Finance","Delhi","1993-09-02","2027-03-31"),
 ("E1014","Mohammed Irfan Qureshi","General Manager","Procurement","Mumbai","1994-03-11","2027-01-31"),
 ("E1015","Dinesh Rawat","Chief General Manager","HSE","Delhi","1991-10-07","2026-12-31"),
 ("E1016","Gurmeet Singh Sandhu","General Manager","Fire Services","Mumbai","1993-06-21","2027-02-28"),
 ("E1017","Shalini Deshmukh","Executive Director","Business Development","Delhi","1990-08-30","2027-04-30"),
 ("E1018","Pradeep Nair","Executive Director","Uran Plant","Uran","1990-12-17","2026-11-30"),
 ("E1019","Ramesh Chandran","General Manager","Hazira Plant","Hazira","1993-01-25","2026-12-31"),
 ("E1020","Jignesh Patel","Chief General Manager","Dahej Plant","Dahej","1992-10-19","2027-01-31"),
]
def email(n):
    parts = [p for p in n.replace("Dr. ","").split()]
    return f"{parts[0].lower()}.{parts[-1].lower()}@ongc-sample.test"

with open(os.path.join(D,"employees.csv"),"w",newline="",encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["empId","name","designation","discipline","location","doj","dor","email","mobile"])
    for i,(eid,n,des,disc,loc,doj,dor) in enumerate(EMP):
        w.writerow([eid,n,des,disc,loc,doj,dor,email(n),f"+91 90000 {10000+i*37:05d}"])

# ---------------------------------------------------------------- questionnaire
Q = [
 ("q1","Career journey","Describe your career journey and the defining moments that shaped you."),
 ("q2","Toughest challenge","Tell us about the toughest technical or operational challenge you handled: the situation, what you did and the result."),
 ("q3","Failure and learning","What is one mistake or failure that taught you the most? What would you do differently?"),
 ("q4","Safety and risk","What safety, HSE or risk lessons from your experience must every new employee know?"),
 ("q5","Tacit knowledge","What rules of thumb or tacit knowledge do you use that are not written in any manual?"),
 ("q6","Mentoring","Who mentored you, and how did you pass on knowledge to your juniors?"),
 ("q7","Handover","What unfinished work, risks or opportunities are you handing over to your successor?"),
 ("q8","Advice","What advice would you give to young colleagues joining your function today?"),
]
json.dump([{"id":a,"theme":b,"text":c} for a,b,c in Q], open(os.path.join(D,"questionnaire.json"),"w"), indent=2)
QT = {a:c for a,b,c in Q}

# ---------------------------------------------------------------- taxonomy (used for tags + auto-tag suggestions)
TAX = {
 "Well control": ["kick","blowout","bop","well control","influx","flow check"],
 "Drilling fluids": ["mud","drilling fluid","rheology","viscosity"],
 "Stuck pipe": ["stuck pipe","packoff","torque and drag","overpull"],
 "Offshore operations": ["offshore","platform","jack-up","mumbai high","vessel"],
 "Reservoir management": ["reservoir","history match","pressure","surveillance","simulation"],
 "Water injection": ["water injection","waterflood","injector","sweep"],
 "Enhanced oil recovery": ["eor","polymer","chemical flood","enhanced oil recovery"],
 "Seismic interpretation": ["seismic","4d","processing","acquisition","velocity"],
 "Formation evaluation": ["log","logging","petrophysics","formation evaluation"],
 "Well intervention": ["workover","coiled tubing","fracturing","stimulation","intervention"],
 "Flow assurance": ["wax","hydrate","separator","flow assurance","gas lift"],
 "Rotating equipment": ["compressor","turbine","vibration","bearing","rotating"],
 "Power systems": ["power","switchgear","grid","generator","blackout"],
 "Automation and SCADA": ["scada","plc","dcs","instrument","automation","control system"],
 "Process safety": ["process safety","hazop","relief","flare","permit to work","lopc"],
 "Fire and emergency": ["fire","emergency","drill","evacuation","foam"],
 "Gas processing": ["gas processing","sour gas","amine","condensate","lpg","ngl","fractionation"],
 "Contracts and procurement": ["contract","tender","vendor","procurement","supplier"],
 "Budget and finance": ["budget","capex","audit","cost","finance"],
 "People and talent": ["succession","talent","training","recruit","morale","people"],
 "Mentoring": ["mentor","mentoring","guide","coach"],
 "Digitalisation": ["digital","analytics","dashboard","machine learning","data"],
 "Business development": ["bid","partner","acquisition","joint venture","farm-in"],
 "Geochemistry and chemistry": ["geochemistry","corrosion inhibitor","lab","sample","chemical analysis"],
 "Geology and exploration": ["geology","prospect","basin","exploration","sedimentary"],
}
json.dump(TAX, open(os.path.join(D,"taxonomy.json"),"w"), indent=2)

# ---------------------------------------------------------------- learning assets
# (empId, type, title, tags, [ (qid or None, question, answer) ], published, minutes)
A = []
def add(emp, typ, title, tags, qa, pub=True, mins=None):
    A.append(dict(empId=emp, type=typ, title=title, tags=tags, qa=qa, published=pub, minutes=mins))

add("E1001","Questionnaire","Rig-floor discipline and well control: a drilling career in thirty-four years",
 ["Well control","Offshore operations","Drilling fluids","Stuck pipe","Mentoring"],
 [("q1",QT["q1"],"I joined in 1992 as a graduate trainee drilling engineer on land rigs in Ankleshwar and spent my first decade learning that rig-floor discipline is the foundation of everything. Offshore postings in Mumbai High followed, and I moved from rig supervision to planning and eventually to heading Drilling Services. The defining moment was my first well control event as a young engineer. It taught me that procedures exist because someone once paid for ignoring them."),
  ("q2",QT["q2"],"Our toughest problem was repeated stuck pipe in high-angle extended-reach wells through a depleted carbonate section. The root cause was equivalent circulating density exceeding the fracture gradient of a weak zone, causing losses and then hole packoff. We revised the mud programme with lower rheology, added real-time pressure monitoring and set trip speed limits. Non-productive time on that campaign fell by about a third."),
  ("q3",QT["q3"],"My biggest failure was accepting a vendor's bit recommendation without validating it against offset well data. We lost two bit runs and about four days of rig time. Since then I insist on an offset well review and a written justification before any change in drilling parameters or consumables."),
  ("q4",QT["q4"],"Never normalise a flow check that does not look right. Every crew member must have stop-work authority and use it without fear. Hold kick drills seriously, because the crew that practises in calm weather responds correctly in a real kick. Verify BOP test records yourself instead of relying only on the summary sheet."),
  ("q5",QT["q5"],"If mud returns change colour or the pit level creeps up even slightly during a connection, stop and investigate before pulling further. Trust trends over single readings. Most problems announce themselves hours earlier in torque and drag trends."),
  ("q8",QT["q8"],"Spend your first three years on the rig, not behind a desk. Learn from the driller and the toolpusher, who carry decades of tacit knowledge. Keep your own notebook and share what you learn.")],
 True)
add("E1001","Interview","Interview: building a stop-work culture offshore",
 ["Well control","Offshore operations","Process safety","Digitalisation"],
 [(None,"How do you build a genuine stop-work culture on an offshore rig?","You start by protecting the first person who stops the job, even when the stop turns out to be unnecessary. If the toolpusher sees that nobody is blamed for a false alarm, the next stop call comes faster. I also made supervisors spend one night shift a month on the rig floor, so crews saw that leadership shared the risk."),
  (None,"What changed most with digital tools in drilling?","Real-time operations centres changed everything. Specialists onshore now watch the same trends as the rig and catch a drifting pit volume or a torque spike earlier. But dashboards do not replace judgement. The driller who feels the weight on the brake still catches things the sensors miss."),
  (None,"What is your message to your successors?","Keep the basics sacred: flow checks, trip sheets, BOP tests, handover notes. New technology only works on top of disciplined basics. And look after your people, because a rig runs on trust.")],
 True, 14)

add("E1002","Questionnaire","Workovers, coiled tubing and fracturing: lessons from Cambay",
 ["Well intervention","Flow assurance","Stuck pipe"],
 [("q2",QT["q2"],"Our toughest job was restoring a cluster of sand-choked wells in a mature Cambay field. We moved from conventional workovers to coiled tubing sand washing with nitrogen assist, which cut job time from nine days to three. The result was recovery of several wells that had been written off."),
  ("q5",QT["q5"],"Before any intervention, read the well history in reverse: start with the last three jobs, not the completion diagram. Repeated problems at the same depth usually have a single root cause nobody has written down.")],
 False)

add("E1003","Questionnaire","Reservoir surveillance and water injection in mature offshore fields",
 ["Reservoir management","Water injection","Enhanced oil recovery","Digitalisation","Mentoring"],
 [("q1",QT["q1"],"I began as a reservoir engineer at the Dehradun institute, working on material balance for small onshore pools, and later led integrated studies for large offshore carbonate fields. The turning point was realising that a simulation model is only as good as the surveillance data feeding it. I spent years building the habit of regular pressure surveys and well tests."),
  ("q2",QT["q2"],"Our hardest problem was declining pressure and early water breakthrough in a mature carbonate reservoir. We re-interpreted the injection pattern, shifted injectors to improve sweep and balanced voidage replacement across layers. Oil decline slowed from about eight percent a year to roughly four percent."),
  ("q5",QT["q5"],"Always check voidage replacement ratio before trusting any forecast. If injection and withdrawal do not balance, the model is telling you a story the field does not agree with. I also plot water-oil ratio against cumulative production on a log scale because slope changes show channelling early."),
  ("q7",QT["q7"],"I am handing over a polymer flood pilot that needs two more years of data before the economics are clear, and an under-used history-matching workflow that can speed up studies. The risk is that surveillance budgets get cut when oil prices dip. That is exactly when data matters most.")],
 True)
add("E1003","Interview","Interview: how to judge whether a reservoir model can be trusted",
 ["Reservoir management","Digitalisation","Enhanced oil recovery"],
 [(None,"How do you judge whether a reservoir model can be trusted?","I ask three questions. Does it honour the pressure history, not just the production? Does it predict a well that was held back from the match? And do the geologists agree that the geology is plausible? If any answer is no, I do not use it for investment decisions."),
  (None,"Where can data analytics help reservoir engineers?","Analytics is excellent for screening hundreds of wells for anomalies in rate, pressure and water cut. It will not replace physics-based understanding, but it tells you where to look. Pair every data scientist with a reservoir engineer so each learns the other's language.")],
 True, 11)

add("E1005","Questionnaire","Seismic acquisition and processing: decisions that change the picture",
 ["Seismic interpretation","Geology and exploration","Digitalisation","Mentoring"],
 [("q1",QT["q1"],"I joined as a geophysicist working on land seismic crews in Cambay and later moved into processing and interpretation centres. Over three decades I saw the industry move from analogue records to full-waveform workstations. The constant was that the best interpreters understood how the data was acquired."),
  ("q2",QT["q2"],"Our toughest challenge was imaging beneath a thick basalt cover where conventional seismic gave poor reflections. We designed long-offset, low-frequency acquisition and tested multiple velocity model strategies. The improved image allowed us to define a drillable prospect that earlier data had hidden."),
  ("q3",QT["q3"],"I once approved a processing flow without checking the velocity model against well checkshot data. The depth conversion was off by tens of metres and the well missed its target. Now I always tie seismic to wells before releasing any depth map."),
  ("q8",QT["q8"],"Go to the field at least once and watch a seismic crew work. Understand noise, permits and terrain. Then you will know why a gap in coverage exists and what it means for your interpretation.")],
 True)

add("E1008","Questionnaire","Surface production operations: keeping offshore process platforms flowing",
 ["Flow assurance","Offshore operations","Process safety","Rotating equipment","Mentoring"],
 [("q1",QT["q1"],"I started as a production engineer on an offshore process platform and gradually moved to managing surface operations across several assets. Production is the one function where you meet the consequences of every upstream decision. I learnt to walk the platform every day and listen to the equipment."),
  ("q2",QT["q2"],"Our worst problem was wax deposition and separator carry-over on a platform with declining flow rates. We introduced regular pigging, optimised chemical injection and improved separator internals. Unplanned shutdowns dropped by roughly forty percent over two years."),
  ("q4",QT["q4"],"Never bypass a safety system for production, even for one hour. Isolations, permits to work and shift handovers must be written and read aloud. Most serious incidents I investigated had a missing or misunderstood handover."),
  ("q5",QT["q5"],"A change in the sound of a compressor or a slight temperature drift on a separator is usually the first warning. Keep an operator's logbook habit even in the age of dashboards. Trends on paper often reveal what alarms miss.")],
 True)

add("E1009","Questionnaire","Rotating equipment reliability: compressors, turbines and vibration",
 ["Rotating equipment","Process safety","Mentoring","Digitalisation"],
 [("q2",QT["q2"],"Repeated bearing failures on a gas compressor train threatened a platform's export. Vibration analysis showed misalignment caused by pipe strain from a recent modification. We corrected the supports, re-aligned the train and added online vibration monitoring. The train has since run for over two years without a bearing failure."),
  ("q3",QT["q3"],"I once deferred an overhaul to meet a production target. The machine failed in service, costing far more than the planned shutdown. I now treat condition-based overhaul triggers as non-negotiable and explain the cost of deferral to management with numbers."),
  ("q5",QT["q5"],"Touch the casing and listen to the machine before you read the screen. Trend vibration, bearing temperature and lube oil pressure together, since a single parameter can mislead. Record start-up and coast-down signatures when a machine is healthy so you have a baseline."),
  ("q6",QT["q6"],"My mentor was a plant foreman who made me strip and rebuild a pump before I was allowed to write a recommendation. I carried that on by running monthly fault clinics where juniors present failed parts and diagnose them together.")],
 True)

add("E1012","Questionnaire","People, succession and the next generation of talent",
 ["People and talent","Mentoring","Digitalisation"],
 [("q1",QT["q1"],"I began in personnel administration at a large asset and grew into corporate talent management. I learnt that a workforce plan is a promise to the people as much as a spreadsheet. The defining period was managing large-scale recruitment alongside a wave of retirements."),
  ("q6",QT["q6"],"My first manager taught me to listen before I wrote any policy. I passed it on by pairing every new HR executive with a field visit to an installation, so they understood who their policies served."),
  ("q7",QT["q7"],"I am handing over a succession framework that identifies critical roles and ready-now successors, but it needs annual refresh and honest conversations with employees. The biggest risk is that knowledge in retiring experts is not captured early enough. Start that process at least two years before retirement."),
  ("q8",QT["q8"],"Be curious about operations. An HR professional who has never seen a rig, a plant or a seismic crew will struggle to design policies that work. Treat every employee conversation as an opportunity to learn something about the business.")],
 True)

add("E1015","Questionnaire","HSE leadership: learning from incidents before they repeat",
 ["Process safety","Well control","Fire and emergency","People and talent","Offshore operations"],
 [("q2",QT["q2"],"Our toughest challenge was reducing repeat incidents involving lifting operations on offshore platforms. We analysed three years of near-misses and found that most involved unclear communication between crane operator and rigger. We introduced standard hand signals, pre-lift briefings and mandatory observation by a second person. Lifting incidents fell sharply within eighteen months."),
  ("q3",QT["q3"],"Early in my HSE career I treated audits as a tick-box exercise and issued long lists of findings that nobody read. Real improvement began when I shortened reports to three priority actions with named owners and follow-up dates."),
  ("q4",QT["q4"],"Permit to work is the single most important barrier in our industry. Read the permit, walk the site and talk to the people doing the job before you sign. Stop-work authority belongs to everyone. Report near-misses without blame, because they are free lessons."),
  ("q8",QT["q8"],"Do not be the person who only says no. Learn the operation well enough to propose a safer way of doing the job. People respect a safety professional who understands their work.")],
 True)
add("E1015","Interview","Interview: why near-miss reporting fails and how to fix it",
 ["Process safety","People and talent","Offshore operations"],
 [(None,"Why do near-miss reporting systems fail?","They fail when people fear blame or see no response. If a report disappears into a database and nothing changes, reporting stops. I made it a rule that every report gets a reply within one week telling the reporter what was done."),
  (None,"What is the role of leadership in safety?","Leaders must visibly follow the rules they set. If a manager walks past an unsafe act, they have just set a new standard. Spend time on site, ask open questions and thank people who stop a job."),
  (None,"What should new engineers know about safety on their first day?","That they have the right and the duty to stop any job they believe is unsafe. And that asking questions is a strength, not a weakness.")],
 True, 9)

add("E1016","Questionnaire","Fire and emergency response at offshore installations and plants",
 ["Fire and emergency","Process safety","Offshore operations","Mentoring"],
 [("q2",QT["q2"],"A hydrocarbon leak fire on a process facility tested our emergency response. Quick isolation, correct foam application and well-rehearsed roles contained it with no injuries. The after-action review showed that two hours of weekly drills were why people knew exactly what to do."),
  ("q4",QT["q4"],"Know your muster point, your escape routes and your role before an emergency starts. Fire teams cannot save a facility where permits are ignored and fire pumps are untested. Test fire water systems on schedule and record the results honestly."),
  ("q5",QT["q5"],"Check the wind direction before you decide your approach to a gas leak or fire. Foam stocks, pump pressures and hose conditions should be inspected by touch and eye, not just by checklist. A fire crew that knows every valve on the facility will respond faster than any procedure."),
  ("q8",QT["q8"],"Train for the worst day, not the average day. Take part in drills as if they were real, give honest feedback and fix the weak points straight away.")],
 True)

add("E1018","Questionnaire","Process safety and operations at an LPG and NGL extraction plant",
 ["Gas processing","Process safety","Fire and emergency","People and talent"],
 [("q1",QT["q1"],"I began as a process engineer in gas processing and spent most of my career at a large plant receiving gas and condensate from offshore. A plant is a living system. I learnt that every modification, however small, must pass a proper management of change review."),
  ("q2",QT["q2"],"A severe problem was unstable operation of the fractionation train after feed composition changed. We reviewed the control strategy, retuned loops and adjusted reflux ratios with the licensor's support. Product quality stabilised and flaring dropped markedly."),
  ("q4",QT["q4"],"Respect the relief and flare system. Never assume a relief valve will protect you if it has not been tested or if upstream changes have increased the load. Run HAZOP reviews seriously and track every action to closure. Loss of containment is the event we must never accept."),
  ("q7",QT["q7"],"I am handing over a modernisation of the control system and a flare-reduction project that still needs final tie-ins. The main risk is ageing equipment in the older units. Keep inspection plans funded even when budgets are tight.")],
 True)

add("E1019","Questionnaire","Sour gas processing, shutdowns and turnarounds at a coastal gas plant",
 ["Gas processing","Process safety","Rotating equipment","Mentoring"],
 [("q2",QT["q2"],"Our toughest challenge was a major turnaround of a sour gas processing unit where the amine system had suffered heavy corrosion. We re-planned the shutdown around inspection findings, pre-fabricated spools and rehearsed critical lifts. The unit returned to service within the planned window and with improved reliability."),
  ("q5",QT["q5"],"During start-up, never rush the first hour. Walk every line you have opened, check blinds and spades against the isolation list and confirm instrument calibration. For amine systems, watch foaming indicators and keep antifoam handy. Corrosion trends in the amine circuit tell you about problems months before failure."),
  ("q7",QT["q7"],"I am handing over a debottlenecking study for the condensate fractionation section and a plan to upgrade the sulphur recovery unit. The risk is that contractors for the next shutdown will need to be locked in well ahead. Start planning at least eighteen months before the shutdown."),
  ("q8",QT["q8"],"Learn to read a P&ID until you can draw it from memory. Spend time with operators on night shift and respect their experience. A plant engineer earns trust by being present during the difficult hours.")],
 True)

# ---------------------------------------------------------------- complete every questionnaire
QIDS = [q[0] for q in Q]
for a in A:
    if a["type"] != "Questionnaire":
        continue
    have = {(q or ""): (qq, aa) for q, qq, aa in a["qa"]}
    for qid, ans in EXTRA.get(a["empId"], {}).items():
        have[qid] = (QT[qid], ans)
    missing = [q for q in QIDS if q not in have]
    assert not missing, f"{a['empId']} questionnaire is missing {missing}"
    a["qa"] = [(qid, have[qid][0], have[qid][1]) for qid in QIDS]

# ---------------------------------------------------------------- build JSON
emp_by = {e[0]: e for e in EMP}
assets = []
for a in A:
    eid = a["empId"]; e = emp_by[eid]
    yr = e[6][:4]
    aid = f"A-{eid}-{'Q' if a['type']=='Questionnaire' else 'I'}"
    assets.append({
        "id": aid, "empId": eid, "type": a["type"], "title": a["title"],
        "discipline": e[3], "location": e[4], "retireYear": int(yr),
        "tags": a["tags"], "mode": "Written" if a["type"]=="Questionnaire" else "Interview",
        "minutes": a["minutes"],
        "qa": [{"qid": q or f"i{i+1}", "q": qq, "a": aa} for i,(q,qq,aa) in enumerate(a["qa"])],
        "published": a["published"], "createdAt": "2026-09-15",
    })
json.dump(assets, open(os.path.join(D,"assets.json"),"w"), indent=1, ensure_ascii=False)

# in-progress / state data for submissions
SUB = {
 "E1001": {"modes":["Written questionnaire","Interview (in person)"],"loggedInAt":"2026-08-04","submittedAt":"2026-08-20","published":True,"schedule":{"mode":"Interview (in person)","date":"2026-08-25","time":"11:00","status":"Completed"}},
 "E1002": {"modes":["Written questionnaire"],"loggedInAt":"2026-10-02","submittedAt":"2026-10-08","published":False},
 "E1003": {"modes":["Written questionnaire","Interview (video call)"],"loggedInAt":"2026-09-10","submittedAt":"2026-09-28","published":True,"schedule":{"mode":"Interview (video call)","date":"2026-09-22","time":"15:30","status":"Completed"}},
 "E1004": {"modes":["Written questionnaire","Interview (video call)"],"loggedInAt":"2026-10-06","schedule":{"mode":"Interview (video call)","date":"2026-10-20","time":"16:00","status":"Scheduled"}},
 "E1005": {"modes":["Written questionnaire"],"loggedInAt":"2026-08-30","submittedAt":"2026-09-12","published":True},
 "E1008": {"modes":["Written questionnaire"],"loggedInAt":"2026-09-02","submittedAt":"2026-09-18","published":True},
 "E1009": {"modes":["Written questionnaire"],"loggedInAt":"2026-09-05","submittedAt":"2026-09-20","published":True},
 "E1010": {"modes":["Interview (in person)"],"loggedInAt":"2026-10-09","schedule":{"mode":"Interview (in person)","date":"2026-10-23","time":"10:30","status":"Scheduled"}},
 "E1012": {"modes":["Written questionnaire"],"loggedInAt":"2026-09-07","submittedAt":"2026-09-22","published":True},
 "E1015": {"modes":["Written questionnaire","Interview (in person)"],"loggedInAt":"2026-09-01","submittedAt":"2026-09-14","published":True,"schedule":{"mode":"Interview (in person)","date":"2026-09-16","time":"12:00","status":"Completed"}},
 "E1016": {"modes":["Written questionnaire"],"loggedInAt":"2026-09-08","submittedAt":"2026-09-24","published":True},
 "E1018": {"modes":["Written questionnaire"],"loggedInAt":"2026-09-18","submittedAt":"2026-09-30","published":True},
 "E1019": {"modes":["Written questionnaire"],"loggedInAt":"2026-09-11","submittedAt":"2026-09-26","published":True},
}
subs = {}
for eid, s in SUB.items():
    qa = {}
    for a in assets:
        if a["empId"]==eid and a["mode"]=="Written":
            qa = {x["qid"]: x["a"] for x in a["qa"]}
    s["answers"] = qa or dict(EXTRA.get(eid, {}))
    s["assetId"] = f"A-{eid}-Q" if qa else None
    subs[eid] = s
json.dump(subs, open(os.path.join(D,"submissions.json"),"w"), indent=1, ensure_ascii=False)

# mail log: auto-2m mail already sent for these employees (date, status)
M = []
n = 1
def m(emp, kind, when, status="sent", channel="smtp", note=""):
    global n
    M.append({"id": f"M{n:04d}", "empId": emp, "kind": kind, "sentAt": when, "status": status, "channel": channel, "note": note}); n += 1
m("E1001","auto-2m","2026-07-30T09:00:00+05:30")
m("E1002","auto-2m","2026-08-31T09:00:00+05:30")
m("E1002","reminder","2026-09-25T10:15:00+05:30","sent","portal")
m("E1003","auto-2m","2026-09-30T09:00:00+05:30")
m("E1004","auto-2m","2026-09-30T09:00:00+05:30")
m("E1004","nudge","2026-10-08T11:00:00+05:30","sent","portal","Reminder to complete questionnaire")
m("E1005","auto-2m","2026-08-31T09:00:00+05:30")
m("E1007","auto-2m","2026-09-30T09:00:00+05:30","failed","smtp","Mailbox full (temporary failure)")
m("E1007","reminder","2026-10-05T10:00:00+05:30","sent","portal")
m("E1010","auto-2m","2026-09-30T09:00:00+05:30")
m("E1018","auto-2m","2026-09-30T09:00:00+05:30")
for e in ["E1008","E1009","E1012","E1015","E1016","E1019"]:
    m(e,"invite","2026-08-25T10:00:00+05:30","sent","portal","Early invitation by Knowledge Team")
json.dump(M, open(os.path.join(D,"mail_seed.json"),"w"), indent=1)
json.dump([], open(os.path.join(D,"mail_log.json"),"w"))

json.dump({
 "subject_invite": "Share your ONGC journey: Smriti knowledge legacy programme",
 "templates": {
  "auto-2m": {"label":"Two-month invitation","subject":"Share your journey with the next generation: Smriti knowledge legacy programme","body":"Dear {{name}},\n\nYour superannuation date is {{dor}} ({{days}} days from today). Thank you for your many years of service to the organisation.\n\nWe would like your experience, judgement and stories to guide those who follow. Please log in to the Smriti portal and tell us how you would like to share them: a written questionnaire, a recorded interview, or both.\n\nPortal: {{link}}\n\nIt takes about 30 minutes to begin, and you can save your progress and return any time.\n\nWith regards,\nKnowledge Management Team"},
  "invite": {"label":"Invitation (manual)","subject":"Invitation: share your experience on the Smriti portal","body":"Dear {{name}},\n\nThe Knowledge Management Team would value your experience for our learning repository. Please log in and choose how you would like to contribute: written responses, an interview, or both.\n\nPortal: {{link}}\n\nWith regards,\nKnowledge Management Team"},
  "reminder": {"label":"Reminder","subject":"Reminder: your experience matters, Smriti portal","body":"Dear {{name}},\n\nA gentle reminder: you have {{days}} days to your superannuation date ({{dor}}). We have not yet received your preferred way of sharing your experience.\n\nPlease log in here: {{link}}\n\nWith regards,\nKnowledge Management Team"},
  "nudge": {"label":"Nudge: complete submission","subject":"Almost there: please complete your Smriti contribution","body":"Dear {{name}},\n\nThank you for starting your contribution. A few items are still pending, with {{days}} days to go before {{dor}}. Please take a few minutes to complete them or confirm an interview slot.\n\nContinue here: {{link}}\n\nWith regards,\nKnowledge Management Team"}
 }
}, open(os.path.join(D,"mail_templates.json"),"w"), indent=1)

print("employees:", len(EMP), "assets:", len(assets), "published:", sum(a["published"] for a in assets))
