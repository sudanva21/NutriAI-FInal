import React, { useState } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const GOALS = [
  {id: "lose_weight", label: "Lose weight", emoji: "⬇"},
  {id: "maintain", label: "Maintain", emoji: "⚖"},
  {id: "gain_muscle", label: "Build muscle", emoji: "⬆"},
];
const DIETS = ["balanced","vegetarian","vegan","keto","mediterranean","paleo"];
const ACTIVITY = [
  {id:"sedentary", label:"Sedentary", hint:"Desk job, little exercise"},
  {id:"light", label:"Light", hint:"1-3 workouts/wk"},
  {id:"moderate", label:"Moderate", hint:"3-5 workouts/wk"},
  {id:"active", label:"Active", hint:"6-7 workouts/wk"},
  {id:"very_active", label:"Very active", hint:"Athlete / physical job"},
];
const COMMON_ALLERGIES = ["peanuts","tree nuts","dairy","eggs","gluten","soy","shellfish","fish"];

export default function Onboarding() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    goal: "", diet_type: "", height_cm: "", current_weight_kg: "", target_weight_kg: "",
    gender: "", dob: "", activity_level: "", allergies: [], cuisine: "", meals_per_day: 3,
  });
  const [saving, setSaving] = useState(false);

  const total = 6;
  const canNext = (() => {
    if (step === 0) return !!form.goal;
    if (step === 1) return form.height_cm && form.current_weight_kg;
    if (step === 2) return !!form.gender && !!form.activity_level;
    if (step === 3) return !!form.diet_type;
    if (step === 4) return true;
    return true;
  })();

  const next = () => setStep(s => Math.min(total - 1, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const toggleAllergy = (a) => setForm(f => ({...f, allergies: f.allergies.includes(a) ? f.allergies.filter(x=>x!==a) : [...f.allergies, a]}));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {...form};
      payload.height_cm = parseFloat(payload.height_cm);
      payload.current_weight_kg = parseFloat(payload.current_weight_kg);
      if (payload.target_weight_kg) payload.target_weight_kg = parseFloat(payload.target_weight_kg);
      const { data } = await axios.post(`${API}/profile/onboarding`, payload);
      setUser(data);
      navigate("/app");
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col" data-testid="onboarding-page">
      <div className="max-w-lg w-full mx-auto px-5 pt-8 pb-32 flex-1">
        <div className="flex items-center justify-between mb-6">
          <button onClick={back} disabled={step===0} className="p-2 rounded-full hover:bg-[#F2EFEB] disabled:opacity-30" data-testid="onb-back-btn">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.75}/>
          </button>
          <div className="tiny text-[#6B635E]" data-testid="onb-step-label">Step {step+1} / {total}</div>
          <div className="w-9" />
        </div>
        <div className="h-1 w-full bg-[#F2EFEB] rounded-full overflow-hidden">
          <div className="h-full bg-[#E26D5C] transition-all duration-500" style={{width: `${((step+1)/total)*100}%`}} />
        </div>

        <div className="mt-10">
          {step === 0 && (
            <div data-testid="onb-step-goal">
              <div className="tiny text-[#6B635E] mb-3">Your goal</div>
              <h2 className="font-display text-3xl font-medium tracking-tight mb-7">What brings you here?</h2>
              <div className="space-y-3">
                {GOALS.map(g => (
                  <button key={g.id} onClick={()=>setForm(f=>({...f, goal:g.id}))}
                    className={`w-full text-left p-5 rounded-2xl border transition-all active:scale-[0.98] flex items-center gap-4 ${form.goal===g.id ? "bg-[#1A1A1A] text-white border-transparent" : "bg-white border-black/5 hover:border-[#E26D5C]"}`}
                    data-testid={`onb-goal-${g.id}`}>
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="font-medium">{g.label}</span>
                    {form.goal===g.id && <Check className="ml-auto w-5 h-5" strokeWidth={2}/>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div data-testid="onb-step-body">
              <div className="tiny text-[#6B635E] mb-3">Your body</div>
              <h2 className="font-display text-3xl font-medium tracking-tight mb-7">Tell us the basics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="tiny text-[#6B635E] block mb-2">Height (cm)</label>
                  <input type="number" className="input-earthy" value={form.height_cm} onChange={e=>setForm({...form, height_cm:e.target.value})} data-testid="onb-height-input"/>
                </div>
                <div>
                  <label className="tiny text-[#6B635E] block mb-2">Weight (kg)</label>
                  <input type="number" className="input-earthy" value={form.current_weight_kg} onChange={e=>setForm({...form, current_weight_kg:e.target.value})} data-testid="onb-weight-input"/>
                </div>
                <div className="col-span-2">
                  <label className="tiny text-[#6B635E] block mb-2">Target weight (kg, optional)</label>
                  <input type="number" className="input-earthy" value={form.target_weight_kg} onChange={e=>setForm({...form, target_weight_kg:e.target.value})} data-testid="onb-target-weight-input"/>
                </div>
                <div className="col-span-2">
                  <label className="tiny text-[#6B635E] block mb-2">Date of birth</label>
                  <input type="date" className="input-earthy" value={form.dob} onChange={e=>setForm({...form, dob:e.target.value})} data-testid="onb-dob-input"/>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div data-testid="onb-step-activity">
              <div className="tiny text-[#6B635E] mb-3">Activity</div>
              <h2 className="font-display text-3xl font-medium tracking-tight mb-7">How active are you?</h2>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {["male","female","other"].map(g => (
                  <button key={g} onClick={()=>setForm({...form, gender:g})}
                    className={`p-3 rounded-xl text-sm font-medium capitalize ${form.gender===g ? "bg-[#1A1A1A] text-white" : "bg-white border border-black/5"}`}
                    data-testid={`onb-gender-${g}`}>{g}</button>
                ))}
              </div>
              <div className="space-y-2">
                {ACTIVITY.map(a => (
                  <button key={a.id} onClick={()=>setForm({...form, activity_level:a.id})}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${form.activity_level===a.id ? "bg-[#1A1A1A] text-white border-transparent" : "bg-white border-black/5 hover:border-[#E26D5C]"}`}
                    data-testid={`onb-activity-${a.id}`}>
                    <div className="font-medium">{a.label}</div>
                    <div className={`text-xs ${form.activity_level===a.id ? "text-white/60" : "text-[#6B635E]"}`}>{a.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div data-testid="onb-step-diet">
              <div className="tiny text-[#6B635E] mb-3">Preferences</div>
              <h2 className="font-display text-3xl font-medium tracking-tight mb-7">Which diet style?</h2>
              <div className="grid grid-cols-2 gap-3">
                {DIETS.map(d => (
                  <button key={d} onClick={()=>setForm({...form, diet_type:d})}
                    className={`p-5 rounded-2xl capitalize text-left font-medium transition-all ${form.diet_type===d ? "bg-[#1A1A1A] text-white" : "bg-white border border-black/5 hover:border-[#E26D5C]"}`}
                    data-testid={`onb-diet-${d}`}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div data-testid="onb-step-allergies">
              <div className="tiny text-[#6B635E] mb-3">Allergies</div>
              <h2 className="font-display text-3xl font-medium tracking-tight mb-7">Anything to avoid?</h2>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map(a => (
                  <button key={a} onClick={()=>toggleAllergy(a)}
                    className={`px-4 py-2 rounded-full text-sm capitalize ${form.allergies.includes(a) ? "bg-[#E26D5C] text-white" : "bg-white border border-black/5"}`}
                    data-testid={`onb-allergy-${a}`}>{a}</button>
                ))}
              </div>
              <p className="mt-5 text-sm text-[#6B635E]">Tap any you want to skip. You can always change these later.</p>
            </div>
          )}

          {step === 5 && (
            <div data-testid="onb-step-review">
              <div className="tiny text-[#6B635E] mb-3">Almost done</div>
              <h2 className="font-display text-3xl font-medium tracking-tight mb-3">You're set, {form.goal ? "" : ""}</h2>
              <p className="text-[#6B635E] mb-7">We'll craft your personalized targets and a 7-day plan in seconds.</p>
              <div className="card p-6 space-y-3 text-sm">
                <Row k="Goal" v={form.goal.replace("_"," ")}/>
                <Row k="Diet" v={form.diet_type}/>
                <Row k="Height / Weight" v={`${form.height_cm} cm · ${form.current_weight_kg} kg`}/>
                <Row k="Activity" v={form.activity_level}/>
                <Row k="Allergies" v={form.allergies.join(", ") || "none"}/>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-black/5 bg-[#F9F6F0]/80 backdrop-blur-lg">
        <div className="max-w-lg mx-auto px-5 py-4">
          {step < total - 1 ? (
            <button onClick={next} disabled={!canNext} className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-40" data-testid="onb-next-btn">
              Continue <ArrowRight className="w-4 h-4" strokeWidth={1.75}/>
            </button>
          ) : (
            <button onClick={submit} disabled={saving} className="btn-primary w-full disabled:opacity-60" data-testid="onb-finish-btn">
              {saving ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({k, v}) {
  return <div className="flex justify-between gap-4"><span className="text-[#6B635E] capitalize">{k}</span><span className="font-medium capitalize text-right">{v || "—"}</span></div>;
}
