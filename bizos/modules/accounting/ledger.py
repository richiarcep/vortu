from decimal import Decimal
from datetime import date
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
                        end_date: date = None) -> dict:
    """
    Returns the general ledger — every transaction recorded,
    organized by account with running balances.
    """
    query = db.query(Account).filter(
        Account.company_id == company_id,
        Account.is_active == True
    )

    if account_code:
        query = query.filter(Account.code == account_code)

    accounts = query.order_by(Account.code).all()
    ledger = []

    for account in accounts:
        entry_query = db.query(JournalEntry).filter(
            JournalEntry.account_id == account.id,
            JournalEntry.company_id == company_id
        ).order_by(JournalEntry.date, JournalEntry.id)

        if start_date:
            entry_query = entry_query.filter(JournalEntry.date >= start_date)
        if end_date:
            entry_query = entry_query.filter(JournalEntry.date <= end_date)

        entries = entry_query.all()

        if not entries:
            continue

        running_balance = Decimal("0")
        entry_list = []

        for entry in entries:
            debit = Decimal(str(entry.debit))
            credit = Decimal(str(entry.credit))

            if account.normal_balance == "debit":
                running_balance += debit - credit
            else:
                running_balance += credit - debit

            entry_list.append({
                "date": str(entry.date),
                "transaction_id": entry.transaction_id,
                "description": entry.description,
                "reference": entry.reference,
                "debit": float(debit),
                "credit": float(credit),
                "balance": float(running_balance),
                "source": entry.module_source,
            })

        ledger.append({
            "account_code": account.code,
            "account_name": account.name,
            "account_type": account.account_type,
            "normal_balance": account.normal_balance,
            "closing_balance": float(running_balance),
            "entries": entry_list,
        })

    return {
        "ledger": ledger,
        "total_accounts": len(ledger),
        "period": {
            "start": str(start_date) if start_date else "all time",
            "end": str(end_date) if end_date else "present"
        }
    }


def get_account_summary(db: Session, company_id: int,
                         start_date: date = None,
                         end_date: date = None) -> dict:
    """
    Returns a summary of all account balances grouped by type.
    Used internally by the statements generator.
    """
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