import React, { useState } from "react";
import { useAuth } from "@/App";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      navigate("/app");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-[#F9F6F0]" data-testid="auth-page">
      <Link to="/" className="self-start max-w-md w-full mb-6 inline-flex items-center gap-2 text-sm text-[#6B635E] hover:text-[#1A1A1A]" data-testid="auth-back-home">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75}/> Home
      </Link>
      <div className="card p-8 sm:p-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-2xl bg-[#E26D5C] flex items-center justify-center text-white font-bold">N</div>
          <span className="font-display text-xl font-medium">NutriAI</span>
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight">
          {mode === "login" ? "Welcome back." : "Create your account."}
        </h1>
        <p className="text-[#6B635E] mt-2 text-sm">
          {mode === "login" ? "Let's continue your plan." : "Personalized plans, 2 minutes."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "register" && (
            <div>
              <label className="tiny text-[#6B635E] block mb-2">Name</label>
              <input className="input-earthy" value={name} onChange={e=>setName(e.target.value)} required data-testid="auth-name-input"/>
            </div>
          )}
          <div>
            <label className="tiny text-[#6B635E] block mb-2">Email</label>
            <input type="email" className="input-earthy" value={email} onChange={e=>setEmail(e.target.value)} required data-testid="auth-email-input"/>
          </div>
          <div>
            <label className="tiny text-[#6B635E] block mb-2">Password</label>
            <input type="password" minLength={6} className="input-earthy" value={password} onChange={e=>setPassword(e.target.value)} required data-testid="auth-password-input"/>
          </div>
          {err && <div className="text-sm text-red-600" data-testid="auth-error">{err}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60" data-testid="auth-submit-btn">
            {loading ? "Please wait…" : (mode === "login" ? "Sign in" : "Create account")}
          </button>
        </form>

        <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-6 text-sm text-[#6B635E] hover:text-[#1A1A1A] w-full text-center" data-testid="auth-toggle-btn">
          {mode === "login" ? "No account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
