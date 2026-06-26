"""Stripe Connect — let each company collect card / Apple Pay / Google Pay
payments from THEIR customers, with the money going to the company's own
account (not Vela's).

Model: Express connected accounts (Stripe-hosted onboarding + KYC + payouts).
Charges are DIRECT charges on the connected account (the customer pays the
company; Vela may take an optional application fee). Apple Pay / Google Pay show
up automatically on Stripe's hosted Checkout for the connected account.

Everything is gated on Stripe being configured (STRIPE_SECRET_KEY) so dev without
keys is a clean no-op. Stripe Connect availability varies by country — ES/MX are
supported; some countries (e.g. SV) are not yet, so onboarding will surface
Stripe's own error.
"""
import stripe

from core.config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

# Optional platform fee in basis points (100 = 1%). Default 0 → company keeps 100%.
APP_FEE_BPS = int(getattr(settings, "CONNECT_APPLICATION_FEE_BPS", 0) or 0)


class ConnectError(Exception):
    pass


def enabled() -> bool:
    return bool(settings.STRIPE_SECRET_KEY)


def _require_enabled():
    if not enabled():
        raise ConnectError("Pagos no configurados (falta STRIPE_SECRET_KEY).")


def create_or_get_account(db, company, email: str) -> str:
    """Return the company's connected-account id, creating an Express account if
    none exists yet."""
    _require_enabled()
    if getattr(company, "stripe_connect_id", None):
        return company.stripe_connect_id
    country = (getattr(company, "country", None) or "ES").upper()
    acct = stripe.Account.create(
        type="express",
        email=email,
        country=country,
        capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
        business_type="company",
        metadata={"vela_company_id": str(company.id)},
    )
    company.stripe_connect_id = acct.id
    db.commit()
    return acct.id


def create_onboarding_link(account_id: str, return_url: str, refresh_url: str) -> str:
    """Stripe-hosted onboarding URL (identity + bank details)."""
    _require_enabled()
    link = stripe.AccountLink.create(
        account=account_id, return_url=return_url, refresh_url=refresh_url,
        type="account_onboarding",
    )
    return link.url


def refresh_status(db, company) -> dict:
    """Pull the live account status from Stripe and cache the flags on the company."""
    if not (enabled() and getattr(company, "stripe_connect_id", None)):
        return {"connected": False, "charges_enabled": False, "details_submitted": False, "payouts_enabled": False}
    acct = stripe.Account.retrieve(company.stripe_connect_id)
    company.connect_charges_enabled = 1 if acct.charges_enabled else 0
    company.connect_details_submitted = 1 if acct.details_submitted else 0
    db.commit()
    return {
        "connected": True,
        "charges_enabled": bool(acct.charges_enabled),
        "payouts_enabled": bool(acct.payouts_enabled),
        "details_submitted": bool(acct.details_submitted),
    }


def create_sale_payment(account_id: str, amount: float, currency: str, description: str,
                        success_url: str, cancel_url: str, metadata: dict = None,
                        expires_at: int = None) -> dict:
    """Direct-charge Checkout Session on the connected account for a sale. The
    customer pays with card / Apple Pay / Google Pay; the money lands in the
    company's account. metadata is echoed on the session (so the webhook can map
    the payment back to the pending cart). Returns {url, id}."""
    _require_enabled()
    amount_cents = int(round(float(amount) * 100))
    if amount_cents < 50:
        raise ConnectError("Importe demasiado bajo para cobro con tarjeta.")
    app_fee = int(amount_cents * APP_FEE_BPS / 10000) if APP_FEE_BPS else 0
    pi_data = {"application_fee_amount": app_fee} if app_fee else {}
    kwargs = dict(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": (currency or "eur").lower(),
                "product_data": {"name": description or "Venta"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        payment_intent_data=pi_data,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata or {},
        # The crucial bit: run the charge ON the connected account (direct charge).
        stripe_account=account_id,
    )
    if expires_at:
        kwargs["expires_at"] = expires_at
    session = stripe.checkout.Session.create(**kwargs)
    return {"url": session.url, "id": session.id}


def refund_payment(account_id: str, payment_intent: str, amount: float = None) -> dict:
    """Refund a Connect card/Apple Pay payment to the customer's card, on the
    connected account. amount=None → full refund; else a partial amount in the
    sale currency. Returns {id, status, amount}."""
    _require_enabled()
    if not payment_intent:
        raise ConnectError("Esta venta no tiene un pago con tarjeta que reembolsar.")
    kwargs = {"payment_intent": payment_intent}
    if amount is not None:
        kwargs["amount"] = int(round(float(amount) * 100))
    refund = stripe.Refund.create(stripe_account=account_id, **kwargs)
    return {"id": refund.id, "status": refund.status, "amount": (refund.amount or 0) / 100}
