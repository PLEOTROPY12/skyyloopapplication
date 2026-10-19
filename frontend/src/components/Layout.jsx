import { NavLink, Outlet } from "react-router-dom";
import { Anchor, LayoutDashboard, ConciergeBell, CalendarCheck, ScanLine, ClipboardList, AlertTriangle } from "lucide-react";
import { useOps } from "@/context/OpsContext";
import { NotificationsSheet } from "@/components/NotificationsSheet";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { to: "/front-desk", label: "Front Desk", icon: ConciergeBell, id: "front-desk" },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck, id: "bookings" },
  { to: "/check-in", label: "Check-in", icon: ScanLine, id: "checkin" },
  { to: "/manifest", label: "Manifest", icon: ClipboardList, id: "manifest" },
];

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
    isActive ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
  }`;

const Header = () => (
  <header data-testid="app-header" className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-[#0F172A] px-4">
    <div data-testid="brand-logo" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/90 text-slate-950"><Anchor size={16} /></span>
      <span className="font-heading text-base font-semibold text-white">AquaOps</span>
      <span className="hidden sm:inline text-xs text-slate-500">· Aqua Ride Watersports</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="hidden md:inline rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300" data-testid="owner-badge">Owner</span>
      <NotificationsSheet />
    </div>
  </header>
);

const Sidebar = () => (
  <aside className="no-print hidden lg:flex w-64 shrink-0 flex-col gap-1 border-r border-slate-800 bg-[#0F172A] p-4">
    <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">Operations</p>
    {NAV.map(({ to, label, icon: Icon, id }) => (
      <NavLink key={id} to={to} end className={linkCls} data-testid={`side-tab-${id}`}>
        <Icon size={18} /> {label}
      </NavLink>
    ))}
  </aside>
);

const BottomNav = () => (
  <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-800 bg-[#0F172A] pb-[env(safe-area-inset-bottom)] lg:hidden">
    {NAV.map(({ to, label, icon: Icon, id }) => (
      <NavLink
        key={id}
        to={to}
        end
        data-testid={`nav-tab-${id}`}
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-200 ${isActive ? "text-cyan-300" : "text-slate-400"}`
        }
      >
        <Icon size={20} /> {label}
      </NavLink>
    ))}
  </nav>
);

const PauseBanner = () => {
  const { pausedCount, allPaused } = useOps();
  if (!pausedCount) return null;
  return (
    <div data-testid="pause-banner" className="no-print flex items-center gap-2 border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
      <AlertTriangle size={14} />
      {allPaused ? "Emergency pause active — all activities halted" : `${pausedCount} activit${pausedCount > 1 ? "ies" : "y"} paused`}
    </div>
  );
};

export const Layout = () => (
  <div className="min-h-screen bg-[#090D16] text-slate-100">
    <Header />
    <PauseBanner />
    <div className="flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10">
        <Outlet />
      </main>
    </div>
    <BottomNav />
  </div>
);
