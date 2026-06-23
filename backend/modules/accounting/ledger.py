from decimal import Decimal
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session
from modules.accounting.journal import (
    Account, JournalEntry, Transaction,
    get_account_balance
)


def get_trial_balance(db: Session, company_id: int,
                      start_date: date = None,
                      end_date: date = None) -> dict:
    """
    Generates a trial balance — a list of all accounts
    with their debit and credit balances.
    Total debits MUST equal total credits.
    If they don't the books are wrong.
    """
    accounts = db.query(Account).filter(
        Account.company_id == company_id,
        Account.is_active == True
    ).order_by(Account.code).all()

    trial_balance = []
    total_debits = Decimal("0")
    total_credits = Decimal("0")

    for account in accounts:
        # Get all entries for this account
        query = db.query(JournalEntry).filter(
            JournalEntry.account_id == account.id,
            JournalEntry.company_id == company_id
        )
        if start_date:
            query = query.filter(JournalEntry.date >= start_date)
        if end_date:
            query = query.filter(JournalEntry.date <= end_date)

        entries = query.all()

        if not entries:
            continue  # Skip accounts with no activity

        acc_debits = sum(Decimal(str(e.debit)) for e in entries)
        acc_credits = sum(Decimal(str(e.credit)) for e in entries)

        # Net balance based on normal balance side
        if account.normal_balance == "debit":
            net_balance = acc_debits - acc_credits
            trial_balance.append({
                "code": account.code,
                "name": account.name,
                "type": account.account_type,
                "debit": float(net_balance) if net_balance > 0 else 0,
                "credit": float(abs(net_balance)) if net_balance < 0 else 0,
            })
            total_debits += acc_debits
            total_credits += acc_credits
        else:
            net_balance = acc_credits - acc_debits
            trial_balance.append({
                "code": account.code,
                "name": account.name,
                "type": account.account_type,
                "debit": float(abs(net_balance)) if net_balance < 0 else 0,
                "credit": float(net_balance) if net_balance > 0 else 0,
            })
            total_debits += acc_debits
            total_credits += acc_credits

    is_balanced = total_debits == total_credits

    return {
        "accounts": trial_balance,
        "total_debits": float(total_debits),
        "total_credits": float(total_credits),
        "is_balanced": is_balanced,
        "difference": float(abs(total_debits - total_credits)),
        "period": {
            "start": str(start_date) if start_date else "all time",
            "end": str(end_date) if end_date else "present"
        }
    }


def get_general_ledger(db: Session, company_id: int,
                        account_code: str = None,
                        start_date: date = None,
                        end_date: date = None,
                        max_entries_per_account: int = 500) -> dict:
    """
    Returns the general ledger — organized by account with running balances.

    Escalable a todo el histórico (172k+ asientos) gracias a los índices de
    journal_entries: por cada cuenta se calcula el saldo de cierre y el nº total de
    asientos con un AGREGADO SQL (no se cargan todas las filas en memoria), y solo se
    traen los ÚLTIMOS `max_entries_per_account` asientos para mostrar. El saldo
    acumulado de cada línea mostrada se calcula hacia atrás desde el saldo de cierre,
    así que las cifras son exactas. Si no se pasan fechas, cubre TODO el histórico.
    """
    query = db.query(Account).filter(
        Account.company_id == company_id,
        Account.is_active == True
    )
    if account_code:
        query = query.filter(Account.code == account_code)
    accounts = query.order_by(Account.code).all()
    ledger = []

    def _date_filtered(q):
        if start_date:
            q = q.filter(JournalEntry.date >= start_date)
        if end_date:
            q = q.filter(JournalEntry.date <= end_date)
        return q

    for account in accounts:
        base = db.query(JournalEntry).filter(
            JournalEntry.account_id == account.id,
            JournalEntry.company_id == company_id,
        )
        base = _date_filtered(base)

        # Agregado: totales y conteo SIN traer las filas (rápido con índice).
        agg = _date_filtered(
            db.query(
                func.coalesce(func.sum(JournalEntry.debit), 0),
                func.coalesce(func.sum(JournalEntry.credit), 0),
                func.count(JournalEntry.id),
            ).filter(
                JournalEntry.account_id == account.id,
                JournalEntry.company_id == company_id,
            )
        ).one()
        sum_debit, sum_credit, entries_total = Decimal(str(agg[0])), Decimal(str(agg[1])), int(agg[2])

        if entries_total == 0:
            continue

        if account.normal_balance == "debit":
            closing = sum_debit - sum_credit
        else:
            closing = sum_credit - sum_debit

        # Solo los últimos N asientos para mostrar (orden desc en SQL, luego cronológico).
        recent = base.order_by(JournalEntry.date.desc(), JournalEntry.id.desc()).limit(
            max_entries_per_account
        ).all()
        recent = list(reversed(recent))

        # Saldo de apertura de la ventana mostrada = cierre − suma de deltas mostrados.
        def _delta(e):
            d, c = Decimal(str(e.debit)), Decimal(str(e.credit))
            return (d - c) if account.normal_balance == "debit" else (c - d)

        window_delta = sum((_delta(e) for e in recent), Decimal("0"))
        running = closing - window_delta

        entry_list = []
        for e in recent:
            running += _delta(e)
            entry_list.append({
                "date": str(e.date),
                "transaction_id": e.transaction_id,
                "description": e.description,
                "reference": e.reference,
                "debit": float(Decimal(str(e.debit))),
                "credit": float(Decimal(str(e.credit))),
                "balance": float(running),
                "source": e.module_source,
            })

        ledger.append({
            "account_code": account.code,
            "account_name": account.name,
            "account_type": account.account_type,
            "normal_balance": account.normal_balance,
            "closing_balance": float(closing),
            "entries": entry_list,
            "entries_total": entries_total,
            "truncated": entries_total > len(entry_list),
        })

    return {
        "ledger": ledger,
        "total_accounts": len(ledger),
        "period": {
            "start": str(start_date) if start_date else "all time",
            "end": str(end_date) if end_date else "present",
        },
    }


def get_account_summary(db: Session, company_id: int,
                         start_date: date = None,
                         end_date: date = None) -> dict:
    """
    Returns a summary of all account balances grouped by type.
    Used internally by the statements generator.
    """
    # Must scope to this company: every company shares the same PGC account
    # codes, so without this filter get_account_balance() re-resolves each code
    # back to `company_id` and the same balance is counted once per company that
    # has that code → double/triple-counted financial statements.
    accounts = db.query(Account).filter(
        Account.company_id == company_id,
        Account.is_active == True
    ).all()

    summary = {
        "assets": {},
        "liabilities": {},
        "equity": {},
        "income": {},
        "expenses": {}
    }

    for account in accounts:
        balance = get_account_balance(
            db, account.code, company_id, start_date, end_date
        )

        if balance == 0:
            continue

        account_type = account.account_type
        # Normalize singular/plural
        if account_type == "expense":
            account_type = "expenses"
        elif account_type == "liability":
            account_type = "liabilities"
        elif account_type == "asset":
            account_type = "assets"
        if account_type in summary:
            summary[account_type][account.code] = {
                "name": account.name,
                "balance": float(balance)
            }

    totals = {}
    for acc_type, accounts_dict in summary.items():
        totals[acc_type] = round(
            sum(v["balance"] for v in accounts_dict.values()), 2
        )

    return {
        "accounts": summary,
        "totals": totals
    }