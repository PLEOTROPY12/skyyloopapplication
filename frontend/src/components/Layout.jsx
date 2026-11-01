import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Users, Mountain, ReceiptText, CalendarRange, User, LogOut, ChevronRight, Menu, X, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";

const NAV = [
  { to: "/", label: "Bookings", sub: "Manage bookings quickly", icon: CalendarDays, id: "bookings" },
  { to: "/agents", label: "Agents", sub: "Manage connected agents", icon: Users, id: "agents" },
  { to: "/jumps", label: "Jump details", sub: "Record jumps at the tower", icon: Mountain, id: "jumps" },
  { to: "/transactions", label: "Transaction", sub: "Track payment movement", icon: ReceiptText, id: "transactions" },
  { to: "/calendar", label: "Calendar", sub: "Slot capacity by day", icon: CalendarRange, id: "calendar" },
  { to: "/profile", label: "Profile", sub: "Account and preferences", icon: User, id: "profile" },
];

const NavPanel = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="flex flex-col h-full">
      <div className="drawer-card rounded-2xl p-4 flex items-center gap-4 text-white shadow-lg shadow-red-900/20" data-testid="user-card">
        <div className="h-14 w-14 rounded-xl bg-white/15 border border-white/20 grid place-items-center overflow-hidden shrink-0">
          {user?.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" /> : <Award className="h-7 w-7" />}
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold truncate" data-testid="user-name">{user?.name}</p>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/80">{user?.role || "vendor"}</p>
        </div>
      </div>
      <nav className="mt-5 space-y-2 flex-1 overflow-y-auto">
        {NAV.map(({ to, label, sub, icon: Icon, id }) => (
          <NavLink key={to} to={to} end onClick={onNavigate} data-testid={`nav-${id}`}
            className={({ isActive }) => `group flex items-center gap-3 rounded-xl border p-3 transition-colors ${isActive ? "bg-brand-light border-brand/30" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
            {({ isActive }) => (
              <>
                <span className={`h-11 w-11 rounded-lg grid place-items-center shrink-0 ${isActive ? "bg-brand/15 text-brand" : "bg-slate-100 text-slate-600"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-heading font-semibold text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500 truncate">{sub}</span>
                </span>
                <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isActive ? "text-brand" : "text-slate-400"}`} />
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <button onClick={doLogout} data-testid="logout-btn"
        className="mt-4 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-light/60 p-3 text-left hover:bg-brand-light transition-colors">
        <span className="h-11 w-11 rounded-lg grid place-items-center bg-brand/10 text-brand"><LogOut className="h-5 w-5" /></span>
        <span className="flex-1">
          <span className="block font-heading font-semibold text-slate-900">Logout</span>
          <span className="block text-xs text-slate-500">Sign out from your account</span>
        </span>
        <ChevronRight className="h-4 w-4 text-brand" />
      </button>
      <p className="mt-3 px-1 text-xs font-bold text-slate-400 tracking-wide">SKY LOOOOP</p>
    </div>
  );
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const title = NAV.find((n) => n.to === loc.pathname)?.label || "Create offline booking";
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-80 bg-white border-r border-slate-200 p-5 shrink-0">
        <div className="mb-5 px-1"><Logo /></div>
        <NavPanel />
      </aside>
      {open && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setOpen(false)} data-testid="drawer-overlay" />}
      <aside className={`fixed inset-y-0 left-0 w-[86%] max-w-sm bg-white z-50 p-4 rounded-r-3xl shadow-2xl lg:hidden transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`} data-testid="mobile-drawer">
        <button className="absolute top-3 right-3 p-2 text-slate-400" onClick={() => setOpen(false)} aria-label="Close menu" data-testid="drawer-close-btn"><X className="h-5 w-5" /></button>
        <div className="pt-8 h-full"><NavPanel onNavigate={() => setOpen(false)} /></div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`${loc.pathname === "/bookings/new" ? "hidden" : "lg:hidden"} sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center gap-4 px-4`}>
          <button onClick={() => setOpen(true)} aria-label="Open menu" data-testid="drawer-open-btn"><Menu className="h-6 w-6 text-navy" /></button>
          <h1 className="font-heading text-xl font-bold text-navy" data-testid="mobile-page-title">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div key={loc.pathname} className="fade-up max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 pb-28">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
