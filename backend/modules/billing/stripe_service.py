import stripe
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from core.config import get_settings
from models.billing import License, Subscription, UsageTracking, BillingEvent, PLANS
import models.user

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

STRIPE_PRICES = {
    "starter":    settings.STRIPE_PRICE_STARTER,
    "pro":        settings.STRIPE_PRICE_PRO,
    "business":   settings.STRIPE_PRICE_BUSINESS,
    "extra_user": settings.STRIPE_PRICE_EXTRA_USER,
    "vera_plus":  settings.STRIPE_PRICE_VERA_PLUS,
}

# Current (v3) monthly prices in EUR — the source of truth for amounts (mirrors
# models.billing.PLANS). Used to build INLINE recurring prices when a real Stripe
# price id isn't configured, so subscriptions work in test mode without pre-created
# prices (the .env STRIPE_PRICE_* ids were stale). A configured `price_…` id always
# wins; otherwise we fall back to price_data.
PLAN_AMOUNTS_EUR = {"starter": 29, "pro": 59, "business": 119, "extra_user": 8, "vera_plus": 19}

# Moneda del checkout según el país del tenant: ES→EUR, MX→MXN, SV→USD.
CURRENCY_BY_COUNTRY = {"ES": "eur", "MX": "mxn", "SV": "usd"}
# Importes mensuales por moneda. EUR es la fuente (v3). MXN/USD son PLACEHOLDERS a
# CALIBRAR con precio de mercado por país (no solo conversión FX) — el usuario ajusta
# estos valores y/o crea price IDs de Stripe por país.
PLAN_AMOUNTS = {
    "eur": PLAN_AMOUNTS_EUR,
    "usd": {"starter": 32, "pro": 65, "business": 129, "extra_user": 9, "vera_plus": 21},
    "mxn": {"starter": 549, "pro": 1099, "business": 2199, "extra_user": 149, "vera_plus": 349},
}
PLAN_NAMES = {
    "starter": "Vela Starter", "pro": "Vela Pro", "business": "Vela Business",
    "extra_user": "Usuario extra", "vera_plus": "Vera Plus",
}


def _user_country(db, user_id) -> str:
    """País del tenant (para la moneda del checkout). 'ES' por defecto si no se resuelve."""
    try:
        from models.user import User, Company
        u = db.query(User).filter(User.id == user_id).first()
        if u and u.company_id:
            c = db.query(Company).filter(Company.id == u.company_id).first()
            if c and c.country:
                return c.country.upper()
    except Exception:
        pass
    return "ES"


def _price_selector(plan_id: str, country: str = "ES") -> dict:
    """Return a Stripe price selector usable in BOTH Checkout line_items and
    Subscription items, EN LA MONEDA DEL PAÍS del tenant (ES→EUR, MX→MXN, SV→USD).

    Default: inline {'price_data': {...recurring monthly...}} desde PLAN_AMOUNTS
    — así el checkout funciona sin price IDs pre-creados. Para EUR/ES, si
    STRIPE_USE_CONFIGURED_PRICES=true y hay un price_… válido, se usa el price ID del
    Dashboard. MXN/USD van por price_data inline hasta que se creen price IDs por país."""
    currency = CURRENCY_BY_COUNTRY.get((country or "ES").upper(), "eur")
    pid = STRIPE_PRICES.get(plan_id)
    if currency == "eur" and getattr(settings, "STRIPE_USE_CONFIGURED_PRICES", False) and isinstance(pid, str) and pid.startswith("price_"):
        return {"price": pid}
    amount = PLAN_AMOUNTS.get(currency, PLAN_AMOUNTS_EUR).get(plan_id, 0)
    return {"price_data": {
        "currency": currency,
        "product_data": {"name": PLAN_NAMES.get(plan_id, plan_id)},
        "unit_amount": int(amount * 100),
        "recurring": {"interval": "month"},
    }}

STRIPE_LICENSE_PRICES = {
    "starter":  settings.STRIPE_LICENSE_STARTER,
    "pro":      settings.STRIPE_LICENSE_PRO,
    "business": settings.STRIPE_LICENSE_BUSINESS,
}

LICENSE_PRICES_EUR = {
    "starter": 149,
    "pro":     299,
    "business": 499,
}

