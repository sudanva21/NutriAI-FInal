import React from "react";
import { Link } from "react-router-dom";
import { Flame, Sparkles, ScanLine, TrendingUp, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F9F6F0]" data-testid="landing-page">
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-9 h-9 rounded-2xl bg-[#E26D5C] flex items-center justify-center text-white font-bold">N</div>
            <span className="font-display text-xl font-medium">NutriAI</span>
          </div>
          <Link to="/auth" className="btn-secondary !py-2 !px-5 text-sm" data-testid="nav-signin-btn">Sign in</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 pt-12 sm:pt-20 pb-24">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="tiny text-[#E26D5C] mb-5" data-testid="hero-eyebrow">AI-powered nutrition</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-light tracking-tighter leading-[0.95]" data-testid="hero-headline">
              Eat with <span className="italic font-medium text-[#E26D5C]">intention.</span><br/>
              Track with <span className="italic font-medium text-[#729B79]">ease.</span>
            </h1>
            <p className="mt-7 text-lg text-[#6B635E] max-w-xl leading-relaxed" data-testid="hero-sub">
              A mindful diet companion. Personalized 7-day meal plans, barcode-fast food logging, and smart nightly insights — made for people, not calorie spreadsheets.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth" className="btn-primary inline-flex items-center gap-2" data-testid="hero-get-started-btn">
                Start your plan <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>
              <a href="#features" className="btn-secondary" data-testid="hero-learn-more-btn">How it works</a>
            </div>

            <div className="mt-12 grid grid-cols-3 max-w-md gap-6">
              {[["10k+","Meals logged"],["7-day","Plans in 6s"],["3","Nightly tips"]].map(([k,v],i)=>(
                <div key={i}>
                  <div className="font-display text-2xl font-medium">{k}</div>
                  <div className="text-xs text-[#6B635E] mt-1">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="card card-hover p-6 sm:p-8 relative overflow-hidden" data-testid="hero-preview-card">
              <img src="https://images.pexels.com/photos/34305255/pexels-photo-34305255.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                   alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.18]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="tiny text-[#6B635E]">Today</div>
                  <div className="flex items-center gap-1 text-[#E26D5C]"><Flame className="w-4 h-4" strokeWidth={1.75} /><span className="text-sm font-semibold">7 day streak</span></div>
                </div>
                <div className="mt-8 flex justify-center">
                  <CalorieRingDemo />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  <MiniMacro label="Protein" val={92} tgt={140} color="#729B79"/>
                  <MiniMacro label="Carbs" val={180} tgt={230} color="#E0A96D"/>
                  <MiniMacro label="Fat" val={48} tgt={65} color="#3D5A80"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="features" className="mt-24 sm:mt-32">
          <div className="tiny text-[#6B635E] mb-5">What's inside</div>
          <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight max-w-3xl">Your nutritionist, rebuilt as an app.</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {icon: Sparkles, title: "AI meal plans", desc: "7-day plans tailored to your goal, diet, and allergies in seconds."},
              {icon: ScanLine, title: "Barcode logging", desc: "Scan any packaged food via Open Food Facts. Instant macros."},
              {icon: TrendingUp, title: "Nightly insights", desc: "3 concrete, kind tips every night based on your real data."},
            ].map(({icon: Icon, title, desc}, i) => (
              <div key={i} className="card card-hover p-8" data-testid={`feature-card-${i}`}>
                <div className="w-12 h-12 rounded-2xl bg-[#F2EFEB] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#E26D5C]" strokeWidth={1.75}/>
                </div>
                <h3 className="font-display mt-5 text-xl font-medium">{title}</h3>
                <p className="text-[#6B635E] mt-2 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-3xl bg-[#1A1A1A] text-white p-10 sm:p-16 relative overflow-hidden" data-testid="cta-banner">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-5xl font-light tracking-tighter">Ready to eat on purpose?</h2>
            <p className="mt-5 text-white/70 text-lg">Two minutes of onboarding. A plan that fits your life.</p>
            <Link to="/auth" className="mt-8 inline-flex items-center gap-2 bg-[#E26D5C] rounded-full px-8 py-4 font-medium active:scale-95 transition" data-testid="cta-start-btn">
              Get started free <ArrowRight className="w-4 h-4" strokeWidth={1.75}/>
            </Link>
          </div>
          <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-[#E26D5C]/20 blur-3xl"></div>
        </section>
      </main>
    </div>
  );
}

function CalorieRingDemo() {
  const pct = 0.62;
  const r = 72, c = 2 * Math.PI * r;
  return (
    <svg width="190" height="190" viewBox="0 0 190 190">
      <circle cx="95" cy="95" r={r} fill="none" stroke="#F2EFEB" strokeWidth="14"/>
      <circle cx="95" cy="95" r={r} fill="none" stroke="#E26D5C" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 95 95)"/>
      <text x="95" y="92" textAnchor="middle" fontFamily="Outfit" fontSize="34" fontWeight="500" fill="#1A1A1A">1,240</text>
      <text x="95" y="115" textAnchor="middle" fontFamily="Manrope" fontSize="12" fill="#6B635E">of 2,000 kcal</text>
    </svg>
  );
}

function MiniMacro({label, val, tgt, color}) {
  const pct = Math.min(100, (val / tgt) * 100);
  return (
    <div>
      <div className="text-xs text-[#6B635E]">{label}</div>
      <div className="mt-1 h-1.5 w-full bg-[#F2EFEB] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{width: `${pct}%`, backgroundColor: color}}/>
      </div>
      <div className="text-xs mt-1 font-medium">{val}g</div>
    </div>
  );
}
