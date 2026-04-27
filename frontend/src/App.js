import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import "@/App.css";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import MealPlan from "@/pages/MealPlan";
import LogFood from "@/pages/LogFood";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import BottomNav from "@/components/BottomNav";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("nutriai_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get(`${API}/auth/me`).then(r => setUser(r.data)).catch(() => {
        localStorage.removeItem("nutriai_token");
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("nutriai_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, password });
    localStorage.setItem("nutriai_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("nutriai_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await axios.get(`${API}/auth/me`);
    setUser(data);
    return data;
  };

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    const isAuthRoute = loc.pathname === "/" || loc.pathname === "/auth";
    if (!user && !isAuthRoute) navigate("/auth", { replace: true });
    else if (user && !user.onboarded && loc.pathname !== "/onboarding") navigate("/onboarding", { replace: true });
    else if (user && user.onboarded && isAuthRoute) navigate("/app", { replace: true });
  }, [user, loading, loc.pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0]">
      <div className="text-[#6B635E]" data-testid="loading-screen">Loading…</div>
    </div>;
  }

  const showNav = user && user.onboarded && !["/", "/auth", "/onboarding"].includes(loc.pathname);

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#1A1A1A]" style={{fontFamily: "Manrope, sans-serif"}}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/plan" element={<MealPlan />} />
        <Route path="/app/log" element={<LogFood />} />
        <Route path="/app/analytics" element={<Analytics />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
