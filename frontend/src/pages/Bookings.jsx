import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { NativeSelect, PageTitle, inputCls } from "@/components/ui-ops";
import { StatusBadge } from "@/components/StatusBadge";
import { BookingDetailDialog } from "@/components/BookingDetailDialog";
import { useOps } from "@/context/OpsContext";
import { api, inr, todayIST } from "@/lib/api";

const STATUSES = ["all", "confirmed", "checked_in", "completed", "cancelled"].map((s) => ({ value: s, label: s === "all" ? "All statuses" : s.replace("_", " ") }));

const Filters = ({ f, setF, activities }) => (
  <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
    <div className="relative lg:col-span-2">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input data-testid="bookings-search-input" className={`${inputCls} pl-9`} placeholder="Search name, code, phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
    </div>
    <input data-testid="bookings-date-input" type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
    <NativeSelect testId="bookings-status-filter" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={STATUSES} />
    <NativeSelect testId="bookings-activity-filter" value={f.activity_id} onChange={(e) => setF({ ...f, activity_id: e.target.value })}
      options={[{ value: "all", label: "All activities" }, ...activities.map((a) => ({ value: a.id, label: a.name }))]} />
  </div>
);

const BookingRow = ({ b, onOpen }) => (
  <button data-testid={`booking-row-${b.code}`} onClick={() => onOpen(b)}
    className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-800/40 md:grid-cols-[110px_1.3fr_1.4fr_70px_70px_110px_110px] md:items-center">
    <span className="font-mono text-xs text-cyan-300 md:order-none">{b.code}</span>
    <span className="justify-self-end md:hidden"><StatusBadge value={b.status} /></span>
    <span className="col-span-2 text-sm text-slate-100 md:col-span-1">{b.guest_name}<span className="block text-[11px] text-slate-500">{b.phone}</span></span>
    <span className="col-span-2 text-xs text-slate-400 md:col-span-1">{b.activity_name}{b.channel === "b2b" && <span className="ml-1.5"><StatusBadge value="b2b" /></span>}</span>
    <span className="text-xs text-slate-300">{b.slot} · {b.adults + b.kids} pax</span>
    <span className="hidden text-xs text-slate-300 md:block">{b.adults}A/{b.kids}K</span>
    <span className="justify-self-end text-sm text-slate-200 md:justify-self-start">{inr(b.amount)}</span>
    <span className="hidden md:block"><StatusBadge value={b.status} /></span>
  </button>
);

export default function Bookings() {
  const { activities, tick } = useOps();
  const [f, setF] = useState({ q: "", date: todayIST(), status: "all", activity_id: "all" });
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/bookings", { params: f }).then(({ data }) => setRows(data));
    }, 250);
    return () => clearTimeout(t);
  }, [f, tick]);

  const onChanged = (b) => {
    setOpen(b);
    setRows((r) => r.map((x) => (x.id === b.id ? b : x)));
  };

  return (
    <div data-testid="bookings-page">
      <PageTitle title="Bookings" sub={`${rows.length} booking(s) · ${inr(rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.amount, 0))}`} />
      <Filters f={f} setF={setF} activities={activities} />
      <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#111827]">
        <div className="hidden grid-cols-[110px_1.3fr_1.4fr_70px_70px_110px_110px] gap-x-3 border-b border-slate-800 px-4 py-2.5 text-[11px] uppercase tracking-wider text-slate-500 md:grid">
          <span>Code</span><span>Guest</span><span>Activity</span><span>Batch</span><span>Pax</span><span>Amount</span><span>Status</span>
        </div>
        {rows.length === 0 && <p data-testid="bookings-empty" className="p-8 text-center text-sm text-slate-500">No bookings match these filters.</p>}
        {rows.map((b) => <BookingRow key={b.id} b={b} onOpen={setOpen} />)}
      </div>
      <BookingDetailDialog booking={open} onClose={() => setOpen(null)} onChanged={onChanged} />
    </div>
  );
}
