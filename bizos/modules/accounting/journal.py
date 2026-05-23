from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, Text, Boolean
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


# ── Database Models ───────────────────────────────────────────────────────────

class Account(Base):
    """
    Chart of Accounts — every account the business uses.
    Based on Spanish PGC (Plan General Contable) structure.
    """
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)  # asset, liability, equity, income, expense
    normal_balance = Column(String, nullable=False)  # debit, credit
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entries = relationship("JournalEntry", back_populates="account")


class JournalEntry(Base):
    """
    Every financial transaction recorded as a double entry.
    Debits always equal credits — this is the foundation of accounting.
    """
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, nullable=False, index=True)  # groups debit + credit together
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    debit = Column(Numeric(15, 2), default=0)
    credit = Column(Numeric(15, 2), default=0)
    reference = Column(String, nullable=True)  # invoice number, payroll period, etc
    module_source = Column(String, nullable=True)  # which module created this entry
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("Account", back_populates="entries")


class Transaction(Base):
    """
    A transaction groups multiple journal entries together.
    Every transaction must balance — total debits = total credits.
    """
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    module_source = Column(String, nullable=True)
    is_balanced = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Chart of Accounts Setup ───────────────────────────────────────────────────

DEFAULT_ACCOUNTS = [
    # ASSETS (1xx) — debit normal balance
    {"code": "100", "name": "Cash and Bank",           "type": "asset",     "normal": "debit"},
    {"code": "110", "name": "Accounts Receivable",     "type": "asset",     "normal": "debit"},
    {"code": "120", "name": "Inventory",               "type": "asset",     "normal": "debit"},
    {"code": "130", "name": "Prepaid Expenses",        "type": "asset",     "normal": "debit"},
    {"code": "140", "name": "Fixed Assets",            "type": "asset",     "normal": "debit"},
    {"code": "150", "name": "Accumulated Depreciation","type": "asset",     "normal": "credit"},

    # LIABILITIES (2xx) — credit normal balance
    {"code": "200", "name": "Accounts Payable",        "type": "liability", "normal": "credit"},
    {"code": "210", "name": "Salaries Payable",        "type": "liability", "normal": "credit"},
    {"code": "220", "name": "Tax Payable",             "type": "liability", "normal": "credit"},
    {"code": "230", "name": "Social Security Payable", "type": "liability", "normal": "credit"},
    {"code": "240", "name": "Short Term Loans",        "type": "liability", "normal": "credit"},
    {"code": "250", "name": "Long Term Loans",         "type": "liability", "normal": "credit"},

    # EQUITY (3xx) — credit normal balance
    {"code": "300", "name": "Share Capital",           "type": "equity",    "normal": "credit"},
    {"code": "310", "name": "Retained Earnings",       "type": "equity",    "normal": "credit"},
    {"code": "320", "name": "Current Year Profit",     "type": "equity",    "normal": "credit"},

    # INCOME (4xx) — credit normal balance
    {"code": "400", "name": "Sales Revenue",           "type": "income",    "normal": "credit"},
    {"code": "410", "name": "Service Revenue",         "type": "income",    "normal": "credit"},
    {"code": "420", "name": "Other Income",            "type": "income",    "normal": "credit"},
    {"code": "430", "name": "Interest Income",         "type": "income",    "normal": "credit"},

    # EXPENSES (5xx) — debit normal balance
    {"code": "500", "name": "Salaries Expense",        "type": "expense",   "normal": "debit"},
    {"code": "510", "name": "Social Security Expense", "type": "expense",   "normal": "debit"},
    {"code": "520", "name": "Rent Expense",            "type": "expense",   "normal": "debit"},
    {"code": "530", "name": "Utilities Expense",       "type": "expense",   "normal": "debit"},
    {"code": "540", "name": "Marketing Expense",       "type": "expense",   "normal": "debit"},
    {"code": "550", "name": "Office Supplies",         "type": "expense",   "normal": "debit"},
    {"code": "560", "name": "Software Subscriptions",  "type": "expense",   "normal": "debit"},
    {"code": "570", "name": "Professional Services",   "type": "expense",   "normal": "debit"},
    {"code": "580", "name": "Depreciation Expense",    "type": "expense",   "normal": "debit"},
    {"code": "590", "name": "Other Expenses",          "type": "expense",   "normal": "debit"},
    {"code": "595", "name": "Income Tax Expense",      "type": "expense",   "normal": "debit"},
]


def setup_chart_of_accounts(db, company_id: int):
    """
    Creates the default chart of accounts for a new company.
    Called automatically when a company registers.
    """
    existing = db.query(Account).filter(
        Account.company_id == company_id
    ).first()

    if existing:
        return  # Already set up

    for acc in DEFAULT_ACCOUNTS:
        account = Account(
            code=acc["code"],
            name=acc["name"],
            account_type=acc["type"],
            normal_balance=acc["normal"],
            company_id=company_id
        )
        db.add(account)

    db.commit()


# ── Double Entry Engine ───────────────────────────────────────────────────────