def get_or_create_customer(email, name, user_id):
    existing = stripe.Customer.search(query=f'email:"{email}"', limit=1)
    if existing.data:
        return existing.data[0].id
    customer = stripe.Customer.create(email=email, name=name, metadata={"vela_user_id": str(user_id)})
    return customer.id

def create_subscription_checkout(db, user_id, email, name, plan_id):
    """
    Suscripcion directa sin licencia.
    """
    customer_id = get_or_create_customer(email, name, user_id)
    # NOTE: we deliberately do NOT set payment_method_types — that lets Stripe
    # Checkout surface the account's dynamic payment methods, which include
    # Apple Pay + Google Pay automatically on supported devices (hosted Checkout
    # runs on checkout.stripe.com, so no Apple Pay domain verification is needed).
    # Enable Apple Pay / Google Pay once in the Stripe Dashboard → Payment methods
    # (both are on by default for most accounts).
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{**_price_selector(plan_id, _user_country(db, user_id)), "quantity": 1}],
        subscription_data={
            "metadata": {"vela_user_id": str(user_id), "plan_id": plan_id}
        },
        metadata={"vela_user_id": str(user_id), "plan_id": plan_id, "type": "subscription"},
        success_url=f"{settings.FRONTEND_URL}/settings?tab=subscription&success=1",
        cancel_url=f"{settings.FRONTEND_URL}/settings?tab=subscription",
        locale="es",
        allow_promotion_codes=True,
    )
    return {"checkout_url": session.url, "session_id": session.id}

def create_upgrade_checkout(db, user_id, email, name, new_plan_id):
    """
    Upgrade/downgrade sin licencia.
    Upgrade: prorratea inmediatamente.
    Downgrade: cambia al siguiente ciclo sin cargo.
    """
    customer_id = get_or_create_customer(email, name, user_id)
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()

    plan_order = {"starter": 0, "pro": 1, "business": 2}
    current_plan_id = sub.plan_id if sub else "starter"
    is_downgrade = plan_order.get(new_plan_id, 0) < plan_order.get(current_plan_id, 0)

    now = datetime.utcnow()

    # ── DOWNGRADE ──────────────────────────────────────────────────────────────
    if is_downgrade:
        # No cobra licencia. Cambia sub al siguiente ciclo sin cargo inmediato
        if sub and sub.stripe_subscription_id:
            try:
                stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
                current_item = stripe_sub["items"]["data"][0]
                stripe.Subscription.modify(
                    sub.stripe_subscription_id,
                    items=[{"id": current_item["id"], **_price_selector(new_plan_id, _user_country(db, user_id))}],
                    proration_behavior="none",  # No prorratea, aplica al siguiente ciclo
                    billing_cycle_anchor="unchanged",
                )
                sub.pending_downgrade_plan = new_plan_id  # No cambia plan_id todavia
                db.commit()
                return {"checkout_url": None, "upgraded": True, "downgrade": True,
                        "period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
                        "message": f"Cambio programado a {new_plan_id}. Activo el {sub.current_period_end.strftime('%d/%m/%Y') if sub.current_period_end else 'proximo ciclo'}."}
            except Exception as e:
                import traceback
                print(f"Error downgrade Stripe: {e}")
                traceback.print_exc()
                return {"checkout_url": None, "upgraded": False, "error": str(e)}
        # Sin sub activa — actualizar solo en BD
        if sub:
            sub.plan_id = new_plan_id
            db.commit()
        return {"checkout_url": None, "upgraded": True, "downgrade": True}

    # ── UPGRADE ────────────────────────────────────────────────────────────────
    if sub and sub.stripe_subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
            current_item = stripe_sub["items"]["data"][0]

            # Cambiar sub con prorrateo inmediato
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                items=[{"id": current_item["id"], **_price_selector(new_plan_id, _user_country(db, user_id))}],
                proration_behavior="create_prorations",
            )
            sub.plan_id = new_plan_id
            db.commit()

            return {"checkout_url": None, "upgraded": True,
                    "message": f"Plan actualizado a {new_plan_id}. La diferencia se aplica en tu proxima factura."}

        except Exception as e:
            print(f"Error upgrade Stripe: {e}")
            return {"checkout_url": None, "upgraded": False, "error": str(e)}

    # Sin sub activa — checkout nuevo
    return create_subscription_checkout(db, user_id, email, name, new_plan_id)

