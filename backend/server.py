from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, bcrypt, jwt, httpx, re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date as date_cls

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

app = FastAPI(title="NutriAI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


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
    {"name": "Oatmeal (1 cup cooked)", "calories": 158, "protein_g": 6, "carbs_g": 27, "fat_g": 3, "fiber_g": 4},
    {"name": "Greek Yogurt, plain (170g)", "calories": 100, "protein_g": 17, "carbs_g": 6, "fat_g": 0.7, "fiber_g": 0},
    {"name": "Banana (medium)", "calories": 105, "protein_g": 1.3, "carbs_g": 27, "fat_g": 0.4, "fiber_g": 3.1},
    {"name": "Apple (medium)", "calories": 95, "protein_g": 0.5, "carbs_g": 25, "fat_g": 0.3, "fiber_g": 4.4},
    {"name": "Chicken Breast, grilled (100g)", "calories": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 3.6, "fiber_g": 0},
    {"name": "Salmon, cooked (100g)", "calories": 208, "protein_g": 22, "carbs_g": 0, "fat_g": 13, "fiber_g": 0},
    {"name": "Brown Rice, cooked (1 cup)", "calories": 216, "protein_g": 5, "carbs_g": 45, "fat_g": 1.8, "fiber_g": 3.5},
    {"name": "Quinoa, cooked (1 cup)", "calories": 222, "protein_g": 8, "carbs_g": 39, "fat_g": 3.6, "fiber_g": 5},
    {"name": "Broccoli, steamed (1 cup)", "calories": 55, "protein_g": 3.7, "carbs_g": 11, "fat_g": 0.6, "fiber_g": 5.1},
    {"name": "Avocado (half)", "calories": 160, "protein_g": 2, "carbs_g": 9, "fat_g": 15, "fiber_g": 7},
    {"name": "Egg, large boiled", "calories": 78, "protein_g": 6.3, "carbs_g": 0.6, "fat_g": 5.3, "fiber_g": 0},
    {"name": "Almonds (28g / 1 oz)", "calories": 164, "protein_g": 6, "carbs_g": 6, "fat_g": 14, "fiber_g": 3.5},
    {"name": "Whole Wheat Bread (1 slice)", "calories": 81, "protein_g": 4, "carbs_g": 14, "fat_g": 1.1, "fiber_g": 1.9},
    {"name": "Peanut Butter (2 tbsp)", "calories": 188, "protein_g": 8, "carbs_g": 6, "fat_g": 16, "fiber_g": 2},
    {"name": "Spinach, raw (1 cup)", "calories": 7, "protein_g": 0.9, "carbs_g": 1.1, "fat_g": 0.1, "fiber_g": 0.7},
    {"name": "Sweet Potato, baked (1 medium)", "calories": 103, "protein_g": 2.3, "carbs_g": 24, "fat_g": 0.2, "fiber_g": 3.8},
    {"name": "Tofu, firm (100g)", "calories": 144, "protein_g": 17, "carbs_g": 3, "fat_g": 9, "fiber_g": 2},
    {"name": "Lentils, cooked (1 cup)", "calories": 230, "protein_g": 18, "carbs_g": 40, "fat_g": 0.8, "fiber_g": 16},
    {"name": "Olive Oil (1 tbsp)", "calories": 119, "protein_g": 0, "carbs_g": 0, "fat_g": 13.5, "fiber_g": 0},
    {"name": "Cheddar Cheese (28g)", "calories": 113, "protein_g": 7, "carbs_g": 0.4, "fat_g": 9, "fiber_g": 0},
    {"name": "Pasta, cooked (1 cup)", "calories": 220, "protein_g": 8, "carbs_g": 43, "fat_g": 1.3, "fiber_g": 2.5},
    {"name": "Green Tea (1 cup)", "calories": 2, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0},
    {"name": "Coffee, black (1 cup)", "calories": 2, "protein_g": 0.3, "carbs_g": 0, "fat_g": 0, "fiber_g": 0},
    {"name": "Whey Protein (1 scoop)", "calories": 120, "protein_g": 24, "carbs_g": 3, "fat_g": 1.5, "fiber_g": 0},
    {"name": "Blueberries (1 cup)", "calories": 84, "protein_g": 1.1, "carbs_g": 21, "fat_g": 0.5, "fiber_g": 3.6},
]

@api_router.get("/food/search")
async def food_search(q: str, user=Depends(get_current_user)):
    q_lower = q.lower().strip()
    if not q_lower:
        return []
    results = [f for f in FOOD_DB if q_lower in f["name"].lower()][:10]
    return results

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


@api_router.post("/meal-plan/generate")
async def generate_meal_plan(user=Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    session_id = f"plan-{user['id']}-{uuid.uuid4().hex[:8]}"
    system = (
        "You are NutriAI, a certified nutritionist AI. Generate personalized meal plans. "
        "Always respond ONLY with valid JSON (no prose, no markdown fences). "
        "Never include medical advice."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system).with_model("openai", "gpt-5.2")

    prompt = f"""
Generate a 7-day meal plan for this user:
- Name: {user.get('name')}
- Goal: {user.get('goal') or 'maintain'}
- Diet: {user.get('diet_type') or 'balanced'}
- Allergies: {', '.join(user.get('allergies') or []) or 'none'}
- Dislikes: {', '.join(user.get('disliked_ingredients') or []) or 'none'}
- Cuisine: {user.get('cuisine') or 'any'}
- Daily calorie target: {user.get('calories_target', 2000)} kcal
- Protein target: {user.get('protein_target_g', 120)}g
- Meals per day: {user.get('meals_per_day', 3)}

Return STRICT JSON with this EXACT schema, no extra keys, no comments:
{{
  "days": [
    {{
      "day": 1,
      "label": "Monday",
      "meals": [
        {{"meal_type": "breakfast", "name": "...", "description": "short 1-line", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "ingredients": ["..."]}},
        {{"meal_type": "lunch", ...}},
        {{"meal_type": "dinner", ...}}
      ],
      "total_calories": 0
    }}
  ]
}}
Use realistic nutrition values. Ensure daily totals are within +/- 10% of the target. Output JSON only.
"""
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        plan = _extract_json(raw)
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
        "ai_model_version": "gpt-5.2",
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
    from emergentintegrations.llm.chat import LlmChat, UserMessage

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

    system = ("You are NutriAI, a friendly nutrition coach. Give concise, actionable, encouraging tips. "
              "Never give medical advice. Respond ONLY as JSON: an array of exactly 3 short strings.")
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"ins-{user['id']}-{uuid.uuid4().hex[:6]}",
                   system_message=system).with_model("openai", "gpt-5.2")
    prompt = f"""User 7-day averages: {avg}. Targets: calories {user.get('calories_target', 2000)} kcal, protein {user.get('protein_target_g', 120)}g, carbs {user.get('carbs_target_g', 230)}g, fat {user.get('fat_target_g', 65)}g. Goal: {user.get('goal')}. Diet: {user.get('diet_type')}.

Return JSON array of 3 short, specific tips (max 140 chars each). JSON only."""
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        tips = _extract_json(raw)
        if isinstance(tips, dict):
            tips = tips.get("tips") or list(tips.values())[0]
        if not isinstance(tips, list):
            raise ValueError("tips not a list")
        tips = [str(t) for t in tips[:3]]
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


# ===================== MOUNT =====================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
