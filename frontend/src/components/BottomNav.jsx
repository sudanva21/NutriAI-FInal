import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Utensils, BarChart3, User, Plus } from "lucide-react";

export default function BottomNav() {
  const item = "flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-semibold";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-t border-black/5" data-testid="bottom-nav">
      <div className="max-w-lg mx-auto grid grid-cols-5 h-16 relative">
        <NavLink to="/app" end className={({isActive}) => `${item} ${isActive ? "text-[#E26D5C]" : "text-[#6B635E]"}`} data-testid="nav-home">
          <Home className="w-5 h-5" strokeWidth={1.75}/><span>Home</span>
        </NavLink>
        <NavLink to="/app/plan" className={({isActive}) => `${item} ${isActive ? "text-[#E26D5C]" : "text-[#6B635E]"}`} data-testid="nav-plan">
          <Utensils className="w-5 h-5" strokeWidth={1.75}/><span>Plan</span>
        </NavLink>
        <NavLink to="/app/log" className="flex items-center justify-center" data-testid="nav-log">
          <div className="-mt-8 w-14 h-14 rounded-full bg-[#E26D5C] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(226,109,92,0.4)] active:scale-95 transition">
            <Plus className="w-6 h-6" strokeWidth={2}/>
          </div>
        </NavLink>
        <NavLink to="/app/analytics" className={({isActive}) => `${item} ${isActive ? "text-[#E26D5C]" : "text-[#6B635E]"}`} data-testid="nav-analytics">
          <BarChart3 className="w-5 h-5" strokeWidth={1.75}/><span>Stats</span>
        </NavLink>
        <NavLink to="/app/profile" className={({isActive}) => `${item} ${isActive ? "text-[#E26D5C]" : "text-[#6B635E]"}`} data-testid="nav-profile">
          <User className="w-5 h-5" strokeWidth={1.75}/><span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