def create_billing_portal(customer_id):
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings?tab=billing"
    )
    return session.url

def cancel_subscription(subscription_id, at_period_end=True):
    sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=at_period_end)
    return {"canceled": True, "cancel_at": sub.get("cancel_at")}

def add_extra_user(db, user_id, subscription_id, quantity=1):
    sub = stripe.Subscription.retrieve(subscription_id)
    extra_item = next((i for i in sub["items"]["data"] if i["price"]["id"] == STRIPE_PRICES["extra_user"]), None)
    if extra_item:
        stripe.SubscriptionItem.modify(extra_item["id"], quantity=extra_item["quantity"] + quantity)
    else:
        stripe.Subscription.modify(subscription_id, items=[{**_price_selector("extra_user", _user_country(db, user_id)), "quantity": quantity}])
    db_sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if db_sub:
        db_sub.extra_users = max(0, db_sub.extra_users + quantity)
        db.commit()
    return {"success": True}

def handle_webhook(db, payload, sig_header):
    # Mirror the Connect-webhook guard: with a blank secret, construct_event would
    # accept events HMAC'd with the empty key (forgery risk) and reject every real
    # Stripe event (silent billing outage). Fail loud instead (security review).
    if not settings.STRIPE_WEBHOOK_SECRET:
        return {"error": "STRIPE_WEBHOOK_SECRET not configured"}
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        return {"error": str(e)}
    # Signature is verified above. Re-parse the raw payload into a plain dict so all
    # downstream access is on native dicts — StripeObject→dict is unreliable on
    # stripe-python 15.x (.get() raises AttributeError; the _raw_response fallback
    # round-trips to a bare str). json.loads accepts bytes or str.
    try:
        event = json.loads(payload)
    except Exception:
        pass  # keep the stripe Event object as a fallback
    existing = db.query(BillingEvent).filter(BillingEvent.stripe_event_id == event["id"]).first()
    if existing:
        return {"status": "already_processed"}
    billing_event = BillingEvent(
        stripe_event_id=event["id"],
        event_type=event["type"],
        data=json.dumps(event["data"]["object"], default=str)
    )
    db.add(billing_event)
    try:
        obj = _stripe_to_dict(event["data"]["object"])
        if event["type"] == "checkout.session.completed":
            # Use the plain dict (obj), never the raw Stripe object — `.get()` on a
            # StripeObject raises AttributeError on stripe-python 15.x.
            _meta = obj.get("metadata") or {}
            if not isinstance(_meta, dict):
                _meta = {}
            # ─── POS sale paid via Stripe Connect → record the real sale now ───
            if _meta.get("type") == "pos_sale":
                _finalize_pos_sale(db, _meta.get("vela_pos_temp_id"),
                                   payment_intent=obj.get("payment_intent"))
                db.commit()
                return {"received": True, "type": "pos_sale"}
            # ─── Vera Plus checkout (atajo: detectar antes que la lógica Vela) ───
            if _meta.get("product") == "vera_plus":
                _company_id = int(_meta.get("vela_company_id", 0))
                _sub_id = obj.get("subscription")
                if _company_id and _sub_id:
                    activate_vera_plus(db, _company_id, _sub_id)
                    db.commit()
                    return {"received": True, "type": "vera_plus_activated", "company_id": _company_id}
            # ─── (Lógica original de subscriptions Vela) ────────────
            _handle_checkout_completed(db, obj)
        elif event["type"] == "customer.subscription.updated":
            _handle_subscription_updated(db, obj)
        elif event["type"] == "customer.subscription.deleted":
            _handle_subscription_deleted(db, obj)
        elif event["type"] == "invoice.payment_failed":
            _handle_payment_failed(db, obj)
        elif event["type"] == "invoice.payment_succeeded":
            _handle_payment_succeeded(db, obj)
        elif event["type"] == "account.updated":
            # companies RLS'd por id y aquí no hay tenant en contexto → worker (BYPASSRLS),
            # igual que handle_connect_webhook. (Lo normal es que account.updated llegue por
            # /api/connect/webhook; esto cubre el caso de que también se enrute aquí.)
            from core.database import worker_session
            wdb = worker_session()
            try:
                _handle_connect_account_updated(wdb, obj)
                wdb.commit()
            finally:
                wdb.close()
        billing_event.processed = True
        db.commit()
        return {"status": "processed"}
    except Exception as e:
        # NO confirmamos la idempotencia (rollback) y devolvemos error → Stripe REINTENTA.
        # Tragar el error + 200 dejaría un pago/suscripción sin efecto y SIN recuperación
        # (la fila de idempotencia bloquearía todo reintento). Los handlers son idempotentes
        # (upsert por user_id / checks de estado), así que reintentar es seguro.
        db.rollback()
        import traceback
        print(f"Webhook error [{event['type']}]: {e}")
        traceback.print_exc()
        return {"error": f"webhook handler failed: {e}"}


