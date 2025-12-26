from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Depends, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import cloudinary
import cloudinary.uploader
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'demo'),
    api_key=os.getenv('CLOUDINARY_API_KEY', ''),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', '')
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    user_type: str = "client"  # client, creator, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceTier(BaseModel):
    name: str  # Starter, Standard, Premium
    description: str
    price: float
    delivery_days: int
    revisions: int
    features: List[str] = []

class Service(BaseModel):
    service_id: str = Field(default_factory=lambda: f"svc_{uuid.uuid4().hex[:12]}")
    creator_id: str
    title: str
    description: str
    category: str  # video_editing, graphic_design, thumbnails, audio_enhancement, video_creation
    platform: str  # youtube, instagram, tiktok, ads, podcast, general
    tiers: List[ServiceTier]
    portfolio_urls: List[str] = []  # Cloudinary URLs
    thumbnail_url: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active, paused, deleted

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:12]}")
    service_id: str
    creator_id: str
    client_id: str
    tier_name: str
    price: float
    status: str = "pending_payment"  # pending_payment, paid, in_progress, submitted, revision_requested, completed, cancelled
    requirements: str
    delivery_files: List[str] = []  # Cloudinary URLs
    revision_count: int = 0
    max_revisions: int
    notes: List[Dict[str, str]] = []  # [{"from": "client/creator", "message": "...", "timestamp": "..."}]
    payment_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    service_id: str
    order_id: str
    client_id: str
    rating: int  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTransaction(BaseModel):
    payment_id: str = Field(default_factory=lambda: f"pay_{uuid.uuid4().hex[:12]}")
    order_id: str
    session_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "initiated"  # initiated, completed, failed, refunded
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPER ====================

async def get_user_from_session(authorization: Optional[str] = Header(None), session_token: Optional[str] = None) -> Optional[str]:
    """Extract user_id from session_token (cookie or header)"""
    if not authorization and not session_token:
        return None
    
    token = session_token or (authorization.replace('Bearer ', '') if authorization else None)
    if not token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    return session["user_id"]

