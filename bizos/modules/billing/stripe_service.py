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
}

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
    customer = stripe.Customer.create(email=email, name=name, metadata={"vortu_user_id": str(user_id)})
    return customer.id

def create_subscription_checkout(db, user_id, email, name, plan_id):
    """
    Flujo: primero cobra la licencia unica (mode=payment).
    Al completar, el webhook activa la suscripcion con primer mes gratis.
    Si ya tiene licencia del mismo plan, va directo a suscripcion.
    """
    customer_id = get_or_create_customer(email, name, user_id)
    lic = db.query(License).filter(License.user_id == user_id).first()
    already_has_license = lic and lic.status == "paid" and lic.plan_id == plan_id

    if already_has_license:
        # Ya tiene licencia — solo cobra la suscripcion, primer mes gratis
        # El trial empieza SOLO cuando completa el checkout, no antes
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": STRIPE_PRICES[plan_id], "quantity": 1}],
            subscription_data={
                "trial_period_days": 30,
                "metadata": {"vortu_user_id": str(user_id), "plan_id": plan_id}
            },
            metadata={"vortu_user_id": str(user_id), "plan_id": plan_id, "type": "subscription_only"},
            success_url=f"{settings.FRONTEND_URL}/settings?tab=subscription&success=license",
            cancel_url=f"{settings.FRONTEND_URL}/settings?tab=billing",
            locale="es",
            allow_promotion_codes=True,
            payment_method_collection="always",
        )
    else:
        # Primero cobra la licencia unica
        # Al completar el webhook activa la sub con 30 dias gratis
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="payment",
            line_items=[{"price": STRIPE_LICENSE_PRICES[plan_id], "quantity": 1}],
            metadata={"vortu_user_id": str(user_id), "plan_id": plan_id, "type": "license_then_subscribe"},
            success_url=f"{settings.FRONTEND_URL}/settings?tab=subscription&success=license",
            cancel_url=f"{settings.FRONTEND_URL}/settings?tab=billing",
            locale="es",
            invoice_creation={"enabled": True},
        )
    return {"checkout_url": session.url, "session_id": session.id}

def create_upgrade_checkout(db, user_id, email, name, new_plan_id):
    """
    Upgrade inteligente:
    - Licencia: cobra solo la diferencia (nuevo - viejo)
    - Sub: si ya pago este mes → prorratea. Si no → cobra precio completo nuevo plan
    Downgrade: no cobra licencia, solo cambia sub al siguiente ciclo
    """
    customer_id = get_or_create_customer(email, name, user_id)
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    lic = db.query(License).filter(License.user_id == user_id).first()

    current_plan_id = sub.plan_id if sub else "starter"
    current_license_price = LICENSE_PRICES_EUR.get(current_plan_id, 0)
    new_license_price = LICENSE_PRICES_EUR.get(new_plan_id, 0)
    license_diff = max(0, new_license_price - current_license_price)
    is_downgrade = new_license_price < current_license_price

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
                    items=[{"id": current_item["id"], "price": STRIPE_PRICES[new_plan_id]}],
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

            # Cambiar sub con prorrateo si ya pago este mes
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                items=[{"id": current_item["id"], "price": STRIPE_PRICES[new_plan_id]}],
                proration_behavior="create_prorations",
            )
            sub.plan_id = new_plan_id
            db.commit()

            # Si hay diferencia de licencia, cobrarla en checkout separado
            if license_diff > 0 and lic and lic.status == "paid":
                diff_price = stripe.Price.create(
                    unit_amount=int(license_diff * 100),
                    currency="eur",
                    product_data={"name": f"Actualizacion licencia {current_plan_id.capitalize()} a {new_plan_id.capitalize()}"},
                )
                session = stripe.checkout.Session.create(
                    customer=customer_id,
                    mode="payment",
                    line_items=[{"price": diff_price.id, "quantity": 1}],
                    metadata={"vortu_user_id": str(user_id), "plan_id": new_plan_id, "type": "license_upgrade"},
                    success_url=f"{settings.FRONTEND_URL}/settings?tab=subscription&success=license",
                    cancel_url=f"{settings.FRONTEND_URL}/settings?tab=billing",
                    locale="es",
                )
                if lic:
                    lic.plan_id = new_plan_id
                    lic.amount_paid = new_license_price
                    db.commit()
                return {"checkout_url": session.url, "upgraded": True,
                        "license_diff": license_diff,
                        "message": f"Suscripcion actualizada. Solo pagas la diferencia de licencia: {license_diff}EUR"}

            # Sin diferencia de licencia — upgrade gratis de licencia
            if lic:
                lic.plan_id = new_plan_id
                lic.amount_paid = new_license_price
                db.commit()
            return {"checkout_url": None, "upgraded": True,
                    "message": "Plan actualizado. La diferencia se aplicara en tu proxima factura."}

        except Exception as e:
            print(f"Error upgrade Stripe: {e}")

    # Sin sub activa — checkout normal con licencia nueva
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
        stripe.Subscription.modify(subscription_id, items=[{"price": STRIPE_PRICES["extra_user"], "quantity": quantity}])
    db_sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if db_sub:
        db_sub.extra_users = max(0, db_sub.extra_users + quantity)
        db.commit()
    return {"success": True}

def handle_webhook(db, payload, sig_header):
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        return {"error": str(e)}
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
            _handle_checkout_completed(db, obj)
        elif event["type"] == "customer.subscription.updated":
            _handle_subscription_updated(db, obj)
        elif event["type"] == "customer.subscription.deleted":
            _handle_subscription_deleted(db, obj)
        elif event["type"] == "invoice.payment_failed":
            _handle_payment_failed(db, obj)
        elif event["type"] == "invoice.payment_succeeded":
            _handle_payment_succeeded(db, obj)
        billing_event.processed = True
    except Exception as e:
        import traceback
        print(f"Webhook error [{event['type']}]: {e}")
        traceback.print_exc()
    db.commit()
    return {"status": "processed"}

def _stripe_to_dict(obj):
    if isinstance(obj, dict):
        return obj
    if isinstance(obj, str):
        try:
            return json.loads(obj)
        except Exception:
            return {}
    try:
        return json.loads(obj.to_json())
    except Exception:
        pass
    try:
        return json.loads(json.dumps(obj, default=lambda o: o._raw_response if hasattr(o, '_raw_response') else dict(o) if hasattr(o, 'keys') else str(o)))
    except Exception:
        return {}

def _handle_checkout_completed(db, session):
    session = _stripe_to_dict(session)
    meta = session.get("metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    user_id = int(meta.get("vortu_user_id", 0))
    plan_id = meta.get("plan_id", "starter")
    checkout_type = meta.get("type", "subscription")
    if not user_id:
        return

    if checkout_type in ("license_and_subscription", "subscription_only"):
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
                metadata={"vortu_user_id": str(user_id), "plan_id": plan_id},
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
    user_id = int(meta.get("vortu_user_id", 0))
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
    meta = stripe_sub.get("metadata", {})
    user_id = int(meta.get("vortu_user_id", 0))
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
        "modules": plan["modules"] if has_access else ["dashboard"],
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