def handle_connect_webhook(db, payload, sig_header):
    """Webhook de Stripe CONNECT (scope connected accounts). Verifica la firma con el
    secreto SEPARADO STRIPE_CONNECT_WEBHOOK_SECRET. NO toca handle_webhook (la ruta de
    plataforma). Los eventos de connected account traen un `account` top-level (el id
    de la cuenta conectada): usamos su PRESENCIA como discriminante primario (no solo
    metadata). Maneja account.updated y checkout.session.completed."""
    secret = settings.STRIPE_CONNECT_WEBHOOK_SECRET
    if not secret:
        return {"error": "STRIPE_CONNECT_WEBHOOK_SECRET not configured"}
    try:
        stripe.Webhook.construct_event(payload, sig_header, secret)
    except Exception as e:
        return {"error": str(e)}
    # Firma verificada — re-parseamos el payload CRUDO a dict plano (StripeObject→dict
    # no es fiable en stripe-python 15.x; igual que handle_webhook).
    try:
        event = json.loads(payload)
    except Exception as e:
        return {"error": f"invalid payload: {e}"}

    # DISCRIMINANTE PRIMARIO: un evento de connected account trae `account` top-level.
    connected_account = event.get("account")
    if not connected_account:
        # No es de connected account (un evento de plataforma llegó a esta ruta). Ack
        # para que Stripe no reintente; no hacemos nada.
        return {"status": "ignored", "reason": "no connected account on event"}

    # Idempotencia (billing_events va por stripe_event_id, NO es tenant-scoped → sin RLS).
    if db.query(BillingEvent).filter(BillingEvent.stripe_event_id == event["id"]).first():
        return {"status": "already_processed"}

    etype = event["type"]
    obj = _stripe_to_dict(event["data"]["object"])
    try:
        if etype == "account.updated":
            # No conocemos el tenant de antemano (companies está RLS'd por id; una query
            # sin GUC vería 0 filas) → sesión worker (BYPASSRLS) para resolver la empresa
            # por su connected-account id y actualizar SOLO esa fila.
            from core.database import worker_session
            wdb = worker_session()
            try:
                _handle_connect_account_updated(wdb, obj)
                wdb.commit()
            finally:
                wdb.close()
        elif etype == "checkout.session.completed":
            # Cobro POS (tarjeta/Apple Pay) en la cuenta conectada. El carrito retenido
            # se identifica por metadata.vela_pos_temp_id; _finalize_pos_sale corre en
            # su PROPIA sesión worker (BYPASSRLS), así que pasarle `db` es inocuo.
            _meta = obj.get("metadata") or {}
            if not isinstance(_meta, dict):
                _meta = {}
            temp_id = _meta.get("vela_pos_temp_id")
            if temp_id:
                _finalize_pos_sale(db, temp_id, payment_intent=obj.get("payment_intent"))
    except Exception as e:
        # NO marcamos idempotencia → devolvemos error para que Stripe REINTENTE. Si
        # tragáramos el error + 200, un cobro real quedaría SIN venta y sin recuperación
        # (la fila de idempotencia bloquearía todo reintento). El efecto es idempotente
        # (pending_pos_sales.status='paid' + idempotency_key en persist_sale).
        import traceback
        print(f"Connect webhook error [{etype}]: {e}")
        traceback.print_exc()
        return {"error": f"connect handler failed: {e}"}

    # Efecto OK → AHORA sí registramos el evento como procesado (idempotencia).
    db.add(BillingEvent(
        stripe_event_id=event["id"],
        event_type=event["type"],
        data=json.dumps(event["data"]["object"], default=str),
    ))
    db.commit()
    return {"status": "processed", "connected_account": connected_account, "type": etype}


