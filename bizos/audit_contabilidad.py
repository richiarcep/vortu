"""audit_contabilidad.py — Auditoria integral. NO modifica nada, solo lee."""
import sqlite3
con = sqlite3.connect("nexum.db"); con.row_factory = sqlite3.Row
cur = con.cursor()
RED="\033[91m";GRN="\033[92m";YEL="\033[93m";BLU="\033[94m";RST="\033[0m";B="\033[1m"
problemas=0
def fail(m):
    global problemas;problemas+=1;print(f"  {RED}X {m}{RST}")
def ok(m):print(f"  {GRN}OK {m}{RST}")
def warn(m):print(f"  {YEL}! {m}{RST}")

print(f"\n{B}{BLU}=== AUDITORIA DE CONTABILIDAD — nexum.db ==={RST}\n")
companies=cur.execute("SELECT id,name,country FROM companies ORDER BY id").fetchall()
print(f"{B}Empresas: {len(companies)}{RST}")
for c in companies: print(f"  - id={c['id']:<3} {c['name']:<38} pais={c['country']}")
print()

# --- chequeo global: lineas huerfanas / cabeceras sin lineas ---
print(f"{B}{BLU}-- Chequeos globales --{RST}")
huerf = cur.execute("SELECT COUNT(*) n FROM journal_entries je WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.transaction_id=je.transaction_id)").fetchone()["n"]
if huerf: fail(f"{huerf} journal_entries sin transaction cabecera (huerfanas)")
else: ok("Todas las lineas tienen su transaccion cabecera")
sinlineas = cur.execute("SELECT COUNT(*) n FROM transactions t WHERE NOT EXISTS (SELECT 1 FROM journal_entries je WHERE je.transaction_id=t.transaction_id)").fetchone()["n"]
if sinlineas: fail(f"{sinlineas} transacciones SIN lineas en journal_entries")
else: ok("Todas las transacciones tienen lineas")
acc_huerf = cur.execute("SELECT COUNT(*) n FROM journal_entries je WHERE je.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id=je.account_id)").fetchone()["n"]
if acc_huerf: fail(f"{acc_huerf} lineas apuntan a account_id inexistente")
else: ok("Todas las lineas apuntan a cuentas existentes")
print()

