"""
Stripe Subscription Module for DocScan Pro
Supports: Plus, Pro, Business tiers with monthly/annual billing
"""
import os
import stripe
from datetime import datetime, timezone
from typing import Optional, Dict, List
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_placeholder')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')

subscription_router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# ── Subscription Tiers Configuration ────────────────────────────────────────

SUBSCRIPTION_TIERS = {
    "plus": {
        "name": "Plus",
        "monthly_price": 499,  # $4.99 in cents
        "annual_price": 4792,  # $47.92 (20% off)
        "trial_days": 7,  # 7-day free trial
        "features": [
            "Unlimited scans",
            "Basic OCR extraction", 
            "5GB cloud storage",
            "Export to PDF, DOCX",
            "Email support",
            "7-day free trial"
        ],
        "limits": {
            "scans_per_day": -1,  # unlimited
            "storage_gb": 5,
            "export_formats": ["pdf", "docx", "txt", "png", "jpeg"]
        }
    },
    "pro": {
        "name": "Pro",
        "monthly_price": 999,  # $9.99 in cents
        "annual_price": 9592,  # $95.92 (20% off)
        "trial_days": 7,  # 7-day free trial
        "features": [
            "Everything in Plus",
            "AI Math Solver",
            "Read Aloud feature",
            "All 18+ export formats",
            "50GB cloud storage",
            "E-signatures",
            "Priority support",
            "7-day free trial"
        ],
        "limits": {
            "scans_per_day": -1,
            "storage_gb": 50,
            "export_formats": "all",
            "math_solver": True,
            "read_aloud": True,
            "e_signatures": True
        },
        "recommended": True
    },
    "business": {
        "name": "Business",
        "monthly_price": 1999,  # $19.99 per user in cents
        "annual_price": 19192,  # $191.92 per user (20% off)
        "per_seat": True,
        "trial_days": 14,  # 14-day free trial for business
        "features": [
            "Everything in Pro",
            "Team collaboration",
            "Admin console",
            "200GB storage per user",
            "Custom branding",
            "API access",
            "Dedicated account manager",
            "99.9% uptime SLA",
            "14-day free trial"
        ],
        "limits": {
            "scans_per_day": -1,
            "storage_gb": 200,
            "export_formats": "all",
            "math_solver": True,
            "read_aloud": True,
            "e_signatures": True,
            "team_features": True,
            "api_access": True
        }
    }
}

# Test mode price IDs (replace with your actual Stripe price IDs)
PRICE_IDS = {
    "plus_monthly": os.environ.get('STRIPE_PRICE_PLUS_MONTHLY', 'price_plus_monthly'),
    "plus_annual": os.environ.get('STRIPE_PRICE_PLUS_ANNUAL', 'price_plus_annual'),
    "pro_monthly": os.environ.get('STRIPE_PRICE_PRO_MONTHLY', 'price_pro_monthly'),
    "pro_annual": os.environ.get('STRIPE_PRICE_PRO_ANNUAL', 'price_pro_annual'),
    "business_monthly": os.environ.get('STRIPE_PRICE_BUSINESS_MONTHLY', 'price_business_monthly'),
    "business_annual": os.environ.get('STRIPE_PRICE_BUSINESS_ANNUAL', 'price_business_annual'),
}

# ── Pydantic Models ────────────────────────────────────────────────────────

class SubscriptionTier(BaseModel):
    id: str
    name: str
    monthly_price: int
    annual_price: int
    features: List[str]
    recommended: bool = False
    per_seat: bool = False

class CreateSubscriptionRequest(BaseModel):
    tier: str  # plus, pro, business
    billing_period: str  # monthly, annual
    seats: int = 1

class UpdateSubscriptionRequest(BaseModel):
    tier: Optional[str] = None
    billing_period: Optional[str] = None
    seats: Optional[int] = None

class SubscriptionResponse(BaseModel):
    subscription_id: str
    tier: str
    billing_period: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    amount: int
    currency: str
    seats: int = 1
    cancel_at_period_end: bool = False

class PaymentSheetResponse(BaseModel):
    payment_intent_client_secret: str
    ephemeral_key_secret: str
    customer_id: str
    publishable_key: str

# ── Helper Functions ────────────────────────────────────────────────────────

def get_db():
    """Get database instance"""
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ.get('DB_NAME', 'docscan')]

async def get_or_create_stripe_customer(user: Dict) -> str:
    """Get or create Stripe customer for user"""
    db = get_db()
    
    if user.get("stripe_customer_id"):
        return user["stripe_customer_id"]
    
    # Create Stripe customer
    customer = stripe.Customer.create(
        email=user["email"],
        name=user.get("name", ""),
        metadata={
            "user_id": user["user_id"],
            "app": "docscan_pro"
        }
    )
    
    # Update user with Stripe customer ID
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"stripe_customer_id": customer.id}}
    )
    
    return customer.id

