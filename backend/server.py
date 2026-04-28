from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, bcrypt, jwt, httpx, re, razorpay, asyncio
import google.generativeai as genai
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date as date_cls

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'nutriai')
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_for_local_dev')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("backend_errors.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

if not mongo_url:
    print("WARNING: MONGO_URL not found in environment variables")
    # Fallback to localhost if needed, or handle appropriately
    mongo_url = "mongodb://localhost:27017"

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="NutriAI API")

# CORS Configuration
raw_cors = os.environ.get("CORS_ORIGINS", "")
cors_list = [o.strip().rstrip("/") for o in raw_cors.split(",") if o.strip()]
is_wildcard = not cors_list or "*" in cors_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_wildcard else cors_list,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

@app.get("/health")
async def health_check():
    health_info = {
        "status": "ok",
        "message": "NutriAI API is running",
        "env": {
            "mongo_url_set": bool(os.environ.get('MONGO_URL')),
            "db_name": db_name,
            "jwt_secret_set": bool(os.environ.get('JWT_SECRET')),
            "cors_origins": raw_cors
        }
    }
    try:
        # Check DB connection with a short timeout
        await asyncio.wait_for(client.admin.command('ping'), timeout=2.0)
        health_info["db"] = "connected"
        return health_info
    except Exception as e:
        health_info["status"] = "warning"
        health_info["db"] = "disconnected"
        health_info["error"] = str(e)
        return health_info

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY and GEMINI_API_KEY != 'your_gemini_key_here':
    genai.configure(api_key=GEMINI_API_KEY)


# ===================== MODELS =====================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    token: str
    user: Dict[str, Any]

class OnboardingIn(BaseModel):
    dob: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    current_weight_kg: Optional[float] = None
    target_weight_kg: Optional[float] = None
    goal: Optional[str] = None  # lose_weight, maintain, gain_muscle
    diet_type: Optional[str] = None  # balanced, keto, vegan, vegetarian, mediterranean
    allergies: List[str] = []
    disliked_ingredients: List[str] = []
    cuisine: Optional[str] = None
    activity_level: Optional[str] = None  # sedentary, light, moderate, active, very_active
    meals_per_day: int = 3

class MealLogIn(BaseModel):
    meal_type: str  # breakfast, lunch, dinner, snack
    name: str
    calories: float
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    servings: float = 1
    source: str = "manual"  # manual, barcode, ai, search
    barcode: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD, default today

class WeightLogIn(BaseModel):
    weight_kg: float
    date: Optional[str] = None


# ===================== HELPERS =====================
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()

def sanitize_user(u: Dict[str, Any]) -> Dict[str, Any]:
    u.pop("_id", None)
    u.pop("password_hash", None)
    return u

def calc_bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    # Mifflin-St Jeor
    if gender == "female":
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5

def calc_calorie_target(user: Dict[str, Any]) -> int:
    try:
        weight = user.get("current_weight_kg") or 70
        height = user.get("height_cm") or 170
        dob = user.get("dob")
        if dob:
            age = (datetime.now().date() - datetime.fromisoformat(dob).date()).days // 365
        else:
            age = 30
        gender = user.get("gender") or "male"
        bmr = calc_bmr(weight, height, age, gender)
        multipliers = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "active": 1.725, "very_active": 1.9}
        tdee = bmr * multipliers.get(user.get("activity_level") or "moderate", 1.55)
        goal = user.get("goal") or "maintain"
        if goal == "lose_weight":
            tdee -= 500
        elif goal == "gain_muscle":
            tdee += 300
        return int(round(tdee))
    except Exception:
        return 2000


# ===================== AUTH =====================
@api_router.post("/auth/register", response_model=TokenOut)
async def register(data: RegisterIn):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "onboarded": False,
        "xp": 0,
        "level": 1,
        "streak_current": 0,
        "streak_best": 0,
        "calories_target": 2000,
        "protein_target_g": 120,
        "carbs_target_g": 230,
        "fat_target_g": 65,
        "allergies": [],
        "disliked_ingredients": [],
        "meals_per_day": 3,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user.copy())
    return {"token": make_token(user_id), "user": sanitize_user(user)}

