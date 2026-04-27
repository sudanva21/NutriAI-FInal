import React, { useEffect, useState, useCallback } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Link } from "react-router-dom";
import { Flame, Sparkles, Bell, Plus, Lightbulb, RefreshCcw, ChevronRight } from "lucide-react";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [today, setToday] = useState({logs: [], totals: {calories:0, protein_g:0, carbs_g:0, fat_g:0}});
  const [insights, setInsights] = useState([]);
  const [loadingIns, setLoadingIns] = useState(false);

  const load = useCallback(async () => {
    const [t, i] = await Promise.all([
      axios.get(`${API}/logs/today`),
      axios.get(`${API}/insights/latest`),
    ]);
    setToday(t.data);
    setInsights(i.data.tips || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const genInsights = async () => {
    setLoadingIns(true);
    try {
      const { data } = await axios.post(`${API}/insights/generate`);
      setInsights(data.tips || []);
    } catch (e) { alert("Failed: " + (e?.response?.data?.detail || e.message)); }
    finally { setLoadingIns(false); }
  };

  if (!user) return null;
  const cTarget = user.calories_target || 2000;
  const cConsumed = Math.round(today.totals.calories);
  const cRemaining = Math.max(0, cTarget - cConsumed);

  const mealTypes = ["breakfast","lunch","dinner","snack"];
  const byType = Object.fromEntries(mealTypes.map(m => [m, today.logs.filter(l=>l.meal_type===m)]));

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-28" data-testid="dashboard-page">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="tiny text-[#6B635E]">Today</div>
          <h1 className="font-display text-2xl font-medium tracking-tight mt-0.5" data-testid="dashboard-greeting">
            Hi, {user.name?.split(" ")[0] || "there"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 rounded-full bg-white border border-black/5" aria-label="Notifications" data-testid="notifications-btn">
            <Bell className="w-5 h-5" strokeWidth={1.75}/>
          </button>
          <div className="flex items-center gap-1.5 bg-[#E26D5C]/10 text-[#E26D5C] px-3 py-2 rounded-full" data-testid="streak-pill">
            <Flame className="w-4 h-4" strokeWidth={1.75}/>
            <span className="text-sm font-semibold">{user.streak_current || 0}</span>
          </div>
        </div>
      </header>

      {/* Calorie ring card */}
      <div className="card p-6 sm:p-8" data-testid="calorie-ring-card">
        <div className="flex items-center justify-between">
          <div className="tiny text-[#6B635E]">Calories</div>
          <div className="text-xs text-[#6B635E]">Goal {cTarget}</div>
        </div>
        <div className="mt-4 flex justify-center">
          <CalorieRing consumed={cConsumed} target={cTarget}/>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Macro label="Protein" val={Math.round(today.totals.protein_g)} tgt={user.protein_target_g} color="#729B79" testid="macro-protein"/>
          <Macro label="Carbs" val={Math.round(today.totals.carbs_g)} tgt={user.carbs_target_g} color="#E0A96D" testid="macro-carbs"/>
          <Macro label="Fat" val={Math.round(today.totals.fat_g)} tgt={user.fat_target_g} color="#3D5A80" testid="macro-fat"/>
        </div>
      </div>

      {/* Meals list */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-medium">Today's meals</h2>
          <Link to="/app/log" className="text-sm text-[#E26D5C] font-medium inline-flex items-center gap-1" data-testid="add-meal-link">
            <Plus className="w-4 h-4" strokeWidth={2}/> Add
          </Link>
        </div>
        <div className="space-y-3">
          {mealTypes.map(mt => (
            <MealRow key={mt} meal_type={mt} logs={byType[mt]} onChange={load}/>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 card p-6" data-testid="insights-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#E0A96D]" strokeWidth={1.75}/>
            <h2 className="font-display text-lg font-medium">AI Insights</h2>
          </div>
          <button onClick={genInsights} disabled={loadingIns} className="text-sm text-[#6B635E] hover:text-[#1A1A1A] inline-flex items-center gap-1" data-testid="refresh-insights-btn">
            <RefreshCcw className={`w-4 h-4 ${loadingIns ? "animate-spin" : ""}`} strokeWidth={1.75}/>
            {loadingIns ? "Thinking…" : "Refresh"}
          </button>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-[#6B635E]">Tap refresh to generate personalized tips based on your data.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed" data-testid={`insight-tip-${i}`}>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F2EFEB] text-[#E26D5C] text-xs font-bold flex items-center justify-center">{i+1}</span>
                <span className="text-[#1A1A1A]">{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Meal plan shortcut */}
      <Link to="/app/plan" className="block mt-6 card card-hover p-6 relative overflow-hidden" data-testid="plan-shortcut-card">
        <img src="https://images.pexels.com/photos/13883710/pexels-photo-13883710.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
             alt="" className="absolute inset-0 w-full h-full object-cover opacity-20"/>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="tiny text-[#E26D5C]">AI</div>
            <div className="font-display text-xl font-medium mt-1">Your 7-day plan</div>
            <div className="text-sm text-[#6B635E] mt-1">Tailored to your goals</div>
          </div>
          <Sparkles className="w-6 h-6 text-[#E26D5C]" strokeWidth={1.75}/>
        </div>
      </Link>
    </div>
  );
}

function CalorieRing({consumed, target}) {
  const pct = Math.min(1, consumed / Math.max(1, target));
  const r = 80, c = 2 * Math.PI * r;
  const remaining = Math.max(0, target - consumed);
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" data-testid="calorie-ring-svg">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#F2EFEB" strokeWidth="16"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke="#E26D5C" strokeWidth="16" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 110 110)"
              style={{transition: "stroke-dashoffset 800ms cubic-bezier(0.25,1,0.5,1)"}}/>
      <text x="110" y="108" textAnchor="middle" fontFamily="Outfit" fontSize="42" fontWeight="500" fill="#1A1A1A">{consumed}</text>
      <text x="110" y="130" textAnchor="middle" fontFamily="Manrope" fontSize="12" fill="#6B635E">eaten</text>
      <text x="110" y="150" textAnchor="middle" fontFamily="Manrope" fontSize="11" fill="#6B635E">{remaining} kcal left</text>
    </svg>
  );
}

function Macro({label, val, tgt, color, testid}) {
  const pct = Math.min(100, (val / Math.max(1, tgt)) * 100);
  return (
    <div data-testid={testid}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[#6B635E]">{label}</span>
        <span className="text-xs font-semibold">{val}<span className="text-[#6B635E] font-normal">/{tgt}g</span></span>
      </div>
      <div className="mt-1.5 h-2 w-full bg-[#F2EFEB] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{width: `${pct}%`, backgroundColor: color}}/>
      </div>
    </div>
  );
}

function MealRow({meal_type, logs, onChange}) {
  const [open, setOpen] = useState(false);
  const cal = Math.round(logs.reduce((s,l)=>s+(l.calories||0), 0));
  const label = meal_type[0].toUpperCase() + meal_type.slice(1);
  const del = async (id) => {
    await axios.delete(`${API}/logs/${id}`);
    onChange();
  };
  return (
    <div className="card p-5" data-testid={`meal-row-${meal_type}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="text-left">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-[#6B635E] mt-0.5">{logs.length === 0 ? "Nothing logged yet" : `${logs.length} item${logs.length>1?"s":""} · ${cal} kcal`}</div>
        </div>
        <ChevronRight className={`w-5 h-5 text-[#6B635E] transition-transform ${open ? "rotate-90" : ""}`} strokeWidth={1.75}/>
      </button>
      {open && logs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/5 space-y-2">
          {logs.map(l => (
            <div key={l.id} className="flex items-center justify-between text-sm" data-testid={`meal-item-${l.id}`}>
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-[#6B635E]">{Math.round(l.calories)} kcal · P{Math.round(l.protein_g)} C{Math.round(l.carbs_g)} F{Math.round(l.fat_g)}</div>
              </div>
              <button onClick={()=>del(l.id)} className="text-xs text-[#6B635E] hover:text-red-500" data-testid={`delete-log-${l.id}`}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
