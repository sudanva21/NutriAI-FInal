import React from "react";
import { useAuth } from "@/App";
import { LogOut, Flame, Trophy, Target, Salad } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const levelNames = ["Seedling","Sprout","Grower","Cultivator","Harvest Pro"];
  const levelName = levelNames[Math.min(user.level - 1, levelNames.length - 1)] || "Seedling";
  const progress = (user.xp % 200) / 2;

  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-28" data-testid="profile-page">
      <header className="mb-6">
        <div className="tiny text-[#6B635E]">Profile</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mt-0.5">{user.name}</h1>
        <p className="text-sm text-[#6B635E]">{user.email}</p>
      </header>

      {/* Level card */}
      <div className="card p-6 bg-[#1A1A1A] text-white" data-testid="level-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="tiny opacity-60">Level {user.level}</div>
            <div className="font-display text-3xl font-light mt-1">{levelName}</div>
          </div>
          <Trophy className="w-8 h-8 text-[#E0A96D]" strokeWidth={1.5}/>
        </div>
        <div className="mt-5">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#E26D5C]" style={{width: `${progress}%`, transition: "width 800ms"}}/>
          </div>
          <div className="flex justify-between text-xs mt-2 opacity-70">
            <span>{user.xp} XP</span>
            <span>{200 - (user.xp % 200)} to next</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Card icon={Flame} label="Current streak" val={`${user.streak_current || 0}d`} testid="profile-streak"/>
        <Card icon={Trophy} label="Best streak" val={`${user.streak_best || 0}d`} testid="profile-best"/>
        <Card icon={Target} label="Calorie target" val={`${user.calories_target}`} testid="profile-target"/>
        <Card icon={Salad} label="Diet" val={user.diet_type || "—"} testid="profile-diet"/>
      </div>

      {/* Targets */}
      <div className="card p-5 mt-5" data-testid="targets-card">
        <h3 className="font-display text-lg font-medium mb-4">Daily targets</h3>
        <Row label="Calories" v={`${user.calories_target} kcal`}/>
        <Row label="Protein" v={`${user.protein_target_g}g`}/>
        <Row label="Carbs" v={`${user.carbs_target_g}g`}/>
        <Row label="Fat" v={`${user.fat_target_g}g`}/>
      </div>

      {/* Info */}
      <div className="card p-5 mt-5" data-testid="info-card">
        <h3 className="font-display text-lg font-medium mb-4">Your details</h3>
        <Row label="Goal" v={(user.goal || "—").replace("_"," ")}/>
        <Row label="Height" v={user.height_cm ? `${user.height_cm} cm` : "—"}/>
        <Row label="Weight" v={user.current_weight_kg ? `${user.current_weight_kg} kg` : "—"}/>
        <Row label="Activity" v={user.activity_level || "—"}/>
        <Row label="Allergies" v={(user.allergies || []).join(", ") || "none"}/>
      </div>

      <button onClick={logout} className="btn-secondary mt-6 w-full inline-flex items-center justify-center gap-2" data-testid="logout-btn">
        <LogOut className="w-4 h-4" strokeWidth={1.75}/> Sign out
      </button>
    </div>
  );
}

function Card({icon: Icon, label, val, testid}) {
  return (
    <div className="card p-5" data-testid={testid}>
      <Icon className="w-5 h-5 text-[#E26D5C]" strokeWidth={1.75}/>
      <div className="tiny text-[#6B635E] mt-3">{label}</div>
      <div className="font-display text-xl font-medium mt-1 capitalize">{val}</div>
    </div>
  );
}

function Row({label, v}) {
  return (
    <div className="flex justify-between py-2 text-sm border-b border-black/5 last:border-0">
      <span className="text-[#6B635E]">{label}</span>
      <span className="font-medium capitalize text-right">{v}</span>
    </div>
  );
}
