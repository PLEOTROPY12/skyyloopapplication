import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Field, NativeSelect, PageTitle, inputCls } from "@/components/ui-ops";
import { StatusBadge } from "@/components/StatusBadge";
import { useOps } from "@/context/OpsContext";
import { api, todayIST } from "@/lib/api";

const Roster = ({ m }) => (
  <div className="print-area overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#111827]">
    <div className="border-b border-slate-800 p-4">
      <p className="font-heading text-lg font-semibold text-white" data-testid="manifest-title">{m.activity.name}</p>
      <p className="text-xs text-slate-400">Aqua Ride Watersports · {m.date} · Batch {m.slot} · <span data-testid="manifest-guest-count">{m.guests}</span> / {m.activity.capacity} guests</p>
    </div>
    <table className="w-full min-w-[640px] text-sm">
      <thead className="text-[11px] uppercase tracking-wider text-slate-500">
        <tr className="border-b border-slate-800">
          {["#", "Code", "Guest", "Phone", "Pax", "Waiver", "Payment", "Status"].map((h) => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {m.bookings.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500" data-testid="manifest-empty">No guests in this batch.</td></tr>}
        {m.bookings.map((b, i) => (
          <tr key={b.id} className="border-b border-slate-800/70" data-testid={`manifest-row-${b.code}`}>
            <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-cyan-300">{b.code}</td>
            <td className="px-4 py-2.5 text-slate-100">{b.guest_name}</td>
            <td className="px-4 py-2.5 text-slate-400">{b.phone}</td>
            <td className="px-4 py-2.5 text-slate-300">{b.adults}A / {b.kids}K</td>
            <td className={`px-4 py-2.5 ${b.waiver_signed ? "text-emerald-400" : "text-amber-400"}`}>{b.waiver_signed ? "Signed" : "Pending"}</td>
            <td className="px-4 py-2.5"><StatusBadge value={b.payment_status} /></td>
            <td className="px-4 py-2.5"><StatusBadge value={b.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function Manifest() {
  const { activities, slots, tick } = useOps();
  const [date, setDate] = useState(todayIST());
  const [aid, setAid] = useState("aqua-plus");
  const [slot, setSlot] = useState("08:00");
  const [m, setM] = useState(null);

  useEffect(() => {
    let stale = false;
    api.get("/manifest", { params: { date, activity_id: aid, slot } })
      .then(({ data }) => { if (!stale) setM(data); })
      .catch(() => { if (!stale) setM(null); });
    return () => { stale = true; };
  }, [date, aid, slot, tick]);

  return (
    <div data-testid="manifest-page">
      <PageTitle title="Manifest" sub="Passenger roster per activity batch">
        <button data-testid="print-manifest-btn" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
          <Printer size={16} /> Print manifest
        </button>
      </PageTitle>
      <div className="no-print mb-4 grid gap-3 sm:grid-cols-3">
        <Field label="Date"><input data-testid="manifest-date-input" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Activity"><NativeSelect testId="manifest-activity-select" value={aid} onChange={(e) => setAid(e.target.value)} options={activities.map((a) => ({ value: a.id, label: a.name }))} /></Field>
        <Field label="Batch"><NativeSelect testId="manifest-slot-select" value={slot} onChange={(e) => setSlot(e.target.value)} options={slots.map((s) => ({ value: s, label: s }))} /></Field>
      </div>
      {m && <Roster m={m} />}
    </div>
  );
}