def _finalize_pos_sale(db, temp_id, payment_intent=None):
    """A POS card/Apple Pay payment succeeded → record the real sale from the held
    cart and mark the pending row paid. Idempotent (safe on duplicate webhooks).
    Stores the Stripe PaymentIntent on the sale so it can be refunded later."""
    if not temp_id:
        return
    from sqlalchemy import text
    import json
    from core.database import worker_session
    from core.security import set_tenant_context
    # pending_pos_sales is RLS'd and the tenant is unknown until the row is read
    # (lookup is by the unguessable temp_id), so the RLS-bound webhook session would
    # see 0 rows. Use the BYPASSRLS worker session for the cross-tenant lookup, then
    # bind that tenant for the write. Every statement is still scoped by company_id.
    wdb = worker_session()
    try:
        row = wdb.execute(text(
            "SELECT company_id, payload, status FROM pending_pos_sales WHERE temp_id=:t"
        ), {"t": temp_id}).mappings().first()
        if not row or row["status"] == "paid":
            return  # unknown or already recorded
        cid = row["company_id"]
        payload = json.loads(row["payload"])
        from api.sales import persist_sale, SaleCreate
        data = SaleCreate(
            items=payload.get("items", []),
            payment_method=payload.get("payment_method", "card"),
            notes=payload.get("notes"),
            allow_oversell=True,                      # the customer already paid
            idempotency_key=f"pos_{temp_id}",         # dedupe on retried webhooks
        )
        set_tenant_context(wdb, cid)                  # bind tenant for persist_sale
        sale = persist_sale(wdb, cid, data, status="completed")
        sid = sale.get("id") if isinstance(sale, dict) else None
        if sid and payment_intent:
            wdb.execute(text("UPDATE sales SET stripe_payment_intent=:pi WHERE id=:s AND company_id=:c"),
                        {"pi": payment_intent, "s": sid, "c": cid})
        wdb.execute(text("UPDATE pending_pos_sales SET status='paid', sale_id=:s WHERE temp_id=:t AND company_id=:c"),
                    {"s": sid, "t": temp_id, "c": cid})
        wdb.commit()
    finally:
        wdb.close()


def _handle_connect_account_updated(db, account):
    """A connected account changed (e.g. finished onboarding) — cache the
    charges/details flags on the company so the POS knows it can charge cards."""
    from models.user import Company
    acct_id = account.get("id")
    if not acct_id:
        return
    company = db.query(Company).filter(Company.stripe_connect_id == acct_id).first()
    if not company:
        return
    company.connect_charges_enabled = 1 if account.get("charges_enabled") else 0
    company.connect_details_submitted = 1 if account.get("details_submitted") else 0


def _stripe_to_dict(obj):
    """Best-effort conversion of a Stripe object / JSON string into a plain dict.
    ALWAYS returns a dict — never a str/list/None — so callers can `.get()` safely.
    Prefer stripe-python's own recursive conversion; fall back to JSON round-trips."""
    if isinstance(obj, dict):
        return obj
    if isinstance(obj, str):
        try:
            parsed = json.loads(obj)
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    # stripe-python objects: use the library's own dict conversion when available.
    for meth in ("to_dict_recursive", "to_dict"):
        fn = getattr(obj, meth, None)
        if callable(fn):
            try:
                d = fn()
                if isinstance(d, dict):
                    return d
            except Exception:
                pass
    try:
        d = json.loads(obj.to_json())
        if isinstance(d, dict):
            return d
    except Exception:
        pass
    try:
        d = dict(obj)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}

