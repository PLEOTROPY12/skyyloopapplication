import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ShieldCheck, CalendarCheck, Users } from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1549221360-456a9c197d5b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

export default function Login() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/" replace />;

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="relative hidden lg:block">
        <img src={HERO} alt="Bungee jump" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#4a140f]/90 via-[#7B241C]/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white fade-up">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Vendor console</p>
          <h2 className="font-heading text-5xl font-extrabold mt-3 leading-tight">Run the tower.<br />Not the paperwork.</h2>
        </div>
      </div>
      <div className="flex flex-col justify-center px-6 sm:px-16 py-12">
        <div className="max-w-md w-full fade-up">
          <Logo />
          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mt-10">
            Welcome back
          </h1>
          <p className="text-slate-600 mt-3">Sign in to manage bookings, agents, jumps and payments.</p>
          <button
            data-testid="google-login-btn"
            onClick={login}
            className="mt-10 w-full flex items-center justify-center gap-3 rounded-xl bg-brand text-white font-semibold py-4 shadow-lg shadow-red-900/20 hover:bg-brand-dark active:scale-[0.98] transition-[background-color,transform]"
          >
            <svg className="h-5 w-5 bg-white rounded-full p-0.5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
            Continue with Google
          </button>
          <div className="mt-12 grid grid-cols-3 gap-3 text-xs text-slate-600">
            {[[CalendarCheck, "Slot capacity"], [Users, "Agent ledger"], [ShieldCheck, "Jump records"]].map(([I, t]) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-3">
                <I className="h-5 w-5 text-brand mb-2" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
