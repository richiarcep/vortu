import stripe
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from core.config import get_settings
from models.billing import License, Subscription, UsageTracking, BillingEvent, PLANS

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

def get_or_create_customer(email, name, user_id):
    existing = stripe.Customer.search(query=f'email:"{email}"', limit=1)
    if existing.data:
        return existing.data[0].id
    customer = stripe.Customer.create(email=email, name=name, metadata={"vortu_user_id": str(user_id)})
    return customer.id

def create_trial_subscription(db, user_id, email, name, plan_id="business"):
    customer_id = get_or_create_customer(email, name, user_id)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        payment_method_collection="always",
        line_items=[{"price": STRIPE_PRICES[plan_id], "quantity": 1}],
        subscription_data={"trial_period_days": 14, "metadata": {"vortu_user_id": str(user_id), "plan_id": plan_id}},
        metadata={"vortu_user_id": str(user_id), "plan_id": plan_id},
        success_url=f"{settings.FRONTEND_URL}/settings?tab=billing&success=trial",
        cancel_url=f"{settings.FRONTEND_URL}/pricing?canceled=1",
        locale="es",
        allow_promotion_codes=True,
    )
    now = datetime.utcnow()
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        sub = Subscription(user_id=user_id)
        db.add(sub)
    sub.plan_id = plan_id
    sub.stripe_customer_id = customer_id
    sub.status = "trialing"
    sub.trial_start = now
    sub.trial_end = now + timedelta(days=14)
    sub.trial_used = True
    db.commit()
    return {"checkout_url": session.url, "session_id": session.id}

def create_license_checkout(db, user_id, email, name, plan_id):
    customer_id = get_or_create_customer(email, name, user_id)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="payment",
        line_items=[{"price": STRIPE_LICENSE_PRICES[plan_id], "quantity": 1}],
        metadata={"vortu_user_id": str(user_id), "plan_id": plan_id, "type": "license"},
        success_url=f"{settings.FRONTEND_URL}/settings?tab=billing&success=license",
        cancel_url=f"{settings.FRONTEND_URL}/settings?tab=billing",
        locale="es",
        invoice_creation={"enabled": True},
    )
    return {"checkout_url": session.url, "session_id": session.id}

def create_subscription_checkout(db, user_id, email, name, plan_id):
    customer_id = get_or_create_customer(email, name, user_id)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": STRIPE_PRICES[plan_id], "quantity": 1}],
        subscription_data={"metadata": {"vortu_user_id": str(user_id), "plan_id": plan_id}},
        metadata={"vortu_user_id": str(user_id), "plan_id": plan_id, "type": "subscription"},
        success_url=f"{settings.FRONTEND_URL}/settings?tab=billing&success=subscription",
        cancel_url=f"{settings.FRONTEND_URL}/settings?tab=billing",
        locale="es",
        allow_promotion_codes=True,
    )
    return {"checkout_url": session.url, "session_id": session.id}

def create_billing_portal(customer_id):
    session = stripe.billing_portal.Session.create(customer=customer_id, return_url=f"{settings.FRONTEND_URL}/settings?tab=billing")
    return session.url

def cancel_subscription(subscription_id, at_period_end=True):
    sub = stripe.Subscription.modify(subscription_id, cancel_at_period_end=at_period_end)
    return {"canceled": True, "cancel_at": sub.get("cancel_at")}

def upgrade_plan(db, user_id, new_plan_id):
    db_sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not db_sub or not db_sub.stripe_subscription_id:
        return {"success": False, "error": "No hay suscripción activa"}
    sub = stripe.Subscription.retrieve(db_sub.stripe_subscription_id)
    current_item = sub["items"]["data"][0]
    stripe.Subscription.modify(db_sub.stripe_subscription_id, items=[{"id": current_item["id"], "price": STRIPE_PRICES[new_plan_id]}], proration_behavior="create_prorations")
    db_sub.plan_id = new_plan_id
    db.commit()
    return {"success": True, "new_plan": new_plan_id}

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
    billing_event = BillingEvent(stripe_event_id=event["id"], event_type=event["type"], data=json.dumps(event["data"], default=str))
    db.add(billing_event)
    try:
        if event["type"] == "checkout.session.completed":
            _handle_checkout_completed(db, event["data"]["object"])
        elif event["type"] == "customer.subscription.updated":
            _handle_subscription_updated(db, event["data"]["object"])
        elif event["type"] == "customer.subscription.deleted":
            _handle_subscription_deleted(db, event["data"]["object"])
        elif event["type"] == "invoice.payment_failed":
            _handle_payment_failed(db, event["data"]["object"])
        elif event["type"] == "invoice.payment_succeeded":
            _handle_payment_succeeded(db, event["data"]["object"])
        billing_event.processed = True
    except Exception as e:
        print(f"Webhook error: {e}")
    db.commit()
    return {"status": "processed"}

