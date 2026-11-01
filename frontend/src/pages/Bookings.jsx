import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, CalendarDays, Phone, Clock, Users, Briefcase } from "lucide-react";
import { api, errMsg, inr, todayStr } from "@/lib/api";
import { PageHeader, Card, Btn, Badge, Empty, Stat, selectCls } from "@/components/common";
import { PaymentDialog } from "@/components/PaymentDialog";

const BookingCard = ({ b, onPay, onCancel }) => (
  <Card className="p-5 hover:shadow-md transition-shadow" data-testid={`booking-card-${b.booking_no}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-slate-500">{b.booking_no}</span>
          <Badge tone={b.status === "confirmed" ? "green" : "red"}>{b.status}</Badge>
          {b.agent_name && <Badge tone="amber"><Briefcase className="h-3 w-3" />{b.agent_name}</Badge>}
        </div>
        <p className="font-heading text-lg font-bold text-navy mt-2 truncate">{b.full_name}</p>
        <p className="text-sm text-slate-500 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{b.phone}{b.city && ` · ${b.city}`}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-heading font-bold text-navy">{inr(b.total_amount)}</p>
        <p className={`text-xs font-semibold ${b.balance_due > 0 ? "text-brand" : "text-emerald-600"}`} data-testid={`booking-due-${b.booking_no}`}>
          {b.balance_due > 0 ? `Due ${inr(b.balance_due)}` : "Fully paid"}
        </p>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
      <span className="font-semibold text-slate-800">{b.activity_name}</span>
      <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{b.date}</span>
      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{b.slot}</span>
      <span className="flex items-center gap-1"><Users className="h-4 w-4" />{b.participants}</span>
    </div>
    {b.admin_note && <p className="mt-2 text-xs text-slate-500 italic">Note: {b.admin_note}</p>}
    {b.status === "confirmed" && (
      <div className="mt-4 flex gap-2">
        {b.balance_due > 0 && <Btn variant="outline" className="h-9" onClick={() => onPay(b)} data-testid={`collect-payment-btn-${b.booking_no}`}>Collect payment</Btn>}
        <Btn variant="ghost" className="h-9 text-red-600" onClick={() => onCancel(b)} data-testid={`cancel-booking-btn-${b.booking_no}`}>Cancel</Btn>
      </div>
    )}
  </Card>
);

export default function Bookings() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [payFor, setPayFor] = useState(null);

  const load = useCallback(async () => {
    const [b, s] = await Promise.all([
      api.get("/bookings", { params: { q, date, status } }),
      api.get("/stats", { params: { date: todayStr() } }),
    ]);
    setItems(b.data);
    setStats(s.data);
  }, [q, date, status]);

  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => toast.error(errMsg(e))), 250);
    return () => clearTimeout(t);
  }, [load]);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.booking_no}?`)) return;
    try {
      await api.post(`/bookings/${b.id}/cancel`);
      toast.success("Booking cancelled");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Bookings" sub="Today at the tower and every booking on record">
        <Btn onClick={() => nav("/bookings/new")} className="hidden sm:inline-flex" data-testid="new-booking-btn"><Plus className="h-4 w-4" />Offline booking</Btn>
      </PageHeader>
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat label="Today's bookings" value={stats.bookings} testid="stat-bookings" />
          <Stat label="Participants" value={stats.participants} testid="stat-participants" />
          <Stat label="Pending jumps" value={stats.pending_jumps} tone="text-brand" testid="stat-pending" />
          <Stat label="Today's value" value={inr(stats.revenue)} testid="stat-revenue" sub={`Due ${inr(stats.due)}`} />
        </div>
      )}
      <Card className="p-3 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 px-3 h-11 rounded-lg border border-slate-200">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, booking no..." className="flex-1 outline-none text-sm bg-transparent" data-testid="bookings-search-input" />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectCls} data-testid="bookings-date-filter" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} data-testid="bookings-status-filter">
          <option value="">All status</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Card>
      {items.length === 0 ? (
        <Empty icon={CalendarDays} title="No bookings found" sub="Try another filter or create an offline booking." testid="bookings-empty" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4" data-testid="bookings-list">
          {items.map((b) => <BookingCard key={b.id} b={b} onPay={setPayFor} onCancel={cancel} />)}
        </div>
      )}
      <button onClick={() => nav("/bookings/new")} aria-label="New booking" data-testid="fab-new-booking"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-2xl bg-brand text-white grid place-items-center shadow-xl shadow-red-900/30 hover:bg-brand-dark active:scale-95 transition-[background-color,transform] sm:hidden">
        <Plus className="h-7 w-7" />
      </button>
      <PaymentDialog booking={payFor} onClose={() => setPayFor(null)} onDone={load} />
    </>
  );
}
