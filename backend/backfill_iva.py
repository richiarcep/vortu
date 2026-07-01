"""Backfill — re-desglosa el IVA en asientos de INGRESO (module_source='cierre_caja')
que se crearon SIN línea de IVA por el bug de revenue_register._vat_account_code
(MX/SV resolvían None → ingreso contabilizado por el total, IVA por pagar vacío).

Para cada asiento candidato recalcula base/cuota con el IVA por defecto del país y:
  · ajusta la línea de INGRESO (HABER) de total → base,
  · añade una línea de IVA repercutido (HABER) por la cuota.
Así el asiento sigue cuadrando (DEBE caja = HABER base + HABER IVA).

SEGURO por diseño:
  · DRY-RUN por defecto; escribe solo con  --apply.
  · Idempotente: ignora asientos que YA tienen una línea en la cuenta de IVA.
  · Solo toca asientos de EXACTAMENTE 2 líneas (caja DEBE total + ingreso HABER total)
    cuya empresa TIENE cuenta de IVA repercutido resoluble (= debió desglosarse).
  · Salta empresas sin IVA por defecto conocido y asientos cuyo total no cuadra.

Uso (dentro del contenedor app):
    python backfill_iva.py            # dry-run: lista candidatos
    python backfill_iva.py --apply    # aplica los cambios en una transacción
"""
import sys
from sqlalchemy import text
from core.database import worker_session  # BYPASSRLS: ve todos los tenants

COUNTRY_RATE = {"ES": 21.0, "MX": 16.0, "SV": 13.0}
APPLY = "--apply" in sys.argv

REP_KWS = ("repercut", "traslad", "débito fiscal", "debito fiscal", "por pagar")


def _iva_repercutido_account(db, company_id):
    """(id, code) de la cuenta de IVA repercutido de la empresa, o None."""
    like = " OR ".join("lower(name) LIKE :k%d" % i for i in range(len(REP_KWS)))
    params = {"cid": company_id}
    params.update({f"k{i}": f"%{kw}%" for i, kw in enumerate(REP_KWS)})
    row = db.execute(text(
        "SELECT id, code FROM accounts WHERE company_id = :cid AND account_type = 'liability' "
        "AND (lower(name) LIKE '%iva%' OR lower(name) LIKE '%igv%') AND (" + like + ") "
        "ORDER BY code LIMIT 1"
    ), params).first()
    return (row[0], row[1]) if row else None


def main():
    db = worker_session()
    fixed, skipped = 0, 0
    txs = db.execute(text(
        "SELECT t.transaction_id, t.company_id, c.country "
        "FROM transactions t JOIN companies c ON c.id = t.company_id "
        "WHERE t.module_source = 'cierre_caja'"
    )).fetchall()
    print(f"Asientos de ingreso (cierre_caja) a revisar: {len(txs)}\n")

    for tx_id, company_id, country in txs:
        rate = COUNTRY_RATE.get((country or "").upper())
        if not rate:
            continue  # país sin IVA por defecto conocido
        iva = _iva_repercutido_account(db, company_id)
        if not iva:
            continue  # la empresa no tiene cuenta de IVA → no aplica
        iva_id, iva_code = iva

        lines = db.execute(text(
            "SELECT je.id, je.account_id, je.debit, je.credit, a.account_type, "
            "je.date, je.description, je.company_id, je.reference, je.module_source "
            "FROM journal_entries je JOIN accounts a ON a.id = je.account_id "
            "WHERE je.transaction_id = :t"
        ), {"t": tx_id}).mappings().fetchall()

        # Idempotencia: si ya hay línea en la cuenta de IVA, nada que hacer.
        if any(l["account_id"] == iva_id for l in lines):
            continue
        # Solo el patrón simple de 2 líneas (caja DEBE total + ingreso HABER total).
        if len(lines) != 2:
            skipped += 1
            continue
        income = next((l for l in lines if (l["debit"] or 0) == 0 and l["account_type"] in ("income", "revenue")), None)
        cash = next((l for l in lines if (l["credit"] or 0) == 0 and (l["debit"] or 0) > 0), None)
        if not income or not cash:
            skipped += 1
            continue

        total = round(float(income["credit"] or 0), 2)
        if total <= 0:
            continue
        base = round(total / (1 + rate / 100.0), 2)
        cuota = round(total - base, 2)
        print(f"  tx={tx_id} company={company_id} {country} total={total} -> base={base} + IVA({iva_code})={cuota}")

        if APPLY:
            # Ajusta el ingreso (HABER) total → base y añade la línea de IVA (HABER) por la
            # cuota, copiando date/description/company_id/etc. de la línea de ingreso para
            # respetar los NOT NULL y mantener el asiento cuadrado.
            db.execute(text("UPDATE journal_entries SET credit = :b WHERE id = :id"),
                       {"b": base, "id": income["id"]})
            db.execute(text(
                "INSERT INTO journal_entries (transaction_id, account_id, date, description, "
                "debit, credit, reference, module_source, company_id) "
                "VALUES (:t, :aid, :d, :desc, 0, :c, :ref, :ms, :cid)"
            ), {"t": tx_id, "aid": iva_id, "d": income["date"], "desc": income["description"],
                "c": cuota, "ref": income["reference"], "ms": income["module_source"],
                "cid": income["company_id"]})
        fixed += 1

    if APPLY:
        db.commit()
        print(f"\nAPLICADO: {fixed} asientos corregidos. ({skipped} saltados por patrón no estándar)")
    else:
        print(f"\nDRY-RUN: {fixed} asientos se corregirían. ({skipped} saltados). Re-ejecuta con --apply.")
    db.close()


if __name__ == "__main__":
    main()
