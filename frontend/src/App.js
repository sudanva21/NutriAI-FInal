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
import Marketplace from "@/pages/Marketplace";
import Checkout from "@/pages/Checkout";
import Cart from "@/pages/Cart";
import AllCounselors from "@/pages/AllCounselors";
import ProductDetail from "@/pages/ProductDetail";
import Orders from "@/pages/Orders";
import BottomNav from "@/components/BottomNav";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.type === item.type);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id, type) => {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.type === type)));
  };

  const updateQuantity = (id, type, qty) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id && i.type === type ? { ...i, quantity: Math.max(1, qty) } : i
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartCtx.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal }}>
      {children}
    </CartCtx.Provider>
  );
}

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
  }, [user, loading, loc.pathname, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0]">
      <div className="text-[#6B635E]" data-testid="loading-screen">Loading…</div>
    </div>;
  }

  const subPages = [
    '/app/checkout',
    '/app/cart',
    '/app/log',
    '/app/product/'
  ];
  
  const isSubPage = subPages.some(p => loc.pathname.startsWith(p));

  const showNav = user && user.onboarded && 
                  !["/", "/auth", "/onboarding"].includes(loc.pathname) && 
                  !isSubPage;

  return (
    <div className={`min-h-screen bg-[#F9F6F0] text-[#1A1A1A] ${showNav ? 'pb-32' : ''}`} style={{fontFamily: "Manrope, sans-serif"}}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/plan" element={<MealPlan />} />
        <Route path="/app/log" element={<LogFood />} />
        <Route path="/app/analytics" element={<Analytics />} />
        <Route path="/app/marketplace" element={<Marketplace />} />
        <Route path="/app/product/:id" element={<ProductDetail />} />
        <Route path="/app/checkout" element={<Checkout />} />
        <Route path="/app/cart" element={<Cart />} />
        <Route path="/app/counselors" element={<AllCounselors />} />
        <Route path="/app/orders" element={<Orders />} />
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
        <CartProvider>
          <Shell />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
