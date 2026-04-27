import os, uuid, time, pytest, requests

BASE = os.environ.get('REACT_APP_BACKEND_URL', open('/app/frontend/.env').read().split('REACT_APP_BACKEND_URL=')[1].split('\n')[0]).rstrip('/')
API = f"{BASE}/api"

EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
PASSWORD = "TestPass123!"
NAME = "Test User"

state = {}

def _h():
    return {"Authorization": f"Bearer {state['token']}"}

def test_01_register():
    r = requests.post(f"{API}/auth/register", json={"email": EMAIL, "password": PASSWORD, "name": NAME}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and d["user"]["email"] == EMAIL.lower()
    state["token"] = d["token"]
    state["user_id"] = d["user"]["id"]
    # save credentials
    with open('/app/memory/test_credentials.md', 'a') as f:
        f.write(f"\n## NutriAI Test User (iteration)\n- email: {EMAIL}\n- password: {PASSWORD}\n")

def test_02_login_wrong():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong"}, timeout=10)
    assert r.status_code == 401

def test_03_login_correct():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
    assert r.status_code == 200
    state["token"] = r.json()["token"]

def test_04_me():
    r = requests.get(f"{API}/auth/me", headers=_h(), timeout=10)
    assert r.status_code == 200 and r.json()["email"] == EMAIL.lower()

def test_05_onboarding():
    payload = {"dob": "1995-05-15", "gender": "male", "height_cm": 180, "current_weight_kg": 80,
               "target_weight_kg": 75, "goal": "lose_weight", "diet_type": "balanced",
               "activity_level": "moderate", "meals_per_day": 3, "allergies": ["peanuts"],
               "disliked_ingredients": ["mushrooms"], "cuisine": "mediterranean"}
    r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_h(), timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["onboarded"] and d["calories_target"] > 1000
    assert d["protein_target_g"] > 0 and d["goal"] == "lose_weight"

def test_06_food_search():
    r = requests.get(f"{API}/food/search", params={"q": "chicken"}, headers=_h(), timeout=10)
    assert r.status_code == 200
    res = r.json()
    assert len(res) >= 1 and any("chicken" in f["name"].lower() for f in res)

def test_07_barcode_nutella():
    r = requests.get(f"{API}/food/barcode/3017620422003", headers=_h(), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["barcode"] == "3017620422003" and d["name"]

def test_08_log_meal_and_today():
    payload = {"meal_type": "breakfast", "name": "Oatmeal", "calories": 300,
               "protein_g": 10, "carbs_g": 50, "fat_g": 5, "fiber_g": 4, "servings": 1, "source": "manual"}
    r = requests.post(f"{API}/logs", json=payload, headers=_h(), timeout=10)
    assert r.status_code == 200
    state["log_id"] = r.json()["id"]
    r2 = requests.get(f"{API}/logs/today", headers=_h(), timeout=10)
    assert r2.status_code == 200
    d = r2.json()
    assert d["totals"]["calories"] >= 300
    assert any(l["id"] == state["log_id"] for l in d["logs"])
    # streak
    me = requests.get(f"{API}/auth/me", headers=_h()).json()
    assert me["streak_current"] >= 1 and me["xp"] >= 10

def test_09_logs_range():
    r = requests.get(f"{API}/logs/range", params={"days": 7}, headers=_h(), timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert len(d["days"]) == 7

def test_10_weight_log_and_history():
    r = requests.post(f"{API}/weight", json={"weight_kg": 79.5}, headers=_h(), timeout=10)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/weight", headers=_h(), timeout=10)
    assert r2.status_code == 200 and len(r2.json()) >= 1

def test_11_insights_generate():
    r = requests.post(f"{API}/insights/generate", headers=_h(), timeout=60)
    assert r.status_code == 200, r.text
    tips = r.json()["tips"]
    assert isinstance(tips, list) and len(tips) == 3

def test_12_meal_plan_generate():
    r = requests.post(f"{API}/meal-plan/generate", headers=_h(), timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "plan_json" in d
    plan = d["plan_json"]
    assert "days" in plan and len(plan["days"]) >= 5
    assert all("meals" in day and len(day["meals"]) >= 2 for day in plan["days"])
