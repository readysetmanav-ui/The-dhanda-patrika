#!/usr/bin/env python3
"""Refreshes the gold and silver rows of edition.json from OroPocket's public price endpoint.
One request per run. Standard library only. On any failure the previous values are kept,
with their ORIGINAL timestamp, and are labelled DELAYED once older than STALE_HOURS."""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

URL = "https://api.oropocket.com/public/prices"
ED, ST = "edition.json", "data/status.json"
STALE_HOURS = 24
IST = timezone(timedelta(hours=5, minutes=30))
BASE = "OroPocket rates in INR per gram, not MCX or spot prices"
ROWS = {"gold": "Gold (OroPocket)", "silver": "Silver (OroPocket)"}

def now():
    f = os.environ.get("FAKE_NOW")
    return datetime.fromisoformat(f) if f else datetime.now(timezone.utc)

def fetch(test_file):
    if test_file:
        return json.load(open(test_file))
    last = None
    for _ in range(2):
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": "DhandaPatrika/1.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise RuntimeError("OroPocket rate limit (HTTP 429)")
            last = e
        except Exception as e:
            last = e
        time.sleep(5)
    raise RuntimeError(f"could not fetch prices: {last}")

def parse(j):
    if j.get("statusCode") != 200:
        raise ValueError("unexpected statusCode")
    d = j["data"]
    ts = datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00"))
    out = {}
    for k in ROWS:
        b, s = float(d[k]["buy"]), float(d[k]["sell"])
        if not (b > 0 and s > 0 and d[k]["currency"] == "INR" and d[k]["unit"] == "gram"):
            raise ValueError(f"bad {k} data")
        out[k] = (b, s)
    return out, ts

def main():
    test_file = sys.argv[sys.argv.index("--test-file") + 1] if "--test-file" in sys.argv else None
    ed = json.load(open(ED))
    status = json.load(open(ST)) if os.path.exists(ST) else {}
    error = None
    try:
        vals, ts = parse(fetch(test_file))
        for k, label in ROWS.items():
            for r in ed["rates"]:
                if r[0] == label:
                    r[1] = f"Buy ₹{vals[k][0]:,.2f} / Sell ₹{vals[k][1]:,.2f} per gram"
        status = {"source_timestamp": ts.isoformat(), "fetched_at": now().isoformat()}
    except Exception as e:
        error = str(e)
    if status.get("source_timestamp"):
        ts = datetime.fromisoformat(status["source_timestamp"])
        when = ts.astimezone(IST).strftime("%d %b %Y, %H:%M") + " IST"
        stale = now() - ts > timedelta(hours=STALE_HOURS)
        remark = (f"DELAYED. Last update {when}. " if stale else f"As of {when}. ") + BASE
        for r in ed["rates"]:
            if r[0] in ROWS.values():
                r[2] = remark
    json.dump(ed, open(ED, "w"), ensure_ascii=False, indent=1)
    os.makedirs("data", exist_ok=True)
    json.dump(status, open(ST, "w"), indent=1)
    if error:
        print("FAILED, kept previous values:", error)
        sys.exit(1)
    print("Updated gold and silver. Source timestamp:", status["source_timestamp"])

main()
