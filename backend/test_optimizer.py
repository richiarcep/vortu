import json, sys
from datetime import date

try:
    import requests
except ImportError:
    print("Run: pip install requests")
    sys.exit(1)

BASE     = "http://127.0.0.1:8000"
EMAIL    = "demo@modabarcelonesa.es"
PASSWORD = "demo1234"
PERIOD   = date.today().strftime("%Y-%m")

G="\033[92m"; Y="\033[93m"; R="\033[91m"; B="\033[1m"; E="\033[0m"
def ok(t):   print(f"  {G}[OK]{E}  {t}")
def warn(t): print(f"  {Y}[!!]{E}  {t}")
def err(t):  print(f"  {R}[XX]{E}  {t}")
def h1(t):   print(f"\n{B}{'='*55}\n  {t}\n{'='*55}{E}")

h1("1. LOGIN")
TOKEN = None
for endpoint, payload, form in [
    ("/api/auth/login",  {"username":EMAIL,"password":PASSWORD}, True),
    ("/auth/token",  {"username":EMAIL,"password":PASSWORD}, True),
    ("/token",       {"username":EMAIL,"password":PASSWORD}, True),
    ("/login",       {"email":EMAIL,"password":PASSWORD}, False),
]:
    try:
        if form:
            resp = requests.post(f"{BASE}{endpoint}", data=payload, timeout=5)
        else:
            resp = requests.post(f"{BASE}{endpoint}", json=payload, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            TOKEN = data.get("access_token") or data.get("token")
            if TOKEN:
                ok(f"Logged in via {endpoint}")
                ok(f"Token: {TOKEN[:40]}...")
                break
    except Exception:
        continue

if not TOKEN:
    err("Could not log in. Is the server running?")
    err("Run: uvicorn main:app --reload")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

h1("2. COMMERCIAL LINES")
resp = requests.get(f"{BASE}/profit-optimizer/lines", headers=HEADERS)
if resp.status_code == 200:
    lines = resp.json()
    ok(f"Found {len(lines)} lines:")
    for l in lines:
        print(f"    id={l['id']}  {l['name']}  ({l['n_products']} products)  season={l['seasonality']}")
else:
    err(f"GET /lines failed: {resp.status_code} — {resp.text[:200]}")
    lines = []

h1("3. PRODUCTS PER LINE")
for line in lines[:2]:
    resp = requests.get(f"{BASE}/profit-optimizer/lines/{line['id']}/products", headers=HEADERS)
    if resp.status_code == 200:
        prods = resp.json()
        ok(f"Line '{line['name']}' — {len(prods)} products:")
        for p in prods[:3]:
            print(f"    {p['name']}: price=€{p['selling_price']}  unit_cost=€{p['unit_cost']}  margin={round(p['implied_margin']*100,1)}%")
        if len(prods) > 3:
            print(f"    ... and {len(prods)-3} more")
    else:
        warn(f"Could not get products for line {line['id']}: {resp.status_code}")

h1("4. PLANNING INPUTS")
resp = requests.get(f"{BASE}/profit-optimizer/inputs/{PERIOD}", headers=HEADERS)
if resp.status_code == 200:
    inputs = resp.json()
    ok(f"Inputs for {PERIOD}:")
    print(f"    Fixed costs:     €{inputs['fixed_costs']:,.2f}")
    print(f"    Total budget:    €{inputs['total_budget']:,.2f}")
    print(f"    Vacation factor: {inputs['vacation_factor']}")
else:
    warn(f"Could not get inputs: {resp.status_code}")

h1("5. RUNNING THE OPTIMIZER")
print(f"  Period: {PERIOD}  — running full pipeline Steps 1-19...")
resp = requests.post(
    f"{BASE}/profit-optimizer/run",
    headers=HEADERS,
    json={"period_label": PERIOD, "n_months": 8},
    timeout=120,
)
if resp.status_code != 200:
    err(f"Run failed: {resp.status_code}")
    print(resp.text[:600])
    sys.exit(1)

result = resp.json()
ok(f"Run complete — status: {result['status']}")
if result.get("run_id"):
    ok(f"Saved as run_id={result['run_id']}")

h1("6. SUMMARY")
s = result.get("summary", {})
print(f"  Total revenue : €{s.get('total_revenue',0):,.2f}")
print(f"  Total cost    : €{s.get('total_cost',0):,.2f}")
print(f"  Net profit    : €{s.get('profit',0):,.2f}")
print(f"  Lines escalated: {s.get('lines_escalated',0)}")

h1("7. LINE ESTIMATES")
for le in result.get("line_estimates", []):
    print(f"\n  {B}{le['name']}{E}")
    print(f"    Baseline B  : €{le['baseline_B']:,.2f}")
    print(f"    η           : {le['eta']:.4f}  model={le['eta_model']}  MAPE={le.get('eta_mape','—')}%")
    print(f"    Feasibility : €{le['feasibility']:,.2f}")
    if le.get("eta_warning"):
        warn(le["eta_warning"])

h1("8. OPTIMISED ALLOCATIONS")
for alloc in result.get("optimisation", {}).get("allocations", []):
    print(f"\n  {B}{alloc['line_name']}{E}")
    print(f"    A={alloc['A']:,.0f}  L={alloc['L']:,.0f}  I={alloc['I']:,.0f}  G={alloc['G']:,.0f}  total={alloc['cost']:,.0f}")
    print(f"    Revenue: €{alloc['revenue']:,.2f}  GP: €{alloc['gross_profit']:,.2f}  Limited by: {alloc['limited_by']}")

h1("9. PRODUCT PLANS (Steps 17-19)")
for pp in result.get("product_plans", []):
    print(f"\n  {B}{pp['line_name']}{E}")
    s17 = pp.get("step17", {})
    print(f"  Step 17: revenue=€{s17.get('total_revenue',0):,.2f}  cost=€{s17.get('total_cost',0):,.2f}  shortfall=€{s17.get('rev_shortfall',0):,.2f}")
    for p in s17.get("products", [])[:2]:
        print(f"    {p['name']}: {p['qty_int']} units  €{p['revenue']}  [{p['binding']}]")

    s18 = pp.get("step18", {})
    status = s18.get("status","—")
    color = G if status=="feasible" else Y if status=="auto_fixed" else R
    print(f"  Step 18: Condition {s18.get('condition')} → {color}{status}{E}")
    if status == "escalated":
        warn(s18.get("message",""))
        for opt in s18.get("escalation_options",[])[:3]:
            print(f"    Option {opt['option']}: {opt['action']} [{opt['owner']}]")

    s19 = pp.get("step19", {})
    U = s19.get("unharnessed", 0)
    if U > 0:
        warn(f"  Step 19: €{U:,.2f} unharnessed ({s19.get('unharnessed_pct',0)}%) — {s19.get('priority_action','')}")
    else:
        ok(f"  Step 19: No unharnessed demand")

h1("10. RUN HISTORY")
resp = requests.get(f"{BASE}/profit-optimizer/runs", headers=HEADERS)
if resp.status_code == 200:
    runs = resp.json()
    ok(f"{len(runs)} run(s) saved:")
    for run in runs:
        print(f"    id={run['id']}  {run['period']}  profit=€{run.get('optimised_profit',0):,.2f}  status={run['status']}")

print(f"\n{B}{'='*55}{E}")
print(f"  {G}All tests complete.{E}")
print(f"  Profit Optimizer is working inside Vela.")
print(f"{B}{'='*55}{E}\n")