def record_transaction(
    db,
    company_id: int,
    date: date,
    description: str,
    entries: list[dict],
    module_source: str = "manual",
    reference: str = None
) -> dict:
    """
    Records a double entry transaction.
    entries = [
        {"account_code": "100", "debit": 5000, "credit": 0},
        {"account_code": "400", "debit": 0,    "credit": 5000},
    ]
    Total debits MUST equal total credits — raises error if not.
    """

    # Step 1 — Validate the transaction balances
    total_debits = sum(Decimal(str(e.get("debit", 0))) for e in entries)
    total_credits = sum(Decimal(str(e.get("credit", 0))) for e in entries)

    if total_debits != total_credits:
        raise ValueError(
            f"Transaction does not balance. "
            f"Debits: {total_debits}, Credits: {total_credits}. "
            f"Difference: {abs(total_debits - total_credits)}"
        )

    # Step 2 — Generate unique transaction ID
    import uuid
    transaction_id = str(uuid.uuid4())[:8].upper()

    # Step 3 — Record each journal entry
    for entry in entries:
        account = db.query(Account).filter(
            Account.code == entry["account_code"],
            Account.company_id == company_id
        ).first()

        if not account:
            raise ValueError(f"Account code {entry['account_code']} not found")

        journal_entry = JournalEntry(
            transaction_id=transaction_id,
            account_id=account.id,
            date=date,
            description=description,
            debit=Decimal(str(entry.get("debit", 0))),
            credit=Decimal(str(entry.get("credit", 0))),
            reference=reference,
            module_source=module_source,
            company_id=company_id
        )
        db.add(journal_entry)

    # Step 4 — Record the transaction header
    transaction = Transaction(
        transaction_id=transaction_id,
        date=date,
        description=description,
        total_amount=total_debits,
        module_source=module_source,
        is_balanced=True,
        company_id=company_id
    )
    db.add(transaction)
    db.commit()

    return {
        "transaction_id": transaction_id,
        "date": str(date),
        "description": description,
        "total_amount": float(total_debits),
        "entries": len(entries),
        "balanced": True
    }


def get_account_balance(db, account_code: str, company_id: int,
                         start_date: date = None, end_date: date = None) -> Decimal:
    """
    Returns the running balance for any account.
    Respects normal balance — assets/expenses increase with debits,
    liabilities/equity/income increase with credits.
    """
    account = db.query(Account).filter(
        Account.code == account_code,
        Account.company_id == company_id
    ).first()

    if not account:
        return Decimal("0")

    query = db.query(JournalEntry).filter(
        JournalEntry.account_id == account.id,
        JournalEntry.company_id == company_id
    )

    if start_date:
        query = query.filter(JournalEntry.date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.date <= end_date)

    entries = query.all()

    total_debits = sum(Decimal(str(e.debit)) for e in entries)
    total_credits = sum(Decimal(str(e.credit)) for e in entries)

    if account.normal_balance == "debit":
        return total_debits - total_credits
    else:
        return total_credits - total_debits


# ── Auto-entry generators from other modules ──────────────────────────────────

def record_revenue(db, company_id: int, amount: float,
                   description: str, entry_date: date,
                   reference: str = None):
    """
    Records a revenue transaction automatically.
    Debit: Cash/Bank (100) | Credit: Sales Revenue (400)
    """
    return record_transaction(
        db=db,
        company_id=company_id,
        date=entry_date,
        description=description,
        entries=[
            {"account_code": "100", "debit": amount, "credit": 0},
            {"account_code": "400", "debit": 0, "credit": amount},
        ],
        module_source="revenue_register",
        reference=reference
    )


def record_expense(db, company_id: int, amount: float,
                   expense_account: str, description: str,
                   entry_date: date, reference: str = None):
    """
    Records an expense transaction automatically.
    Debit: Expense Account | Credit: Cash/Bank (100)
    """
    return record_transaction(
        db=db,
        company_id=company_id,
        date=entry_date,
        description=description,
        entries=[
            {"account_code": expense_account, "debit": amount, "credit": 0},
            {"account_code": "100", "debit": 0, "credit": amount},
        ],
        module_source="expense_register",
        reference=reference
    )


def record_payroll_from_hr(db, company_id: int, payroll_data: dict,
                            entry_date: date, period: str):
    """
    Automatically creates journal entries from processed payroll data.
    Called by the HR module after payroll is calculated.
    Debit: Salaries Expense (500) + SS Expense (510)
    Credit: Salaries Payable (210) + SS Payable (230)
    """
    total_gross = payroll_data.get("summary", {}).get("total_gross_payroll", 0)
    total_net = payroll_data.get("summary", {}).get("total_net_payroll", 0)
    total_deductions = payroll_data.get("summary", {}).get("total_deductions", 0)

    # Employer social security — approximately 29.9% of gross
    employer_ss = round(total_gross * 0.299, 2)

    return record_transaction(
        db=db,
        company_id=company_id,
        date=entry_date,
        description=f"Payroll — {period}",
        entries=[
            {"account_code": "500", "debit": total_gross,    "credit": 0},
            {"account_code": "510", "debit": employer_ss,    "credit": 0},
            {"account_code": "210", "debit": 0, "credit": total_net},
            {"account_code": "230", "debit": 0, "credit": total_deductions + employer_ss},
        ],
        module_source="hr_payroll",
        reference=period
    )