async def require_auth(authorization: Optional[str] = Header(None)) -> str:
    user_id = await get_user_from_session(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user_id

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(session_id: str = Header(None, alias="X-Session-ID"), response: Response = None):
    """Exchange session_id from Emergent Auth for session_token"""
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid session: {str(e)}")
    
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_obj = User(email=email, name=name, picture=picture)
        user_dict = user_obj.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
        user = user_dict
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_obj = UserSession(
        user_id=user["user_id"],
        session_token=session_token,
        expires_at=expires_at
    )
    session_dict = session_obj.model_dump()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7*24*60*60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )
    
    return {
        "user": user,
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_current_user(user_id: str = Depends(require_auth)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/auth/logout")
async def logout(user_id: str = Depends(require_auth), response: Response = None):
    await db.user_sessions.delete_many({"user_id": user_id})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ==================== SERVICE ROUTES ====================

@api_router.post("/services")
async def create_service(service_data: Dict[str, Any], user_id: str = Depends(require_auth)):
    service_obj = Service(creator_id=user_id, **service_data)
    service_dict = service_obj.model_dump()
    service_dict["created_at"] = service_dict["created_at"].isoformat()
    await db.services.insert_one(service_dict)
    return service_dict

@api_router.get("/services")
async def list_services(
    category: Optional[str] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {"status": "active"}
    if category:
        query["category"] = category
    if platform:
        query["platform"] = platform
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    services = await db.services.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    total = await db.services.count_documents(query)
    return {"services": services, "total": total}

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, updates: Dict[str, Any], user_id: str = Depends(require_auth)):
    service = await db.services.find_one({"service_id": service_id, "creator_id": user_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or unauthorized")
    
    await db.services.update_one({"service_id": service_id}, {"$set": updates})
    return {"message": "Service updated"}

@api_router.get("/creator/services")
async def get_creator_services(user_id: str = Depends(require_auth)):
    services = await db.services.find({"creator_id": user_id}, {"_id": 0}).to_list(length=100)
    return {"services": services}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(order_data: Dict[str, Any], user_id: str = Depends(require_auth)):
    service_id = order_data.get("service_id")
    tier_name = order_data.get("tier_name")
    
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    tier = next((t for t in service["tiers"] if t["name"] == tier_name), None)
    if not tier:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    order_obj = Order(
        service_id=service_id,
        creator_id=service["creator_id"],
        client_id=user_id,
        tier_name=tier_name,
        price=tier["price"],
        requirements=order_data.get("requirements", ""),
        max_revisions=tier["revisions"]
    )
    order_dict = order_obj.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    await db.orders.insert_one(order_dict)
    return order_dict

@api_router.get("/orders")
async def list_orders(user_id: str = Depends(require_auth)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    query = {}
    if user["user_type"] == "creator":
        query["creator_id"] = user_id
    else:
        query["client_id"] = user_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return {"orders": orders}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user_id: str = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["client_id"] != user_id and order["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: Dict[str, str], user_id: str = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only creator can update status")
    
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": status_data["status"]}})
    return {"message": "Status updated"}

@api_router.post("/orders/{order_id}/delivery")
async def submit_delivery(order_id: str, delivery_data: Dict[str, Any], user_id: str = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order or order["creator_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "delivery_files": delivery_data.get("files", []),
            "status": "submitted"
        }}
    )
    return {"message": "Delivery submitted"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/checkout")
async def create_checkout(checkout_data: Dict[str, Any], request: Request, user_id: str = Depends(require_auth)):
    order_id = checkout_data.get("order_id")
    order = await db.orders.find_one({"order_id": order_id, "client_id": user_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Order already paid")
    
    origin = checkout_data.get("origin", "")
    success_url = f"{origin}/order/{order_id}?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/order/{order_id}"
    
    stripe_key = os.getenv('STRIPE_API_KEY')
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=order["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order_id, "user_id": user_id}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    payment_tx = PaymentTransaction(
        order_id=order_id,
        session_id=session.session_id,
        amount=order["price"],
        user_id=user_id,
        payment_status="initiated"
    )
    payment_dict = payment_tx.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    payment_dict["updated_at"] = payment_dict["updated_at"].isoformat()
    await db.payment_transactions.insert_one(payment_dict)
    
    await db.orders.update_one({"order_id": order_id}, {"$set": {"payment_session_id": session.session_id}})
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, user_id: str = Depends(require_auth)):
    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["payment_status"] == "completed":
        return payment
    
    stripe_key = os.getenv('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        if status.payment_status == "paid" and payment["payment_status"] != "completed":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.orders.update_one(
                {"order_id": payment["order_id"]},
                {"$set": {"status": "paid"}}
            )
            payment["payment_status"] = "completed"
        
        return payment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    stripe_signature = request.headers.get("Stripe-Signature")
    
    stripe_key = os.getenv('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        if webhook_response.payment_status == "paid":
            metadata = webhook_response.metadata
            order_id = metadata.get("order_id")
            
            if order_id:
                await db.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {"status": "paid"}}
                )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews")
async def create_review(review_data: Dict[str, Any], user_id: str = Depends(require_auth)):
    order_id = review_data.get("order_id")
    order = await db.orders.find_one({"order_id": order_id, "client_id": user_id}, {"_id": 0})
    
    if not order or order["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed orders")
    
    existing = await db.reviews.find_one({"order_id": order_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_obj = Review(
        service_id=order["service_id"],
        order_id=order_id,
        client_id=user_id,
        rating=review_data["rating"],
        comment=review_data.get("comment", "")
    )
    review_dict = review_obj.model_dump()
    review_dict["created_at"] = review_dict["created_at"].isoformat()
    await db.reviews.insert_one(review_dict)
    
    pipeline = [
        {"$match": {"service_id": order["service_id"]}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(length=1)
    
    if result:
        await db.services.update_one(
            {"service_id": order["service_id"]},
            {"$set": {"rating": round(result[0]["avg_rating"], 1), "review_count": result[0]["count"]}}
        )
    
    return review_dict

@api_router.get("/services/{service_id}/reviews")
async def get_service_reviews(service_id: str, skip: int = 0, limit: int = 10):
    reviews = await db.reviews.find({"service_id": service_id}, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    return {"reviews": reviews}

# ==================== CLOUDINARY UPLOAD ====================

@api_router.post("/upload/signature")
async def get_upload_signature(user_id: str = Depends(require_auth)):
    timestamp = int(datetime.now(timezone.utc).timestamp())
    params = {
        "timestamp": timestamp,
        "folder": f"users/{user_id}"
    }
    
    signature = cloudinary.utils.api_sign_request(params, os.getenv('CLOUDINARY_API_SECRET', ''))
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv('CLOUDINARY_CLOUD_NAME', ''),
        "api_key": os.getenv('CLOUDINARY_API_KEY', '')
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()