def get_price_id(tier: str, billing_period: str) -> str:
    """Get Stripe price ID for tier and billing period"""
    key = f"{tier}_{billing_period}"
    price_id = PRICE_IDS.get(key)
    if not price_id:
        raise HTTPException(400, f"Invalid tier or billing period: {tier}/{billing_period}")
    return price_id

# ── Auth Dependency ────────────────────────────────────────────────────────

async def require_auth(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> Dict:
    """Require authenticated user"""
    from auth import verify_jwt_token
    
    token = None
    token = request.cookies.get("access_token")
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
    
    if not token:
        raise HTTPException(401, "Authentication required")
    
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    
    db = get_db()
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    return user

# ── Subscription Endpoints ────────────────────────────────────────────────

@subscription_router.get("/tiers")
async def get_subscription_tiers():
    """Get all available subscription tiers"""
    tiers = []
    for tier_id, tier_data in SUBSCRIPTION_TIERS.items():
        tiers.append({
            "id": tier_id,
            "name": tier_data["name"],
            "monthly_price": tier_data["monthly_price"],
            "annual_price": tier_data["annual_price"],
            "features": tier_data["features"],
            "recommended": tier_data.get("recommended", False),
            "per_seat": tier_data.get("per_seat", False)
        })
    return {"tiers": tiers}

@subscription_router.post("/create-payment-sheet")
async def create_payment_sheet(
    data: CreateSubscriptionRequest,
    user: Dict = Depends(require_auth)
):
    """Create payment sheet for subscription"""
    try:
        customer_id = await get_or_create_stripe_customer(user)
        price_id = get_price_id(data.tier, data.billing_period)
        
        # Get price amount for display
        tier_data = SUBSCRIPTION_TIERS.get(data.tier)
        if not tier_data:
            raise HTTPException(400, "Invalid tier")
        
        amount = tier_data["monthly_price"] if data.billing_period == "monthly" else tier_data["annual_price"]
        if tier_data.get("per_seat"):
            amount *= data.seats
        
        # Create ephemeral key
        ephemeral_key = stripe.EphemeralKey.create(
            customer=customer_id,
            stripe_version="2023-10-16"
        )
        
        # Create setup intent for subscription
        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=["card"],
            metadata={
                "tier": data.tier,
                "billing_period": data.billing_period,
                "seats": str(data.seats)
            }
        )
        
        return {
            "setup_intent_client_secret": setup_intent.client_secret,
            "ephemeral_key_secret": ephemeral_key.secret,
            "customer_id": customer_id,
            "publishable_key": os.environ.get('STRIPE_PUBLISHABLE_KEY', 'pk_test_placeholder'),
            "amount": amount,
            "currency": "usd"
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

@subscription_router.post("/create")
async def create_subscription(
    data: CreateSubscriptionRequest,
    user: Dict = Depends(require_auth)
):
    """Create a new subscription"""
    db = get_db()
    
    # Check for existing active subscription
    existing = await db.subscriptions.find_one({
        "user_id": user["user_id"],
        "status": {"$in": ["active", "trialing"]}
    })
    
    if existing:
        raise HTTPException(400, "You already have an active subscription. Please cancel it first or upgrade.")
    
    try:
        customer_id = await get_or_create_stripe_customer(user)
        price_id = get_price_id(data.tier, data.billing_period)
        
        # Calculate quantity for per-seat pricing
        quantity = data.seats if SUBSCRIPTION_TIERS[data.tier].get("per_seat") else 1
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id, "quantity": quantity}],
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
            metadata={
                "user_id": user["user_id"],
                "tier": data.tier,
                "seats": str(data.seats)
            }
        )
        
        # Store subscription in database
        tier_data = SUBSCRIPTION_TIERS[data.tier]
        amount = tier_data["monthly_price"] if data.billing_period == "monthly" else tier_data["annual_price"]
        
        sub_doc = {
            "user_id": user["user_id"],
            "stripe_subscription_id": subscription.id,
            "stripe_customer_id": customer_id,
            "tier": data.tier,
            "billing_period": data.billing_period,
            "status": subscription.status,
            "seats": data.seats,
            "amount": amount * quantity,
            "currency": "usd",
            "current_period_start": datetime.fromtimestamp(subscription.current_period_start, timezone.utc),
            "current_period_end": datetime.fromtimestamp(subscription.current_period_end, timezone.utc),
            "cancel_at_period_end": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.subscriptions.insert_one(sub_doc)
        
        # Update user's subscription tier
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"subscription_tier": data.tier, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice else None,
            "tier": data.tier,
            "billing_period": data.billing_period
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

@subscription_router.get("/current")
async def get_current_subscription(user: Dict = Depends(require_auth)):
    """Get user's current subscription"""
    db = get_db()
    
    subscription = await db.subscriptions.find_one(
        {"user_id": user["user_id"], "status": {"$in": ["active", "trialing", "past_due"]}},
        {"_id": 0}
    )
    
    if not subscription:
        return {"subscription": None, "tier_limits": get_free_tier_limits()}
    
    tier_data = SUBSCRIPTION_TIERS.get(subscription["tier"], {})
    
    return {
        "subscription": {
            "subscription_id": subscription["stripe_subscription_id"],
            "tier": subscription["tier"],
            "tier_name": tier_data.get("name", subscription["tier"]),
            "billing_period": subscription["billing_period"],
            "status": subscription["status"],
            "seats": subscription.get("seats", 1),
            "amount": subscription["amount"],
            "currency": subscription["currency"],
            "current_period_start": subscription["current_period_start"],
            "current_period_end": subscription["current_period_end"],
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False)
        },
        "tier_limits": tier_data.get("limits", {}),
        "features": tier_data.get("features", [])
    }