def _handle_checkout_completed(db, session):
    session = _stripe_to_dict(session)
    meta = session.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    user_id = int(meta.get("vela_user_id", 0))
    plan_id = meta.get("plan_id", "starter")
    checkout_type = meta.get("type", "subscription")
    if not user_id:
        return

    if checkout_type in ("license_and_subscription", "subscription_only", "subscription"):
        # The plain "subscription" type is what create_subscription_checkout actually
        # emits — previously it matched NO branch, so paid signups never activated
        # (critical review finding). Activate only on a settled payment (or a $0 trial):
        # never trust metadata alone, or a self-made Checkout Session / 100%-off promo
        # could mint a paid plan for ~€0 (security review finding).
        if session.get("payment_status") not in ("paid", "no_payment_required"):
            return
        lic = db.query(License).filter(License.user_id == user_id).first()
        if checkout_type == "license_and_subscription":
            if not lic:
                lic = License(user_id=user_id)
                db.add(lic)
            lic.plan_id = plan_id
            lic.stripe_customer_id = session.get("customer")
            lic.amount_paid = LICENSE_PRICES_EUR.get(plan_id, 0)
            lic.status = "paid"
            lic.paid_at = datetime.utcnow()

        stripe_sub_id = session.get("subscription")
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if not sub:
            sub = Subscription(user_id=user_id)
            db.add(sub)
        sub.plan_id = plan_id
        sub.stripe_customer_id = session.get("customer")
        sub.stripe_subscription_id = stripe_sub_id
        sub.license_paid = True
        sub.status = "active"
        sub.fase = "paid"
        # Primer mes gratis — period_end = ahora + 30 dias
        sub.current_period_start = datetime.utcnow()
        sub.current_period_end = datetime.utcnow() + timedelta(days=30)

    elif checkout_type == "license_then_subscribe":
        # Licencia pagada — activar suscripcion con 30 dias gratis automaticamente
        lic = db.query(License).filter(License.user_id == user_id).first()
        if not lic:
            lic = License(user_id=user_id)
            db.add(lic)
        lic.plan_id = plan_id
        lic.stripe_customer_id = session.get("customer")
        lic.amount_paid = LICENSE_PRICES_EUR.get(plan_id, 0)
        lic.status = "paid"
        lic.paid_at = datetime.utcnow()
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if not sub:
            sub = Subscription(user_id=user_id)
            db.add(sub)
        sub.plan_id = plan_id
        sub.stripe_customer_id = session.get("customer")
        sub.license_paid = True
        sub.status = "active"
        sub.fase = "paid"
        sub.current_period_start = datetime.utcnow()
        sub.current_period_end = datetime.utcnow() + timedelta(days=30)
        # Crear suscripcion en Stripe con 30 dias gratis
        try:
            stripe_sub = stripe.Subscription.create(
                customer=session.get("customer"),
                items=[{"price": STRIPE_PRICES[plan_id]}],
                trial_period_days=30,
                metadata={"vela_user_id": str(user_id), "plan_id": plan_id},
            )
            sub.stripe_subscription_id = stripe_sub["id"]
        except Exception as e:
            print(f"Error creando suscripcion automatica: {e}")

    elif checkout_type == "license_upgrade":
        lic = db.query(License).filter(License.user_id == user_id).first()
        if lic:
            lic.plan_id = plan_id
            lic.amount_paid = LICENSE_PRICES_EUR.get(plan_id, 0)
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if sub:
            sub.plan_id = plan_id

    elif checkout_type == "license":
        lic = db.query(License).filter(License.user_id == user_id).first()
        if not lic:
            lic = License(user_id=user_id)
            db.add(lic)
        lic.plan_id = plan_id
        lic.stripe_customer_id = session.get("customer")
        lic.amount_paid = session.get("amount_total", 0) / 100
        lic.status = "paid"
        lic.paid_at = datetime.utcnow()
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if sub:
            sub.license_paid = True
            sub.plan_id = plan_id
            sub.status = "active"
            sub.fase = "paid"

def _handle_subscription_updated(db, stripe_sub):
    if not isinstance(stripe_sub, dict): stripe_sub = _stripe_to_dict(stripe_sub)
    meta = stripe_sub.get("metadata", {})
    user_id = int(meta.get("vela_user_id", 0))
    if not user_id:
        return
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        # Solo actualizar plan_id si el checkout fue completado (license_paid=True)
        # Evita que un trial creado sin pago actualice el plan
        new_plan = meta.get("plan_id")
        if new_plan and sub.license_paid:
            sub.plan_id = new_plan
        sub.status = stripe_sub["status"]
        if stripe_sub.get("current_period_start"):
            sub.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"])
        if stripe_sub.get("current_period_end"):
            sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
        sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)

