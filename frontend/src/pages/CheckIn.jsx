import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScanLine, CheckCircle2 } from "lucide-react";
import { PageTitle, inputCls } from "@/components/ui-ops";
import { StatusBadge } from "@/components/StatusBadge";
import { useOps } from "@/context/OpsContext";
import { api, errMsg, todayIST } from "@/lib/api";

const GuestCard = ({ b, onCheckIn }) => (
  <div data-testid={`checkin-card-${b.code}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] p-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-100">{b.guest_name} <span className="ml-1 font-mono text-xs text-cyan-300">{b.code}</span></p>
      <p className="text-xs text-slate-400">{b.activity_name} · {b.slot} · {b.adults + b.kids} pax</p>
      <div className="mt-1.5 flex gap-1.5">
        <StatusBadge value={b.payment_status} />
        <span className={`rounded-md border px-2 py-0.5 text-[11px] ${b.waiver_signed ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
          Waiver {b.waiver_signed ? "signed" : "pending"}
        </span>
      </div>
    </div>
    {b.status === "confirmed" ? (
      <button data-testid={`checkin-btn-${b.code}`} onClick={() => onCheckIn(b)} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400">Check in</button>
    ) : (
      <StatusBadge value={b.status} />
    )}
  </div>
);

export default function CheckIn() {
  const { tick, bump } = useOps();
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    api.get("/bookings", { params: { date: todayIST(), status: "confirmed" } }).then(({ data }) => setPending(data));
  }, [tick]);

  const lookup = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.get(`/bookings/code/${encodeURIComponent(code)}`);
      setFound(data);
    } catch (err) {
      setFound(null);
      toast.error(errMsg(err));
    }
  };

  const checkIn = async (b) => {
    try {
      const { data } = await api.patch(`/bookings/${b.id}/status`, { status: "checked_in" });
      if (found?.id === b.id) setFound(data);
      bump();
      toast.success(`${b.guest_name} checked in`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div data-testid="checkin-page">
      <PageTitle title="Check-in" sub="Look up a booking code and check guests in" />
      <form onSubmit={lookup} className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input data-testid="checkin-search-input" className={`${inputCls} pl-9 font-mono uppercase`} placeholder="AR-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button data-testid="checkin-search-btn" className="rounded-lg bg-slate-800 px-4 text-sm text-slate-200 hover:bg-slate-700">Find</button>
      </form>
      {found && <div className="mt-4"><GuestCard b={found} onCheckIn={checkIn} /></div>}
      <h2 className="mb-3 mt-8 flex items-center gap-2 font-heading text-base md:text-lg font-semibold text-white">
        Awaiting check-in today <span data-testid="checkin-pending-count" className="rounded-full bg-slate-800 px-2 text-xs text-slate-300">{pending.length}</span>
      </h2>
      <div className="space-y-2">
        {pending.length === 0 && <p className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={16} /> Everyone is checked in.</p>}
        {pending.map((b) => <GuestCard key={b.id} b={b} onCheckIn={checkIn} />)}
      </div>
    </div>
  );
}