@api_router.post("/auth/login", response_model=TokenOut)
async def login(data: LoginIn):
    u = await db.users.find_one({"email": data.email.lower()})
    if not u or not verify_password(data.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": make_token(u["id"]), "user": sanitize_user(u)}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ===================== ONBOARDING / PROFILE =====================
@api_router.post("/profile/onboarding")
async def save_onboarding(data: OnboardingIn, user=Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    merged = {**user, **update}
    update["calories_target"] = calc_calorie_target(merged)
    # macros: 30/45/25 default
    ct = update["calories_target"]
    update["protein_target_g"] = int(ct * 0.30 / 4)
    update["carbs_target_g"] = int(ct * 0.45 / 4)
    update["fat_target_g"] = int(ct * 0.25 / 9)
    update["onboarded"] = True
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.patch("/profile")
async def update_profile(data: OnboardingIn, user=Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if any(k in update for k in ["current_weight_kg", "height_cm", "dob", "gender", "activity_level", "goal"]):
        merged = {**user, **update}
        update["calories_target"] = calc_calorie_target(merged)
        ct = update["calories_target"]
        update["protein_target_g"] = int(ct * 0.30 / 4)
        update["carbs_target_g"] = int(ct * 0.45 / 4)
        update["fat_target_g"] = int(ct * 0.25 / 9)
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


# ===================== FOOD SEARCH / BARCODE =====================
# Built-in starter food DB (common items with per-serving nutrition)
FOOD_DB = [
    # Grains & Bread
    {"name": "Oatmeal (1 cup cooked)", "calories": 158, "protein_g": 6, "carbs_g": 27, "fat_g": 3, "fiber_g": 4},
    {"name": "Brown Rice (1 cup cooked)", "calories": 216, "protein_g": 5, "carbs_g": 45, "fat_g": 1.8, "fiber_g": 3.5},
    {"name": "White Rice (1 cup cooked)", "calories": 206, "protein_g": 4.3, "carbs_g": 45, "fat_g": 0.4, "fiber_g": 0.6},
    {"name": "Quinoa (1 cup cooked)", "calories": 222, "protein_g": 8, "carbs_g": 39, "fat_g": 3.6, "fiber_g": 5},
    {"name": "Pasta, cooked (1 cup)", "calories": 220, "protein_g": 8, "carbs_g": 43, "fat_g": 1.3, "fiber_g": 2.5},
    {"name": "Whole Wheat Bread (1 slice)", "calories": 81, "protein_g": 4, "carbs_g": 14, "fat_g": 1.1, "fiber_g": 1.9},
    {"name": "White Bread (1 slice)", "calories": 79, "protein_g": 2.7, "carbs_g": 15, "fat_g": 1, "fiber_g": 0.6},
    {"name": "Chapati / Roti (1 medium)", "calories": 104, "protein_g": 3.1, "carbs_g": 18, "fat_g": 2.5, "fiber_g": 1.9},
    {"name": "Bagel, plain (1 medium)", "calories": 245, "protein_g": 9.5, "carbs_g": 48, "fat_g": 1.5, "fiber_g": 2},
    {"name": "Cornflakes (1 cup)", "calories": 101, "protein_g": 2, "carbs_g": 24, "fat_g": 0.2, "fiber_g": 1},
    # Protein
    {"name": "Chicken Breast, grilled (100g)", "calories": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 3.6, "fiber_g": 0},
    {"name": "Chicken Thigh, cooked (100g)", "calories": 209, "protein_g": 26, "carbs_g": 0, "fat_g": 11, "fiber_g": 0},
    {"name": "Salmon, cooked (100g)", "calories": 208, "protein_g": 22, "carbs_g": 0, "fat_g": 13, "fiber_g": 0},
    {"name": "Tuna, canned in water (100g)", "calories": 116, "protein_g": 26, "carbs_g": 0, "fat_g": 1, "fiber_g": 0},
    {"name": "Egg, large boiled", "calories": 78, "protein_g": 6.3, "carbs_g": 0.6, "fat_g": 5.3, "fiber_g": 0},
    {"name": "Egg White (1 large)", "calories": 17, "protein_g": 3.6, "carbs_g": 0.2, "fat_g": 0.1, "fiber_g": 0},
    {"name": "Tofu, firm (100g)", "calories": 144, "protein_g": 17, "carbs_g": 3, "fat_g": 9, "fiber_g": 2},
    {"name": "Lentils, cooked (1 cup)", "calories": 230, "protein_g": 18, "carbs_g": 40, "fat_g": 0.8, "fiber_g": 16},
    {"name": "Chickpeas, cooked (1 cup)", "calories": 269, "protein_g": 15, "carbs_g": 45, "fat_g": 4.3, "fiber_g": 12.5},
    {"name": "Black Beans, cooked (1 cup)", "calories": 227, "protein_g": 15.2, "carbs_g": 41, "fat_g": 0.9, "fiber_g": 15},
    {"name": "Whey Protein (1 scoop)", "calories": 120, "protein_g": 24, "carbs_g": 3, "fat_g": 1.5, "fiber_g": 0},
    {"name": "Ground Beef, cooked (100g)", "calories": 254, "protein_g": 26, "carbs_g": 0, "fat_g": 17, "fiber_g": 0},
    {"name": "Shrimp, cooked (100g)", "calories": 99, "protein_g": 24, "carbs_g": 0.2, "fat_g": 0.3, "fiber_g": 0},
    # Dairy
    {"name": "Greek Yogurt, plain (170g)", "calories": 100, "protein_g": 17, "carbs_g": 6, "fat_g": 0.7, "fiber_g": 0},
    {"name": "Milk, whole (1 cup)", "calories": 149, "protein_g": 8, "carbs_g": 12, "fat_g": 8, "fiber_g": 0},
    {"name": "Milk, skim (1 cup)", "calories": 83, "protein_g": 8.3, "carbs_g": 12.2, "fat_g": 0.2, "fiber_g": 0},
    {"name": "Cheddar Cheese (28g)", "calories": 113, "protein_g": 7, "carbs_g": 0.4, "fat_g": 9, "fiber_g": 0},
    {"name": "Cottage Cheese, low-fat (1 cup)", "calories": 163, "protein_g": 28, "carbs_g": 6, "fat_g": 2.3, "fiber_g": 0},
    {"name": "Butter (1 tbsp)", "calories": 102, "protein_g": 0.1, "carbs_g": 0, "fat_g": 11.5, "fiber_g": 0},
    # Fruits
    {"name": "Banana (medium)", "calories": 105, "protein_g": 1.3, "carbs_g": 27, "fat_g": 0.4, "fiber_g": 3.1},
    {"name": "Apple (medium)", "calories": 95, "protein_g": 0.5, "carbs_g": 25, "fat_g": 0.3, "fiber_g": 4.4},
    {"name": "Orange (medium)", "calories": 62, "protein_g": 1.2, "carbs_g": 15.4, "fat_g": 0.2, "fiber_g": 3.1},
    {"name": "Mango (1 cup sliced)", "calories": 99, "protein_g": 1.4, "carbs_g": 25, "fat_g": 0.6, "fiber_g": 2.6},
    {"name": "Blueberries (1 cup)", "calories": 84, "protein_g": 1.1, "carbs_g": 21, "fat_g": 0.5, "fiber_g": 3.6},
    {"name": "Strawberries (1 cup)", "calories": 49, "protein_g": 1, "carbs_g": 11.7, "fat_g": 0.5, "fiber_g": 3},
    {"name": "Grapes (1 cup)", "calories": 104, "protein_g": 1.1, "carbs_g": 27, "fat_g": 0.2, "fiber_g": 1.4},
    {"name": "Watermelon (1 cup)", "calories": 46, "protein_g": 0.9, "carbs_g": 11.5, "fat_g": 0.2, "fiber_g": 0.6},
    # Vegetables
    {"name": "Broccoli, steamed (1 cup)", "calories": 55, "protein_g": 3.7, "carbs_g": 11, "fat_g": 0.6, "fiber_g": 5.1},
    {"name": "Spinach, raw (1 cup)", "calories": 7, "protein_g": 0.9, "carbs_g": 1.1, "fat_g": 0.1, "fiber_g": 0.7},
    {"name": "Sweet Potato, baked (1 medium)", "calories": 103, "protein_g": 2.3, "carbs_g": 24, "fat_g": 0.2, "fiber_g": 3.8},
    {"name": "Avocado (half)", "calories": 160, "protein_g": 2, "carbs_g": 9, "fat_g": 15, "fiber_g": 7},
    {"name": "Carrot (1 medium)", "calories": 25, "protein_g": 0.6, "carbs_g": 6, "fat_g": 0.1, "fiber_g": 1.7},
    {"name": "Tomato (1 medium)", "calories": 22, "protein_g": 1.1, "carbs_g": 4.8, "fat_g": 0.2, "fiber_g": 1.5},
    {"name": "Cucumber (1 cup sliced)", "calories": 16, "protein_g": 0.7, "carbs_g": 3.8, "fat_g": 0.1, "fiber_g": 0.5},
    {"name": "Kale, raw (1 cup)", "calories": 33, "protein_g": 2.9, "carbs_g": 6, "fat_g": 0.6, "fiber_g": 1.3},
    {"name": "Onion (1 medium)", "calories": 44, "protein_g": 1.2, "carbs_g": 10.3, "fat_g": 0.1, "fiber_g": 1.9},
    # Fats & Nuts
    {"name": "Almonds (28g / 1 oz)", "calories": 164, "protein_g": 6, "carbs_g": 6, "fat_g": 14, "fiber_g": 3.5},
    {"name": "Peanut Butter (2 tbsp)", "calories": 188, "protein_g": 8, "carbs_g": 6, "fat_g": 16, "fiber_g": 2},
    {"name": "Olive Oil (1 tbsp)", "calories": 119, "protein_g": 0, "carbs_g": 0, "fat_g": 13.5, "fiber_g": 0},
    {"name": "Walnuts (28g)", "calories": 185, "protein_g": 4.3, "carbs_g": 3.9, "fat_g": 18.5, "fiber_g": 1.9},
    {"name": "Cashews (28g)", "calories": 157, "protein_g": 5.2, "carbs_g": 8.6, "fat_g": 12.4, "fiber_g": 0.9},
    # Drinks
    {"name": "Green Tea (1 cup)", "calories": 2, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0},
    {"name": "Coffee, black (1 cup)", "calories": 2, "protein_g": 0.3, "carbs_g": 0, "fat_g": 0, "fiber_g": 0},
    {"name": "Orange Juice (1 cup)", "calories": 112, "protein_g": 1.7, "carbs_g": 26, "fat_g": 0.5, "fiber_g": 0.5},
    # Common meals
    {"name": "Pizza, cheese (1 slice)", "calories": 285, "protein_g": 12, "carbs_g": 36, "fat_g": 10, "fiber_g": 2.3},
    {"name": "Burger, beef with bun", "calories": 354, "protein_g": 20, "carbs_g": 29, "fat_g": 17, "fiber_g": 1.3},
    {"name": "French Fries (medium)", "calories": 365, "protein_g": 3.8, "carbs_g": 48, "fat_g": 17, "fiber_g": 3.8},
    {"name": "Idli (2 pieces)", "calories": 130, "protein_g": 3.4, "carbs_g": 28, "fat_g": 0.4, "fiber_g": 1.3},
    {"name": "Dosa, plain (1 medium)", "calories": 168, "protein_g": 3.9, "carbs_g": 30, "fat_g": 3.7, "fiber_g": 0.8},
    {"name": "Dal, cooked (1 cup)", "calories": 198, "protein_g": 13, "carbs_g": 34, "fat_g": 0.9, "fiber_g": 9},
    {"name": "Paneer (100g)", "calories": 265, "protein_g": 18.3, "carbs_g": 3.4, "fat_g": 20.8, "fiber_g": 0},
    {"name": "Biryani, chicken (1 cup)", "calories": 290, "protein_g": 15, "carbs_g": 38, "fat_g": 8, "fiber_g": 1.5},
    {"name": "Samosa (1 piece)", "calories": 252, "protein_g": 3.5, "carbs_g": 28, "fat_g": 14, "fiber_g": 1.7},
]

def _local_food_search(q: str) -> list:
    """Score and rank local FOOD_DB results."""
    words = q.lower().strip().split()
    scored = []
    for food in FOOD_DB:
        name_lower = food["name"].lower()
        if all(w in name_lower for w in words):
            score = 2 if name_lower.startswith(words[0]) else 1
            scored.append((score, food))
        elif any(w in name_lower for w in words):
            scored.append((0, food))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [f for _, f in scored[:10]]

@api_router.get("/food/search")
async def food_search(q: str, user=Depends(get_current_user)):
    q_lower = q.lower().strip()
    if not q_lower:
        return []

    local_results = _local_food_search(q_lower)

    # If we have enough local results, return immediately
    if len(local_results) >= 3:
        return local_results

    # Fall back to Open Food Facts for a live search
    try:
        async with httpx.AsyncClient(timeout=6) as cl:
            r = await cl.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": q,
                    "search_simple": 1,
                    "action": "process",
                    "json": 1,
                    "page_size": 10,
                    "fields": "product_name,nutriments,serving_size",
                }
            )
            data = r.json()
            remote = []
            for p in data.get("products", []):
                nm = p.get("product_name", "").strip()
                n = p.get("nutriments", {})
                if not nm:
                    continue
                remote.append({
                    "name": nm,
                    "calories": round(n.get("energy-kcal_serving") or n.get("energy-kcal_100g") or 0, 1),
                    "protein_g": round(n.get("proteins_serving") or n.get("proteins_100g") or 0, 1),
                    "carbs_g": round(n.get("carbohydrates_serving") or n.get("carbohydrates_100g") or 0, 1),
                    "fat_g": round(n.get("fat_serving") or n.get("fat_100g") or 0, 1),
                    "fiber_g": round(n.get("fiber_serving") or n.get("fiber_100g") or 0, 1),
                    "source": "openfoodfacts",
                })
            local_names = {x["name"] for x in local_results}
            combined = local_results + [r for r in remote if r["name"] not in local_names]
            return combined[:12]
    except Exception as e:
        logger.warning(f"Open Food Facts fallback failed: {e}")
        return local_results

@api_router.get("/food/barcode/{barcode}")
async def food_barcode(barcode: str, user=Depends(get_current_user)):
    # Open Food Facts lookup
    try:
        async with httpx.AsyncClient(timeout=10) as cl:
            r = await cl.get(f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json")
            data = r.json()
        if data.get("status") != 1:
            raise HTTPException(status_code=404, detail="Product not found")
        p = data["product"]
        n = p.get("nutriments", {})
        return {
            "name": p.get("product_name") or p.get("generic_name") or "Unknown Product",
            "brand": p.get("brands"),
            "barcode": barcode,
            "image_url": p.get("image_front_small_url") or p.get("image_url"),
            "calories": n.get("energy-kcal_100g") or n.get("energy-kcal_serving") or 0,
            "protein_g": n.get("proteins_100g") or 0,
            "carbs_g": n.get("carbohydrates_100g") or 0,
            "fat_g": n.get("fat_100g") or 0,
            "fiber_g": n.get("fiber_100g") or 0,
            "serving_size": p.get("serving_size") or "100g",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"barcode lookup failed: {e}")
        raise HTTPException(status_code=502, detail="Barcode service unavailable")


# ===================== NUTRITION LOGS =====================
@api_router.post("/logs")
async def log_meal(data: MealLogIn, user=Depends(get_current_user)):
    log_date = data.date or today_iso()
    s = data.servings or 1
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": log_date,
        "meal_type": data.meal_type,
        "name": data.name,
        "calories": data.calories * s,
        "protein_g": data.protein_g * s,
        "carbs_g": data.carbs_g * s,
        "fat_g": data.fat_g * s,
        "fiber_g": data.fiber_g * s,
        "servings": s,
        "source": data.source,
        "barcode": data.barcode,
        "logged_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.logs.insert_one(doc.copy())

    # Update streak & XP
    await _update_streak_and_xp(user["id"], log_date)

    doc.pop("_id", None)
    return doc

@api_router.get("/logs/today")
async def logs_today(user=Depends(get_current_user)):
    d = today_iso()
    logs = await db.logs.find({"user_id": user["id"], "date": d}, {"_id": 0}).to_list(500)
    totals = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0}
    for l in logs:
        for k in totals:
            totals[k] += l.get(k, 0) or 0
    return {"date": d, "logs": logs, "totals": totals}

@api_router.get("/logs/range")
async def logs_range(days: int = 7, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    logs = await db.logs.find({
        "user_id": user["id"],
        "date": {"$gte": start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(5000)
    # Daily totals
    by_day: Dict[str, Dict[str, float]] = {}
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        by_day[d] = {"date": d, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}
    for l in logs:
        d = l["date"]
        if d in by_day:
            for k in ["calories", "protein_g", "carbs_g", "fat_g"]:
                by_day[d][k] += l.get(k, 0) or 0
    return {"days": list(by_day.values()), "logs": logs}

@api_router.delete("/logs/{log_id}")
async def delete_log(log_id: str, user=Depends(get_current_user)):
    r = await db.logs.delete_one({"id": log_id, "user_id": user["id"]})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


async def _update_streak_and_xp(user_id: str, log_date: str):
    u = await db.users.find_one({"id": user_id})
    if not u:
        return
    last = u.get("last_log_date")
    streak = u.get("streak_current", 0)
    if last == log_date:
        # same day, just XP
        new_streak = streak
    elif last:
        last_d = datetime.fromisoformat(last).date()
        log_d = datetime.fromisoformat(log_date).date()
        if (log_d - last_d).days == 1:
            new_streak = streak + 1
        elif log_d == last_d:
            new_streak = streak
        else:
            new_streak = 1
    else:
        new_streak = 1
    best = max(u.get("streak_best", 0), new_streak)
    new_xp = u.get("xp", 0) + 10
    new_level = 1 + new_xp // 200
    await db.users.update_one({"id": user_id}, {"$set": {
        "streak_current": new_streak, "streak_best": best,
        "xp": new_xp, "level": new_level, "last_log_date": log_date
    }})


# ===================== WEIGHT =====================
@api_router.post("/weight")
async def log_weight(data: WeightLogIn, user=Depends(get_current_user)):
    d = data.date or today_iso()
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "date": d,
           "weight_kg": data.weight_kg, "logged_at": datetime.now(timezone.utc).isoformat()}
    await db.weights.update_one(
        {"user_id": user["id"], "date": d},
        {"$set": doc}, upsert=True,
    )
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_weight_kg": data.weight_kg}})
    doc.pop("_id", None)
    return doc

@api_router.get("/weight")
async def get_weights(days: int = 30, user=Depends(get_current_user)):
    start = (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()
    weights = await db.weights.find(
        {"user_id": user["id"], "date": {"$gte": start}}, {"_id": 0}
    ).sort("date", 1).to_list(500)
    return weights


# ===================== AI MEAL PLAN =====================
def _extract_json(text: str) -> Any:
    # extract first JSON object/array from LLM output
    m = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    candidate = m.group(1) if m else text
    start = min([i for i in [candidate.find('{'), candidate.find('[')] if i >= 0] or [0])
    candidate = candidate[start:]
    # try progressive trim
    for end in range(len(candidate), 0, -1):
        try:
            return json.loads(candidate[:end])
        except Exception:
            continue
    raise ValueError("No JSON found in LLM output")

@api_router.post("/food/analyze-image")
async def analyze_food_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not GEMINI_API_KEY or GEMINI_API_KEY == 'your_gemini_key_here':
        # Mock response for testing if no key is provided
        logger.info("Using mock AI response since GEMINI_API_KEY is not set.")
        import asyncio
        await asyncio.sleep(1.5)
        return {
            "name": "Mock Avocado Toast",
            "calories": 250,
            "protein_g": 6,
            "carbs_g": 20,
            "fat_g": 15,
            "fiber_g": 8,
            "serving_size": "1 slice"
        }
    try:
        contents = await file.read()
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = """
        Analyze this image of food or a nutrition label. 
        Identify the food item and estimate its nutritional value per standard serving.
        Return ONLY a raw JSON object (no markdown formatting, no code blocks) with the following keys:
        "name": string (the identified food),
        "calories": number (estimated calories),
        "protein_g": number (estimated protein in grams),
        "carbs_g": number (estimated carbohydrates in grams),
        "fat_g": number (estimated fat in grams),
        "fiber_g": number (estimated fiber in grams),
        "serving_size": string (the assumed serving size).
        If you cannot identify the food, return reasonable defaults or 0s.
        """
        image_part = {
            "mime_type": file.content_type,
            "data": contents
        }
        response = model.generate_content([prompt, image_part])
        data = _extract_json(response.text)
        return data
    except Exception as e:
        logger.error(f"Image analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(e)}")


@api_router.post("/meal-plan/generate")
async def generate_meal_plan(user=Depends(get_current_user)):
    try:
        import google.generativeai as genai
        
        tgt_cal = user.get('calories_target', 2000)
        tgt_pro = user.get('protein_target_g', 120)
        tgt_carb = user.get('carbs_target_g', 230)
        tgt_fat = user.get('fat_target_g', 65)
        
        prompt = f"""
        Generate a 7-day meal plan for a person with the following daily targets:
        Calories: {tgt_cal} kcal
        Protein: {tgt_pro}g
        Carbs: {tgt_carb}g
        Fat: {tgt_fat}g
        
        Return ONLY valid JSON in the following format:
        {{
            "days": [
                {{
                    "day": 1,
                    "label": "Monday",
                    "total_calories": 2000,
                    "meals": [
                        {{
                            "meal_type": "breakfast", 
                            "name": "Meal Name", 
                            "description": "Short desc.", 
                            "calories": 500, "protein_g": 30, "carbs_g": 50, "fat_g": 20, 
                            "ingredients": ["ing1", "ing2"],
                            "image_keyword": "pancakes"
                        }}
                    ]
                }}
            ]
        }}
        Make sure the daily totals match the targets closely.
        Provide a unique, relevant, 1-2 word `image_keyword` for each meal.
        """
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        plan = _extract_json(response.text)
        
        # Add image url to each meal
        for day in plan.get("days", []):
            for meal in day.get("meals", []):
                if "image_keyword" in meal:
                    kw = meal["image_keyword"].replace(" ", ",")
                    meal["image_url"] = f"https://loremflickr.com/400/300/{kw},food/all"
    except Exception as e:
        logger.error(f"Meal plan gen failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI meal plan generation failed: {str(e)[:200]}")

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "period": "weekly",
        "start_date": today_iso(),
        "plan_json": plan,
        "generated_by": "ai",
        "ai_model_version": "gemini-2.5-flash",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.diet_plans.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.get("/meal-plan/current")
async def current_plan(user=Depends(get_current_user)):
    plan = await db.diet_plans.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if not plan:
        return None
    return plan


# ===================== AI INSIGHTS =====================
@api_router.post("/insights/generate")
async def generate_insights(user=Depends(get_current_user)):
    # gather 7-day summary
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=6)
    logs = await db.logs.find({
        "user_id": user["id"],
        "date": {"$gte": start.isoformat(), "$lte": today.isoformat()}
    }, {"_id": 0}).to_list(5000)

    if not logs:
        return {"tips": [
            "Start logging your meals to unlock personalized insights.",
            f"Aim for roughly {user.get('calories_target', 2000)} kcal per day to match your goal.",
            "Pro tip: prep 2-3 go-to breakfasts this week to make logging effortless."
        ]}

    totals = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}
    for l in logs:
        for k in totals:
            totals[k] += l.get(k, 0) or 0
    days = max(1, len({l["date"] for l in logs}))
    avg = {k: round(v / days, 1) for k, v in totals.items()}

    try:
        import asyncio
        await asyncio.sleep(1.0) # simulate thinking
        tips = [
            f"Your average intake is {avg['calories']} kcal. Target: {user.get('calories_target', 2000)}.",
            f"Protein avg {avg['protein_g']}g — aim for {user.get('protein_target_g', 120)}g for your goal.",
            "Consistency beats perfection — keep logging even on lighter days."
        ]
    except Exception as e:
        logger.error(f"insights gen failed: {e}")
        tips = [
            f"Your average intake is {avg['calories']} kcal. Target: {user.get('calories_target', 2000)}.",
            f"Protein avg {avg['protein_g']}g — aim for {user.get('protein_target_g', 120)}g for your goal.",
            "Consistency beats perfection — keep logging even on lighter days."
        ]
    doc = {"tips": tips, "generated_at": datetime.now(timezone.utc).isoformat()}
    await db.insights.update_one({"user_id": user["id"]}, {"$set": {"user_id": user["id"], **doc}}, upsert=True)
    return doc

@api_router.get("/insights/latest")
async def latest_insights(user=Depends(get_current_user)):
    d = await db.insights.find_one({"user_id": user["id"]}, {"_id": 0})
    return d or {"tips": []}

# ===================== PAYMENT =====================
class PaymentCreateRequest(BaseModel):
    amount: int  # in INR

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    item_id: str
    item_type: str
    item_name: Optional[str] = None
    item_image: Optional[str] = None
    amount: Optional[int] = None

@api_router.post("/payment/create-order")
async def create_payment_order(req: PaymentCreateRequest, user=Depends(get_current_user)):

    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    
    data = {
        "amount": req.amount * 100,  # Razorpay expects amount in paise
        "currency": "INR",
        "receipt": f"rcpt_{uuid.uuid4().hex[:8]}"
    }
    try:
        order = razorpay_client.order.create(data=data)
        return {
            "order_id": order["id"], 
            "amount": order["amount"], 
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }
    except razorpay.errors.BadRequestError as e:
        logger.error(f"Razorpay BadRequestError: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Razorpay error: {str(e)}")
    except Exception as e:
        logger.error(f"Payment order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during payment initialization")

@api_router.post("/payment/verify")
async def verify_payment(req: PaymentVerifyRequest, user=Depends(get_current_user)):
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        })
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Record payment and create order in DB
    order_doc = {
        "user_id": user["id"],
        "order_id": req.razorpay_order_id,
        "payment_id": req.razorpay_payment_id,
        "item_id": req.item_id,
        "item_type": req.item_type,
        "item_name": req.item_name,
        "item_image": req.item_image,
        "amount": req.amount,
        "status": "confirmed", # Initial status
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one({
        "user_id": user["id"],
        "order_id": req.razorpay_order_id,
        "payment_id": req.razorpay_payment_id,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None) # Remove ObjectId for JSON serialization
    return {"status": "success", "order": order_doc}

@api_router.get("/orders")
async def get_orders(user=Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders


# ===================== MOUNT =====================
app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