def _handle_subscription_deleted(db, stripe_sub):
    from sqlalchemy import text
    meta = stripe_sub.get("metadata", {})

    # Vera Plus cancellation → drop the company back to the base plan. Match either
    # by the metadata (product=vera_plus) or by the persisted subscription id.
    sub_id = stripe_sub.get("id")
    company_id = None
    if meta.get("product") == "vera_plus" and meta.get("vela_company_id"):
        company_id = int(meta["vela_company_id"])
    elif sub_id:
        # Lookup cross-tenant por subscription id (no conocemos company_id) → BYPASSRLS,
        # si no, bajo RLS la SELECT sobre companies vería 0 filas.
        from core.database import worker_session
        wdb = worker_session()
        try:
            row = wdb.execute(text(
                "SELECT id FROM companies WHERE vera_plus_subscription_id = :sub"
            ), {"sub": sub_id}).fetchone()
        finally:
            wdb.close()
        if row:
            company_id = row[0]
    if company_id:
        deactivate_vera_plus(db, company_id)

    user_id = int(meta.get("vela_user_id", 0))
    if not user_id:
        return
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        sub.status = "canceled"
        sub.canceled_at = datetime.utcnow()

def _handle_payment_failed(db, invoice):
    if not isinstance(invoice, dict):
        invoice = _stripe_to_dict(invoice)
    customer_id = invoice.get("customer")
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if sub:
        sub.status = "past_due"

def _handle_payment_succeeded(db, invoice):
    if not isinstance(invoice, dict):
        invoice = _stripe_to_dict(invoice)
    customer_id = invoice.get("customer")
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if sub and sub.status == "past_due":
        sub.status = "active"

def get_subscription_status(db, user_id):
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    lic = db.query(License).filter(License.user_id == user_id).first()
    if not sub:
        return {"plan": "none", "status": "none", "has_access": False, "trial_active": False, "modules": [], "days_until_expiry": None, "expiry_warning": None}

    plan = PLANS.get(sub.plan_id, PLANS["starter"])
    now = datetime.utcnow()
    trial_active = sub.status == "trialing" and sub.trial_end and sub.trial_end > now

    # Calcular dias hasta vencimiento
    days_until_expiry = None
    expiry_warning = None
    if sub.current_period_end:
        delta = (sub.current_period_end - now).days
        days_until_expiry = delta
        if delta < 0:
            expiry_warning = "expired"
        elif delta <= 1:
            expiry_warning = "1_day"
        elif delta <= 3:
            expiry_warning = "3_days"
        elif delta <= 7:
            expiry_warning = "7_days"

    # Acceso segun fase
    fase = sub.fase or "beta"
    if fase == "beta":
        has_access = True
    elif fase == "early_adopter":
        has_access = sub.fase_expiry is None or sub.fase_expiry > now
    else:
        has_access = sub.status in ("trialing", "active") or trial_active

    # Bloqueo si vencio
    if sub.current_period_end and sub.current_period_end < now and sub.status not in ("trialing", "active"):
        has_access = False

    # Module access set. Beta is OPEN (full module set) so the gating UI is wired
    # but locks no one yet; superadmins (incl. the demo) always get full access.
    # Flip the phase to "paid"/"early_adopter" to start enforcing per-plan modules.
    from models.user import User as _User
    _u = db.query(_User).filter(_User.id == user_id).first()
    _is_super = bool(_u and getattr(_u, "is_superadmin", False))
    if fase == "beta" or _is_super:
        allowed_modules = PLANS["business"]["modules"]
    elif has_access:
        allowed_modules = plan["modules"]
    else:
        allowed_modules = ["dashboard"]

    usage = db.query(UsageTracking).filter(
        UsageTracking.subscription_id == sub.id,
        UsageTracking.period_start <= now,
        UsageTracking.period_end >= now
    ).first()

    return {
        "plan": sub.plan_id,
        "plan_name": plan["name"],
        "status": sub.status,
        "fase": fase,
        "has_access": has_access,
        "trial_active": trial_active,
        "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
        "trial_days_left": (sub.trial_end - now).days if trial_active and sub.trial_end else 0,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "days_until_expiry": days_until_expiry,
        "expiry_warning": expiry_warning,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "pending_downgrade_plan": sub.pending_downgrade_plan if hasattr(sub, 'pending_downgrade_plan') else None,
        "license_paid": lic.status == "paid" if lic else False,
        "modules": allowed_modules,
        "max_users": plan["max_users"] + sub.extra_users,
        "extra_users": sub.extra_users,
        "ai_limit": plan["ai_queries_monthly"],
        "ai_used": usage.ai_queries_used if usage else 0,
        "documents_limit": plan["max_documents_monthly"],
        "documents_used": usage.documents_used if usage else 0,
        "stripe_customer_id": sub.stripe_customer_id,
        "stripe_subscription_id": sub.stripe_subscription_id,
    }

