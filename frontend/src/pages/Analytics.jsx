import React, { useEffect, useState } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const [range, setRange] = useState({days: []});
  const [weights, setWeights] = useState([]);
  const [weightInput, setWeightInput] = useState("");

  useEffect(() => {
    axios.get(`${API}/logs/range?days=7`).then(r => setRange(r.data));
    axios.get(`${API}/weight?days=30`).then(r => setWeights(r.data));
  }, []);

  const saveWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w) return;
    await axios.post(`${API}/weight`, { weight_kg: w });
    const r = await axios.get(`${API}/weight?days=30`);
    setWeights(r.data);
    setWeightInput("");
  };

  const days = range.days || [];
  const daysShort = days.map(d => ({ ...d, label: new Date(d.date).toLocaleDateString("en", {weekday: "short"}).slice(0,2) }));

  const totals = daysShort.reduce((a, d) => ({
    calories: a.calories + d.calories, protein_g: a.protein_g + d.protein_g,
    carbs_g: a.carbs_g + d.carbs_g, fat_g: a.fat_g + d.fat_g
  }), {calories:0, protein_g:0, carbs_g:0, fat_g:0});
  const avgCal = Math.round(totals.calories / Math.max(1, daysShort.length));

  const pieData = [
    {name: "Protein", value: Math.round(totals.protein_g * 4), color: "#729B79"},
    {name: "Carbs", value: Math.round(totals.carbs_g * 4), color: "#E0A96D"},
    {name: "Fat", value: Math.round(totals.fat_g * 9), color: "#3D5A80"},
  ].filter(x => x.value > 0);

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-28" data-testid="analytics-page">
      <header className="mb-6">
        <div className="tiny text-[#6B635E]">Your trends</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mt-0.5">Analytics</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat label="7-day avg kcal" val={avgCal} testid="stat-avg-cal"/>
        <Stat label="Current streak" val={user?.streak_current || 0} testid="stat-streak"/>
        <Stat label="Best streak" val={user?.streak_best || 0} testid="stat-best"/>
        <Stat label="XP · Level" val={`${user?.xp || 0} · ${user?.level || 1}`} testid="stat-xp"/>
      </div>

      <div className="card p-5 mb-5" data-testid="chart-calorie-trend">
        <h3 className="font-display text-lg font-medium mb-3">Calorie trend (7d)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={daysShort}>
            <XAxis dataKey="label" stroke="#6B635E" fontSize={11}/>
            <YAxis stroke="#6B635E" fontSize={11}/>
            <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #eee"}}/>
            <Line type="monotone" dataKey="calories" stroke="#E26D5C" strokeWidth={2.5} dot={{fill:"#E26D5C", r:4}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-5 mb-5" data-testid="chart-macros">
        <h3 className="font-display text-lg font-medium mb-3">Macros (7d, stacked)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daysShort}>
            <XAxis dataKey="label" stroke="#6B635E" fontSize={11}/>
            <YAxis stroke="#6B635E" fontSize={11}/>
            <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #eee"}}/>
            <Bar dataKey="protein_g" stackId="a" fill="#729B79"/>
            <Bar dataKey="carbs_g" stackId="a" fill="#E0A96D"/>
            <Bar dataKey="fat_g" stackId="a" fill="#3D5A80"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div className="card p-5 mb-5" data-testid="chart-macro-split">
          <h3 className="font-display text-lg font-medium mb-3">Calorie split</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs mt-2">
            {pieData.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{background: p.color}}/>
                <span className="text-[#6B635E]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5" data-testid="weight-card">
        <h3 className="font-display text-lg font-medium mb-3">Weight (30d)</h3>
        <div className="flex gap-2 mb-4">
          <input type="number" step="0.1" placeholder="Log today's weight (kg)" className="input-earthy" value={weightInput} onChange={e=>setWeightInput(e.target.value)} data-testid="weight-input"/>
          <button onClick={saveWeight} className="btn-primary !px-5 !py-3" data-testid="weight-save-btn">Save</button>
        </div>
        {weights.length === 0 ? (
          <p className="text-sm text-[#6B635E] text-center py-4">No weight logs yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weights}>
              <XAxis dataKey="date" stroke="#6B635E" fontSize={10} tickFormatter={v=>v.slice(5)}/>
              <YAxis domain={["auto","auto"]} stroke="#6B635E" fontSize={11}/>
              <Tooltip contentStyle={{borderRadius: 12, border: "1px solid #eee"}}/>
              <Line type="monotone" dataKey="weight_kg" stroke="#729B79" strokeWidth={2.5} dot={{fill:"#729B79", r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Stat({label, val, testid}) {
  return (
    <div className="card p-5" data-testid={testid}>
      <div className="tiny text-[#6B635E]">{label}</div>
      <div className="font-display text-2xl font-medium mt-1">{val}</div>
    </div>
  );
}
