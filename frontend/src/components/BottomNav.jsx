import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Utensils, BarChart3, Store, Plus } from "lucide-react";

export default function BottomNav() {
  const loc = useLocation();
  const tabs = [
    { path: "/app", icon: Home, label: "Home" },
    { path: "/app/plan", icon: Utensils, label: "Plan" },
    { path: "/app/log", icon: Plus, label: "Log", special: true },
    { path: "/app/analytics", icon: BarChart3, label: "Stats" },
    { path: "/app/marketplace", icon: Store, label: "Market" },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md" data-testid="bottom-nav">
      <div className="bg-[#1A1A1A]/90 backdrop-blur-xl rounded-[2rem] px-4 py-2 shadow-2xl shadow-black/20 flex items-center justify-between border border-white/10">
        {tabs.map((tab) => {
          const isActive = loc.pathname === tab.path || (tab.path !== "/app" && loc.pathname.startsWith(tab.path));
          
          if (tab.special) {
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="relative -mt-10 bg-[#E26D5C] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl shadow-[#E26D5C]/30 active:scale-90 transition-transform"
                data-testid="nav-log"
              >
                <Plus className="w-7 h-7" strokeWidth={2.5} />
              </NavLink>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all ${
                isActive ? "text-[#E26D5C]" : "text-white/50 hover:text-white"
              }`}
              data-testid={`nav-${tab.label.toLowerCase()}`}
            >
              <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} />
              <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-0"}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-[#E26D5C] rounded-full shadow-[0_0_8px_#E26D5C]" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
