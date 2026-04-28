import React, { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";
import { Search, ScanBarcode, PlusCircle, ArrowLeft, X, Camera } from "lucide-react";

const MEAL_TYPES = ["breakfast","lunch","dinner","snack"];

export default function LogFood() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("search"); // search | barcode | manual
  const [mealType, setMealType] = useState(guessMealType());
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [barProduct, setBarProduct] = useState(null);
  const [manual, setManual] = useState({name:"", calories:"", protein_g:"", carbs_g:"", fat_g:"", servings:1});
  const [selected, setSelected] = useState(null);
  const [servings, setServings] = useState(1);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searching, setSearching] = useState(false);

  function guessMealType() {
    const h = new Date().getHours();
    if (h < 10) return "breakfast";
    if (h < 14) return "lunch";
    if (h < 20) return "dinner";
    return "snack";
  }

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const { data } = await axios.get(`${API}/food/search`, { params: { q } });
      setResults(data);
    } catch (e) {
      alert("Search failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setSearching(false);
    }
  };

  const lookupBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const { data } = await axios.get(`${API}/food/barcode/${barcode.trim()}`);
      setBarProduct(data);
    } catch (e) {
      alert(e?.response?.data?.detail || "Not found");
      setBarProduct(null);
    }
  };

  const handleAIScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(`${API}/food/analyze-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSelected({ ...data, source: "ai" });
    } catch (err) {
      alert("AI Scan failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setScanning(false);
      e.target.value = null;
    }
  };

  const submitFood = async (food) => {
    setSaving(true);
    try {
      await axios.post(`${API}/logs`, {
        meal_type: mealType,
        name: food.name,
        calories: Number(food.calories) || 0,
        protein_g: Number(food.protein_g) || 0,
        carbs_g: Number(food.carbs_g) || 0,
        fat_g: Number(food.fat_g) || 0,
        fiber_g: Number(food.fiber_g) || 0,
        servings: Number(servings) || 1,
        source: food.source || (tab === "barcode" ? "barcode" : (tab === "manual" ? "manual" : "search")),
        barcode: food.barcode || null,
      });
      navigate("/app");
    } catch (e) {
      alert("Failed: " + (e?.response?.data?.detail || e.message));
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-28" data-testid="log-food-page">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={()=>navigate(-1)} className="p-2 rounded-full hover:bg-[#F2EFEB]" data-testid="log-back-btn">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.75}/>
        </button>
        <div>
          <div className="tiny text-[#6B635E]">Log food</div>
          <h1 className="font-display text-2xl font-medium tracking-tight mt-0.5">Add to your day</h1>
        </div>
      </div>

      {/* Meal type picker */}
      <div className="flex gap-2 mb-4" data-testid="meal-type-picker">
        {MEAL_TYPES.map(mt => (
          <button key={mt} onClick={()=>setMealType(mt)}
            className={`flex-1 py-2 rounded-full text-xs uppercase tracking-wider font-semibold capitalize ${mealType===mt ? "text-white" : "bg-white border border-black/5 text-[#6B635E]"}`}
            style={mealType===mt ? { backgroundColor: '#1A1A1A' } : {}}
            data-testid={`meal-type-${mt}`}>{mt}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F2EFEB] p-1 rounded-full mb-5 overflow-x-auto no-scrollbar">
        {[["search","Search",Search],["barcode","Barcode",ScanBarcode],["ai","AI",Camera],["manual","Manual",PlusCircle]].map(([id, label, Icon]) => (
          <button key={id} onClick={()=>{setTab(id); setSelected(null);}}
            className={`flex-1 py-2 rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5 ${tab===id ? "bg-white shadow-sm" : "text-[#6B635E]"}`}
            data-testid={`log-tab-${id}`}>
            <Icon className="w-4 h-4" strokeWidth={1.75}/> {label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <div data-testid="log-search-tab">
          <div className="flex gap-2">
            <input className="input-earthy" placeholder="Search foods…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} data-testid="food-search-input"/>
            <button onClick={search} disabled={searching} className="btn-primary !px-5 !py-3 disabled:opacity-60" data-testid="food-search-btn">
              {searching ? "…" : "Go"}
            </button>
          </div>
          {searching && (
            <div className="flex items-center gap-2 mt-4 text-sm text-[#6B635E]">
              <svg className="animate-spin w-4 h-4 text-[#E26D5C]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Searching…
            </div>
          )}
          <div className="mt-4 space-y-2">
            {results.map((f, i) => (
              <button key={i} onClick={()=>setSelected({...f, source:"search"})}
                className="w-full card p-4 text-left hover:border-[#E26D5C] transition" data-testid={`search-result-${i}`}>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-[#6B635E] mt-0.5">{f.calories} kcal · P{f.protein_g} C{f.carbs_g} F{f.fat_g}</div>
              </button>
            ))}
            {q && results.length === 0 && <p className="text-sm text-[#6B635E] text-center py-8">No results. Try "Manual" entry.</p>}
          </div>
        </div>
      )}

      {tab === "barcode" && (
        <div data-testid="log-barcode-tab">
          <p className="text-sm text-[#6B635E] mb-3">Enter the product's barcode number (found under the bars on the label).</p>
          <div className="flex gap-2">
            <input className="input-earthy" placeholder="e.g. 3017620422003" value={barcode} onChange={e=>setBarcode(e.target.value)} inputMode="numeric" data-testid="barcode-input"/>
            <button onClick={lookupBarcode} className="btn-primary !px-5 !py-3" data-testid="barcode-lookup-btn">Look up</button>
          </div>
          {barProduct && (
            <button onClick={()=>setSelected({...barProduct, source:"barcode"})}
              className="mt-4 w-full card p-4 text-left hover:border-[#E26D5C]" data-testid="barcode-result">
              <div className="flex items-center gap-3">
                {barProduct.image_url && <img src={barProduct.image_url} alt="" className="w-14 h-14 rounded-xl object-cover"/>}
                <div>
                  <div className="font-medium">{barProduct.name}</div>
                  {barProduct.brand && <div className="text-xs text-[#6B635E]">{barProduct.brand}</div>}
                  <div className="text-xs text-[#6B635E] mt-1">{Math.round(barProduct.calories)} kcal / 100g · P{barProduct.protein_g} C{barProduct.carbs_g} F{barProduct.fat_g}</div>
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div data-testid="log-ai-tab" className="text-center py-6">
          <div className="w-16 h-16 bg-[#F2EFEB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#6B635E]">
            <Camera className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl mb-2">Scan your meal</h3>
          <p className="text-sm text-[#6B635E] mb-6">Take a photo of your food or a nutrition label to instantly log macros.</p>
          
          <label className={`btn-primary inline-flex justify-center items-center cursor-pointer relative overflow-hidden transition-opacity ${scanning ? "opacity-70" : ""}`}>
            {scanning ? "Analyzing image..." : "Open Camera / Gallery"}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleAIScan}
              disabled={scanning}
            />
          </label>
        </div>
      )}

      {tab === "manual" && (
        <div data-testid="log-manual-tab" className="space-y-3">
          <div>
            <label className="tiny text-[#6B635E] block mb-2">Food name</label>
            <input className="input-earthy" value={manual.name} onChange={e=>setManual({...manual, name:e.target.value})} data-testid="manual-name-input"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories" val={manual.calories} onChange={v=>setManual({...manual, calories:v})} testid="manual-cal-input"/>
            <Field label="Protein (g)" val={manual.protein_g} onChange={v=>setManual({...manual, protein_g:v})} testid="manual-protein-input"/>
            <Field label="Carbs (g)" val={manual.carbs_g} onChange={v=>setManual({...manual, carbs_g:v})} testid="manual-carbs-input"/>
            <Field label="Fat (g)" val={manual.fat_g} onChange={v=>setManual({...manual, fat_g:v})} testid="manual-fat-input"/>
          </div>
          <button onClick={()=>setSelected({...manual, source:"manual"})} disabled={!manual.name || !manual.calories}
            className="btn-primary w-full disabled:opacity-40" data-testid="manual-next-btn">Continue</button>
        </div>
      )}

      {/* Selected sheet */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end" onClick={()=>setSelected(null)} data-testid="log-sheet">
          <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl p-6" onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="tiny text-[#6B635E] capitalize">{mealType}</div>
                <h3 className="font-display text-2xl font-medium mt-1">{selected.name}</h3>
              </div>
              <button onClick={()=>setSelected(null)} className="p-2" data-testid="close-sheet-btn"><X className="w-5 h-5" strokeWidth={1.75}/></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 mb-5">
              <Nut label="kcal" v={Math.round((selected.calories||0) * servings)}/>
              <Nut label="P" v={Math.round((selected.protein_g||0) * servings)+"g"}/>
              <Nut label="C" v={Math.round((selected.carbs_g||0) * servings)+"g"}/>
              <Nut label="F" v={Math.round((selected.fat_g||0) * servings)+"g"}/>
            </div>
            <div>
              <label className="tiny text-[#6B635E] block mb-2">Servings</label>
              <div className="flex items-center gap-3">
                <button onClick={()=>setServings(s=>Math.max(0.25, +(s-0.25).toFixed(2)))} className="w-10 h-10 rounded-full bg-[#F2EFEB]" data-testid="servings-decrease">−</button>
                <input type="number" step="0.25" min="0.25" value={servings} onChange={e=>setServings(parseFloat(e.target.value)||1)} className="input-earthy text-center flex-1" data-testid="servings-input"/>
                <button onClick={()=>setServings(s=>+(s+0.25).toFixed(2))} className="w-10 h-10 rounded-full bg-[#F2EFEB]" data-testid="servings-increase">+</button>
              </div>
            </div>
            <button onClick={()=>submitFood(selected)} disabled={saving} className="btn-primary w-full mt-6 disabled:opacity-60" data-testid="confirm-log-btn">
              {saving ? "Logging…" : "Log meal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({label, val, onChange, testid}) {
  return (
    <div>
      <label className="tiny text-[#6B635E] block mb-2">{label}</label>
      <input type="number" step="0.1" className="input-earthy" value={val} onChange={e=>onChange(e.target.value)} data-testid={testid}/>
    </div>
  );
}

function Nut({label, v}) {
  return (
    <div className="bg-[#F2EFEB] rounded-xl px-3 py-3 text-center">
      <div className="font-display text-lg font-medium">{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-[#6B635E] mt-0.5">{label}</div>
    </div>
  );
}