def get_free_tier_limits():
    """Get limits for free tier"""
    return {
        "scans_per_day": 5,
        "storage_gb": 0.1,  # 100MB
        "export_formats": ["pdf", "txt"],
        "math_solver": False,
        "read_aloud": False,
        "e_signatures": False
    }

@subscription_router.post("/cancel")
async def cancel_subscription(user: Dict = Depends(require_auth)):
    """Cancel subscription at period end"""
    db = get_db()
    
    subscription = await db.subscriptions.find_one({
        "user_id": user["user_id"],
        "status": {"$in": ["active", "trialing"]}
    })
    
    if not subscription:
        raise HTTPException(404, "No active subscription found")
    
    try:
        # Cancel at period end
        stripe.Subscription.modify(
            subscription["stripe_subscription_id"],
            cancel_at_period_end=True
        )
        
        await db.subscriptions.update_one(
            {"stripe_subscription_id": subscription["stripe_subscription_id"]},
            {"$set": {"cancel_at_period_end": True, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {
            "message": "Subscription will be canceled at the end of the billing period",
            "cancel_at": subscription["current_period_end"]
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

@subscription_router.post("/reactivate")
async def reactivate_subscription(user: Dict = Depends(require_auth)):
    """Reactivate a canceled subscription"""
    db = get_db()
    
    subscription = await db.subscriptions.find_one({
        "user_id": user["user_id"],
        "cancel_at_period_end": True
    })
    
    if not subscription:
        raise HTTPException(404, "No canceled subscription found")
    
    try:
        stripe.Subscription.modify(
            subscription["stripe_subscription_id"],
            cancel_at_period_end=False
        )
        
        await db.subscriptions.update_one(
            {"stripe_subscription_id": subscription["stripe_subscription_id"]},
            {"$set": {"cancel_at_period_end": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Subscription reactivated successfully"}
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

@subscription_router.post("/upgrade")
async def upgrade_subscription(
    data: UpdateSubscriptionRequest,
    user: Dict = Depends(require_auth)
):
    """Upgrade or change subscription"""
    db = get_db()
    
    subscription = await db.subscriptions.find_one({
        "user_id": user["user_id"],
        "status": {"$in": ["active", "trialing"]}
    })
    
    if not subscription:
        raise HTTPException(404, "No active subscription found")
    
    try:
        # Get current subscription from Stripe
        stripe_sub = stripe.Subscription.retrieve(subscription["stripe_subscription_id"])
        
        new_tier = data.tier or subscription["tier"]
        new_billing = data.billing_period or subscription["billing_period"]
        new_seats = data.seats or subscription.get("seats", 1)
        
        price_id = get_price_id(new_tier, new_billing)
        quantity = new_seats if SUBSCRIPTION_TIERS[new_tier].get("per_seat") else 1
        
        # Update subscription
        stripe.Subscription.modify(
            subscription["stripe_subscription_id"],
            items=[{
                "id": stripe_sub["items"]["data"][0].id,
                "price": price_id,
                "quantity": quantity
            }],
            proration_behavior="always_invoice"
        )
        
        # Update database
        tier_data = SUBSCRIPTION_TIERS[new_tier]
        amount = tier_data["monthly_price"] if new_billing == "monthly" else tier_data["annual_price"]
        
        await db.subscriptions.update_one(
            {"stripe_subscription_id": subscription["stripe_subscription_id"]},
            {"$set": {
                "tier": new_tier,
                "billing_period": new_billing,
                "seats": new_seats,
                "amount": amount * quantity,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"subscription_tier": new_tier}}
        )
        
        return {
            "message": "Subscription updated successfully",
            "tier": new_tier,
            "billing_period": new_billing,
            "seats": new_seats
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

@subscription_router.get("/invoices")
async def get_invoices(user: Dict = Depends(require_auth)):
    """Get user's invoice history"""
    if not user.get("stripe_customer_id"):
        return {"invoices": []}
    
    try:
        invoices = stripe.Invoice.list(
            customer=user["stripe_customer_id"],
            limit=20
        )
        
        return {
            "invoices": [{
                "id": inv.id,
                "number": inv.number,
                "amount_due": inv.amount_due,
                "amount_paid": inv.amount_paid,
                "currency": inv.currency,
                "status": inv.status,
                "created": datetime.fromtimestamp(inv.created, timezone.utc),
                "invoice_pdf": inv.invoice_pdf,
                "hosted_invoice_url": inv.hosted_invoice_url
            } for inv in invoices.data]
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

@subscription_router.post("/portal")
async def create_customer_portal(user: Dict = Depends(require_auth)):
    """Create Stripe customer portal session"""
    if not user.get("stripe_customer_id"):
        raise HTTPException(400, "No billing account found")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=user["stripe_customer_id"],
            return_url=f"{BACKEND_URL}/dashboard"
        )
        
        return {"url": session.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(400, str(e))

# ── Webhook Handler ────────────────────────────────────────────────────────

@subscription_router.post("/webhook")
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not STRIPE_WEBHOOK_SECRET:
        # In test mode without webhook secret, just process the event
        event = stripe.Event.construct_from(
            values=await request.json(),
            key=stripe.api_key
        )
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(400, "Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(400, "Invalid signature")
    
    db = get_db()
    event_data = event["data"]["object"]
    
    # Process events
    if event["type"] == "customer.subscription.created":
        await handle_subscription_created(db, event_data)
    elif event["type"] == "customer.subscription.updated":
        await handle_subscription_updated(db, event_data)
    elif event["type"] == "customer.subscription.deleted":
        await handle_subscription_deleted(db, event_data)
    elif event["type"] == "invoice.payment_succeeded":
        await handle_invoice_paid(db, event_data)
    elif event["type"] == "invoice.payment_failed":
        await handle_invoice_failed(db, event_data)
    
    # Log event
    await db.stripe_events.insert_one({
        "event_id": event["id"],
        "type": event["type"],
        "data": event_data,
        "processed_at": datetime.now(timezone.utc)
    })
    
    return {"status": "success"}

async def handle_subscription_created(db, subscription):
    """Handle new subscription"""
    await db.subscriptions.update_one(
        {"stripe_subscription_id": subscription["id"]},
        {"$set": {"status": subscription["status"]}}
    )

async def handle_subscription_updated(db, subscription):
    """Handle subscription update"""
    await db.subscriptions.update_one(
        {"stripe_subscription_id": subscription["id"]},
        {"$set": {
            "status": subscription["status"],
            "current_period_end": datetime.fromtimestamp(subscription["current_period_end"], timezone.utc),
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
            "updated_at": datetime.now(timezone.utc)
        }}
    )

async def handle_subscription_deleted(db, subscription):
    """Handle subscription cancellation"""
    await db.subscriptions.update_one(
        {"stripe_subscription_id": subscription["id"]},
        {"$set": {
            "status": "canceled",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Update user tier
    sub = await db.subscriptions.find_one({"stripe_subscription_id": subscription["id"]})
    if sub:
        await db.users.update_one(
            {"user_id": sub["user_id"]},
            {"$set": {"subscription_tier": None}}
        )

async def handle_invoice_paid(db, invoice):
    """Handle successful payment"""
    if invoice.get("subscription"):
        await db.subscriptions.update_one(
            {"stripe_subscription_id": invoice["subscription"]},
            {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc)}}
        )

async def handle_invoice_failed(db, invoice):
    """Handle failed payment"""
    if invoice.get("subscription"):
        await db.subscriptions.update_one(
            {"stripe_subscription_id": invoice["subscription"]},
            {"$set": {"status": "past_due", "updated_at": datetime.now(timezone.utc)}}
        )

# Export
__all__ = ['subscription_router', 'SUBSCRIPTION_TIERS']
