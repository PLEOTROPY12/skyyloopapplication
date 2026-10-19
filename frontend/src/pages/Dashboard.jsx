import { useEffect, useState } from "react";
import { Anchor, CalendarCheck, Users, IndianRupee, ScanLine, BarChart3, ShieldAlert, Pause, Play } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/StatCard";
import { useOps } from "@/context/OpsContext";
import { api, inr } from "@/lib/api";

const EmergencyControls = () => {
  const { pauseAll, resumeAll, allPaused } = useOps();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button data-testid="emergency-pause-button" disabled={allPaused} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition-colors hover:bg-rose-500 disabled:opacity-50">
            <Pause size={16} /> Emergency Pause
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-slate-800 bg-[#0F172A] text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Pause all activities?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              New bookings will be blocked for every activity until you resume operations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="emergency-pause-cancel" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="emergency-pause-confirm" onClick={pauseAll} className="bg-rose-600 hover:bg-rose-500">Pause everything</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <button data-testid="resume-all-button" onClick={resumeAll} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800">
        <Play size={16} /> Resume All
      </button>
    </div>
  );
};

const ActivityToggles = () => {
  const { activities, toggle } = useOps();
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#111827] p-5">
      <h2 className="font-heading text-base md:text-lg font-semibold text-white">Activity status</h2>
      <p className="text-xs text-slate-500">Pause a single activity for weather or maintenance</p>
      <ul className="mt-4 divide-y divide-slate-800">
        {activities.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-200">{a.name}</p>
              <p className="text-[11px] text-slate-500">{inr(a.price)} · {a.duration} · {a.capacity}/batch</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${a.paused ? "text-rose-400" : "text-emerald-400"}`}>{a.paused ? "Paused" : "Live"}</span>
              <Switch data-testid={`activity-toggle-${a.id}`} checked={!a.paused} onCheckedChange={() => toggle(a.id)} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

const SlotChart = ({ data }) => (
  <section className="rounded-2xl border border-slate-800/80 bg-[#111827] p-5" data-testid="slot-chart">
    <h2 className="font-heading text-base md:text-lg font-semibold text-white">Guests by batch</h2>
    <p className="text-xs text-slate-500">Arrivals across today's time slots</p>
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="slot" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 8, color: "#f8fafc" }} />
          <Bar dataKey="guests" fill="#06B6D4" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

const RevenueByActivity = ({ items, total }) => (
  <section className="rounded-2xl border border-slate-800/80 bg-[#111827] p-5" data-testid="revenue-by-activity">
    <h2 className="font-heading text-base md:text-lg font-semibold text-white">Revenue by activity</h2>
    <ul className="mt-4 space-y-3">
      {items.length === 0 && <li className="text-sm text-slate-500">No revenue yet today.</li>}
      {items.map((i) => (
        <li key={i.name}>
          <div className="flex justify-between text-xs"><span className="text-slate-300">{i.name}</span><span className="text-slate-400">{inr(i.revenue)}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${(100 * i.revenue) / (total || 1)}%` }} /></div>
        </li>
      ))}
    </ul>
  </section>
);

export default function Dashboard() {
  const { tick } = useOps();
  const [s, setS] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setS(data));
  }, [tick]);

  return (
    <div data-testid="dashboard-page">
      <h1 className="flex items-center gap-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
        <Anchor size={22} className="text-cyan-400" /> Control Center
      </h1>
      <p className="mt-1 text-sm text-slate-400" data-testid="dashboard-date">Real-time operations for {s?.date || "…"}</p>
      <EmergencyControls />
      {s && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            <StatCard delay={0} testId="metric-card-todays-bookings" title="Today's Bookings" value={s.todays_bookings} icon={CalendarCheck} sub={`${s.total_bookings} total · ${s.cancelled} cancelled`} />
            <StatCard delay={60} testId="metric-card-total-guests" title="Total Guests" value={s.total_guests} icon={Users} sub={`Retail: ${s.retail_bookings} · B2B: ${s.b2b_bookings}`} />
            <StatCard delay={120} testId="metric-card-revenue-today" title="Revenue Today" value={inr(s.revenue)} accent="text-emerald-400" icon={IndianRupee} sub={`Collected ${inr(s.collected)}`} />
            <StatCard delay={180} testId="metric-card-checkins" title="Check-ins" value={`${s.checked_in} / ${s.todays_bookings}`} icon={ScanLine} sub={`${s.checkin_pct}% checked in`} />
            <StatCard delay={240} testId="metric-card-capacity" title="Total Capacity" value={s.capacity} icon={BarChart3} sub={`${s.confirmed_guests} confirmed across ${s.batches} batches`}>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${Math.min(100, (100 * s.confirmed_guests) / (s.capacity || 1))}%` }} /></div>
            </StatCard>
            <StatCard delay={300} testId="metric-card-closures" title="Active Closures" value={s.active_closures} accent={s.active_closures ? "text-rose-400" : "text-white"} icon={ShieldAlert} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <SlotChart data={s.by_slot} />
            <RevenueByActivity items={s.by_activity} total={s.revenue} />
          </div>
        </>
      )}
      <div className="mt-6"><ActivityToggles /></div>
    </div>
  );
}