for comp in companies:
    cid,cname,country=comp["id"],comp["name"],comp["country"]
    print(f"{B}{BLU}-- Empresa {cid}: {cname} ({country}) --{RST}")

    total=cur.execute("SELECT COUNT(*) n FROM accounts WHERE company_id=?",(cid,)).fetchone()["n"]
    if total==0: fail("NO tiene cuentas"); print(); continue
    ok(f"{total} cuentas")

    nul=cur.execute("SELECT COUNT(*) n FROM accounts WHERE company_id=? AND is_active IS NULL",(cid,)).fetchone()["n"]
    ina=cur.execute("SELECT COUNT(*) n FROM accounts WHERE company_id=? AND is_active=0",(cid,)).fetchone()["n"]
    if nul: fail(f"{nul} cuentas is_active=NULL (queries las ignoran). Fix: UPDATE accounts SET is_active=1 WHERE company_id={cid} AND is_active IS NULL;")
    elif ina: warn(f"{ina} cuentas inactivas")
    else: ok("Todas activas")

    badt=cur.execute("SELECT DISTINCT account_type t FROM accounts WHERE company_id=? AND account_type NOT IN ('asset','liability','equity','income','expense')",(cid,)).fetchall()
    if badt: fail(f"account_type invalidos: {[r['t'] for r in badt]}")
    badn=cur.execute("SELECT DISTINCT normal_balance v FROM accounts WHERE company_id=? AND normal_balance NOT IN ('debit','credit')",(cid,)).fetchall()
    if badn: fail(f"normal_balance invalidos: {[r['v'] for r in badn]}")
    if not badt and not badn: ok("Tipos y normal_balance validos")

    dups=cur.execute("SELECT code,COUNT(*) n FROM accounts WHERE company_id=? GROUP BY code HAVING n>1",(cid,)).fetchall()
    if dups: fail(f"Codigos duplicados: {[(d['code'],d['n']) for d in dups]}")
    else: ok("Sin codigos duplicados")

    # asientos balanceados (por transaction_id, dentro de la empresa)
    rows=cur.execute("""SELECT je.transaction_id tid, ROUND(SUM(je.debit),2) d, ROUND(SUM(je.credit),2) h
                        FROM journal_entries je WHERE je.company_id=? GROUP BY je.transaction_id""",(cid,)).fetchall()
    desbal=[r for r in rows if abs((r['d'] or 0)-(r['h'] or 0))>0.01]
    if desbal: fail(f"{len(desbal)} asientos DESBALANCEADOS. Ej tid={desbal[0]['tid']} debe={desbal[0]['d']} haber={desbal[0]['h']}")
    else: ok(f"{len(rows)} asientos, todos balanceados (debe=haber)")

    # is_balanced flag coherente
    flag_mal=cur.execute("SELECT COUNT(*) n FROM transactions WHERE company_id=? AND is_balanced=0",(cid,)).fetchone()["n"]
    if flag_mal: warn(f"{flag_mal} transacciones con is_balanced=0")

    # lineas que cruzan a cuentas de otra empresa
    cruce=cur.execute("""SELECT COUNT(*) n FROM journal_entries je JOIN accounts a ON je.account_id=a.id
                         WHERE je.company_id=? AND a.company_id!=?""",(cid,cid)).fetchone()["n"]
    if cruce: fail(f"{cruce} lineas usan cuentas de OTRA empresa (cruce company_id)")
    else: ok("Ninguna linea cruza company_id")

    # ecuacion contable
    def saldo(tp):
        r=cur.execute("""SELECT ROUND(SUM(je.debit),2) d, ROUND(SUM(je.credit),2) h
                         FROM journal_entries je JOIN accounts a ON je.account_id=a.id
                         WHERE a.company_id=? AND je.company_id=? AND a.account_type=?""",(cid,cid,tp)).fetchone()
        return (r["d"] or 0),(r["h"] or 0)
    ad,ah=saldo("asset");activo=ad-ah
    ld,lh=saldo("liability");pasivo=lh-ld
    ed,eh=saldo("equity");patri=eh-ed
    id_,ih=saldo("income");ing=ih-id_
    gd,gh=saldo("expense");gas=gd-gh
    util=ing-gas; izq=activo; der=pasivo+patri+util
    print(f"     Activo={activo:,.2f} Pasivo={pasivo:,.2f} Patrim={patri:,.2f} Ingreso={ing:,.2f} Gasto={gas:,.2f} Util.Ej={util:,.2f}")
    if abs(izq-der)>0.5: fail(f"ECUACION NO CUADRA: Activo {izq:,.2f} != Pas+Pat+Util {der:,.2f} (dif {izq-der:,.2f}). Falta apertura de capital?")
    else: ok(f"Ecuacion contable cuadra: {izq:,.2f} = {der:,.2f}")
    print()

# snapshots
sn=[r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
snap_tbl=next((t for t in ("financial_snapshots","business_snapshots") if t in sn),None)
if snap_tbl:
    tot=cur.execute(f"SELECT company_id,COUNT(*) n FROM {snap_tbl} GROUP BY company_id").fetchall()
    if tot: warn(f"{snap_tbl}: " + ", ".join(f"emp{r['company_id']}={r['n']}" for r in tot) + " (borra tras cambios para forzar recalculo)")

print(f"{B}=== RESULTADO: ",end="")
print(f"{GRN}SIN FALLOS CRITICOS{RST}" if problemas==0 else f"{RED}{problemas} FALLO(S){RST}")
print(f"{'='*50}{RST}\n")
con.close()
