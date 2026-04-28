import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API } from "@/App";
import { Sparkles, RefreshCcw, ChefHat, User, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function MealPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loggingMeal, setLoggingMeal] = useState(null); // index of meal being logged
  const [toast, setToast] = useState("");

  useEffect(() => {
    axios.get(`${API}/meal-plan/current`).then(r => { setPlan(r.data); setFetched(true); });
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/meal-plan/generate`);
      setPlan(data);
      setSelectedDay(0);
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.detail || e.message));
    } finally { setLoading(false); }
  };

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const logMeal = async (m, idx) => {
    setLoggingMeal(idx);
    try {
      await axios.post(`${API}/logs`, {
        meal_type: m.meal_type, name: m.name,
        calories: m.calories || 0, protein_g: m.protein_g || 0,
        carbs_g: m.carbs_g || 0, fat_g: m.fat_g || 0,
        servings: 1, source: "ai"
      });
      showToast(`${m.name} logged!`);
    } catch (e) {
      showToast("Failed to log meal.");
    } finally {
      setLoggingMeal(null);
    }
  };

  const days = plan?.plan_json?.days || [];
  const day = days[selectedDay];

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-28" data-testid="meal-plan-page">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in" data-testid="log-toast">
          <CheckCircle2 className="w-4 h-4 text-green-400" strokeWidth={2}/>
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="tiny text-[#6B635E]">AI Meal Plan</div>
          <h1 className="font-display text-2xl font-medium tracking-tight mt-0.5">Your 7-day plan</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/profile" className="p-3 rounded-full bg-white border border-black/5 flex items-center justify-center text-[#1A1A1A] hover:bg-gray-50" aria-label="Profile" data-testid="profile-btn">
            <User className="w-5 h-5" strokeWidth={1.75} />
          </Link>
          <button onClick={generate} disabled={loading} className="btn-secondary !py-2 !px-4 text-sm inline-flex items-center gap-2" data-testid="regenerate-plan-btn">
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75}/>
            {plan ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {loading && !plan && (
        <div className="card p-10 text-center" data-testid="plan-loading">
          <Sparkles className="w-8 h-8 text-[#E26D5C] mx-auto animate-pulse" strokeWidth={1.75}/>
          <p className="mt-4 text-[#6B635E]">Cooking up your plan…</p>
        </div>
      )}

      {!plan && !loading && fetched && (
        <div className="card p-10 text-center" data-testid="plan-empty">
          <ChefHat className="w-12 h-12 mx-auto text-[#E26D5C]" strokeWidth={1.5}/>
          <h3 className="font-display text-xl font-medium mt-4">No plan yet</h3>
          <p className="text-[#6B635E] text-sm mt-2 max-w-xs mx-auto">Tap "Generate" to create a personalized 7-day meal plan based on your profile.</p>
          <button onClick={generate} className="btn-primary mt-6" data-testid="plan-generate-first-btn">Generate my plan</button>
        </div>
      )}

      {plan && days.length > 0 && (
        <>
          {/* Day selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5" data-testid="day-selector">
            {days.map((d, i) => (
              <button key={i} onClick={()=>setSelectedDay(i)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl min-w-[70px] text-center transition-all ${selectedDay===i ? "bg-[#1A1A1A] text-white" : "bg-white border border-black/5"}`}
                data-testid={`day-chip-${i}`}>
                <div className="tiny opacity-70">{DAY_LABELS[i % 7]}</div>
                <div className="font-display text-lg font-medium mt-0.5">{d.day}</div>
              </button>
            ))}
          </div>

          {day && (
            <div className="mt-4">
              <div className="card p-5 bg-[#1A1A1A] text-white" data-testid="day-summary">
                <div className="tiny opacity-70">Day {day.day} · {day.label}</div>
                <div className="mt-2 font-display text-2xl font-light">~{day.total_calories || day.meals.reduce((s,m)=>s+(m.calories||0),0)} kcal</div>
              </div>

              <div className="mt-4 space-y-3">
                {(day.meals || []).map((m, i) => (
                  <div key={i} className="card p-5" data-testid={`plan-meal-${i}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="tiny text-[#E26D5C]">{m.meal_type}</div>
                            <div className="font-display text-lg font-medium mt-1">{m.name}</div>
                          </div>
                          {m.image_url && (
                            <img src={m.image_url} alt={m.name} className="w-16 h-16 rounded-xl object-cover border border-black/5 flex-shrink-0" />
                          )}
                        </div>
                        {m.description && <div className="text-sm text-[#6B635E] mt-1">{m.description}</div>}
                        <div className="flex gap-3 mt-3 text-xs text-[#6B635E]">
                          <span><b className="text-[#1A1A1A]">{Math.round(m.calories||0)}</b> kcal</span>
                          <span>P <b className="text-[#1A1A1A]">{Math.round(m.protein_g||0)}</b></span>
                          <span>C <b className="text-[#1A1A1A]">{Math.round(m.carbs_g||0)}</b></span>
                          <span>F <b className="text-[#1A1A1A]">{Math.round(m.fat_g||0)}</b></span>
                        </div>
                        {m.ingredients && m.ingredients.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {m.ingredients.slice(0, 6).map((ing, j) => (
                              <span key={j} className="text-xs bg-[#F2EFEB] px-2.5 py-1 rounded-full">{ing}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={()=>logMeal(m, i)} disabled={loggingMeal === i} className="btn-primary !px-4 !py-2 text-xs flex-shrink-0 disabled:opacity-60" data-testid={`log-plan-meal-${i}`}>
                        {loggingMeal === i ? "Logging…" : "Log"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