def track_ai_query(db, user_id):
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        return {"allowed": False, "reason": "No hay suscripcion activa"}
    plan = PLANS.get(sub.plan_id, {})
    limit = plan.get("ai_queries_monthly", 0)
    now = datetime.utcnow()
    usage = db.query(UsageTracking).filter(
        UsageTracking.subscription_id == sub.id,
        UsageTracking.period_start <= now,
        UsageTracking.period_end >= now
    ).first()
    if not usage:
        period_start = sub.current_period_start or now.replace(day=1)
        period_end = sub.current_period_end or (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        usage = UsageTracking(subscription_id=sub.id, user_id=user_id, period_start=period_start, period_end=period_end)
        db.add(usage)
    if limit < 99999 and usage.ai_queries_used >= limit:
        return {"allowed": False, "reason": f"Limite de {limit} consultas IA/mes alcanzado. Actualiza tu plan."}
    usage.ai_queries_used += 1
    db.commit()
    remaining = limit - usage.ai_queries_used if limit < 99999 else 99999
    return {"allowed": True, "used": usage.ai_queries_used, "limit": limit, "remaining": remaining}


def create_vera_plus_checkout(db, user_id, email, name, company_id):
    """
    Checkout para Vera Plus (€19/mes). Sigue el mismo patrón que create_subscription_checkout
    pero con producto Vera Plus y guarda company_id en metadata para activar al pagar.
    """
    customer_id = get_or_create_customer(email, name, user_id)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{**_price_selector("vera_plus", _user_country(db, user_id)), "quantity": 1}],
        subscription_data={
            "metadata": {
                "vela_user_id": str(user_id),
                "vela_company_id": str(company_id),
                "product": "vera_plus",
            }
        },
        metadata={
            "vela_user_id": str(user_id),
            "vela_company_id": str(company_id),
            "product": "vera_plus",
            "type": "vera_plus_subscription",
        },
        success_url=f"{settings.FRONTEND_URL}/vera-plus?success=1",
        cancel_url=f"{settings.FRONTEND_URL}/vera-plus?canceled=1",
        locale="es",
        allow_promotion_codes=True,
    )
    return {"checkout_url": session.url, "session_id": session.id}


def activate_vera_plus(db, company_id, stripe_subscription_id):
    """Activa Vera Plus para una empresa (companies.plan = 'plus')."""
    from sqlalchemy import text
    from core.security import set_tenant_context
    # companies está RLS'd por id; el webhook es pre-tenant (sin GUC) → sin esto el
    # UPDATE afectaría 0 filas en silencio (cliente paga y nunca recibe Vera Plus).
    set_tenant_context(db, company_id)
    db.execute(text(
        "UPDATE companies SET plan = 'plus', vera_plus_subscription_id = :sub WHERE id = :cid"
    ), {"cid": company_id, "sub": stripe_subscription_id})

    # Audit
    try:
        db.execute(text("""
            INSERT INTO vera_network_audit (
                user_id, user_email, endpoint, action, question,
                response_preview, model_used
            ) VALUES (
                0, 'stripe-webhook', '/stripe-webhook', 'vera_plus_activated',
                :q, :preview, 'stripe'
            )
        """), {
            "q": f"company_id={company_id}",
            "preview": f"Activación automática vía Stripe (sub={stripe_subscription_id})",
        })
    except Exception as e:
        print(f"[audit] {e}")

    db.commit()


def deactivate_vera_plus(db, company_id):
    """Desactiva Vera Plus (cuando cancela suscripción)."""
    from sqlalchemy import text
    from core.security import set_tenant_context
    # companies RLS'd por id; sin GUC el UPDATE afecta 0 filas → la empresa conservaría
    # plan='plus' tras cancelar (fuga de entitlement).
    set_tenant_context(db, company_id)
    db.execute(text(
        "UPDATE companies SET plan = 'base', vera_plus_subscription_id = NULL WHERE id = :cid"
    ), {"cid": company_id})
    db.commit()