def _handle_checkout_completed(db, session):
    meta = session.get("metadata", {})
    user_id = int(meta.get("vortu_user_id", 0))
    plan_id = meta.get("plan_id", "starter")
    checkout_type = meta.get("type", "subscription")
    if not user_id: return
    if checkout_type == "license":
        lic = db.query(License).filter(License.user_id == user_id).first()
        if not lic:
            lic = License(user_id=user_id)
            db.add(lic)
        lic.plan_id = plan_id
        lic.stripe_customer_id = session.get("customer")
        lic.stripe_payment_intent_id = session.get("payment_intent")
        lic.amount_paid = session.get("amount_total", 0) / 100
        lic.status = "paid"
        lic.paid_at = datetime.utcnow()
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if sub: sub.license_paid = True
    else:
        stripe_sub_id = session.get("subscription")
        if stripe_sub_id:
            sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if not sub:
                sub = Subscription(user_id=user_id)
                db.add(sub)
            sub.plan_id = plan_id
            sub.stripe_subscription_id = stripe_sub_id
            sub.stripe_customer_id = session.get("customer")
            sub.status = "trialing" if checkout_type == "trial" else "active"

def _handle_subscription_updated(db, stripe_sub):
    meta = stripe_sub.get("metadata", {})
    user_id = int(meta.get("vortu_user_id", 0))
    if not user_id: return
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        sub.status = stripe_sub["status"]
        if stripe_sub.get("current_period_start"):
            sub.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"])
        if stripe_sub.get("current_period_end"):
            sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
        sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)

def _handle_subscription_deleted(db, stripe_sub):
    meta = stripe_sub.get("metadata", {})
    user_id = int(meta.get("vortu_user_id", 0))
    if not user_id: return
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        sub.status = "canceled"
        sub.canceled_at = datetime.utcnow()

def _handle_payment_failed(db, invoice):
    customer_id = invoice.get("customer")
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if sub: sub.status = "past_due"

def _handle_payment_succeeded(db, invoice):
    customer_id = invoice.get("customer")
    sub = db.query(Subscription).filter(Subscription.stripe_customer_id == customer_id).first()
    if sub and sub.status == "past_due": sub.status = "active"

def track_ai_query(db, user_id):
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub: return {"allowed": False, "reason": "No hay suscripción activa"}
    plan = PLANS.get(sub.plan_id, {})
    limit = plan.get("ai_queries_monthly", 0)
    now = datetime.utcnow()
    usage = db.query(UsageTracking).filter(UsageTracking.subscription_id == sub.id, UsageTracking.period_start <= now, UsageTracking.period_end >= now).first()
    if not usage:
        period_start = sub.current_period_start or now.replace(day=1)
        period_end = sub.current_period_end or (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        usage = UsageTracking(subscription_id=sub.id, user_id=user_id, period_start=period_start, period_end=period_end)
        db.add(usage)
    if limit < 99999 and usage.ai_queries_used >= limit:
        return {"allowed": False, "reason": f"Límite de {limit} consultas IA/mes alcanzado. Actualiza tu plan."}
    usage.ai_queries_used += 1
    db.commit()
    remaining = limit - usage.ai_queries_used if limit < 99999 else 99999
    return {"allowed": True, "used": usage.ai_queries_used, "limit": limit, "remaining": remaining}

def get_subscription_status(db, user_id):
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    lic = db.query(License).filter(License.user_id == user_id).first()
    if not sub:
        return {"plan": "none", "status": "none", "has_access": False, "trial_active": False, "modules": []}
    plan = PLANS.get(sub.plan_id, PLANS["starter"])
    now = datetime.utcnow()
    trial_active = sub.status == "trialing" and sub.trial_end and sub.trial_end > now
    has_access = sub.status in ("trialing", "active") or trial_active
    usage = db.query(UsageTracking).filter(UsageTracking.subscription_id == sub.id, UsageTracking.period_start <= now, UsageTracking.period_end >= now).first()
    return {
        "plan": sub.plan_id,
        "plan_name": plan["name"],
        "status": sub.status,
        "has_access": has_access,
        "trial_active": trial_active,
        "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
        "trial_days_left": (sub.trial_end - now).days if trial_active and sub.trial_end else 0,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "license_paid": lic.status == "paid" if lic else False,
        "modules": plan["modules"],
        "max_users": plan["max_users"] + sub.extra_users,
        "extra_users": sub.extra_users,
        "ai_limit": plan["ai_queries_monthly"],
        "ai_used": usage.ai_queries_used if usage else 0,
        "documents_limit": plan["max_documents_monthly"],
        "documents_used": usage.documents_used if usage else 0,
        "stripe_customer_id": sub.stripe_customer_id,
        "stripe_subscription_id": sub.stripe_subscription_id,
    }
