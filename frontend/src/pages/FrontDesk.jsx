import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Ticket, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, NativeSelect, PageTitle, inputCls } from "@/components/ui-ops";
import { useOps } from "@/context/OpsContext";
import { api, errMsg, inr, todayIST } from "@/lib/api";

const EMPTY = { guest_name: "", phone: "", email: "", adults: 1, kids: 0, channel: "retail", agent_name: "", payment_status: "paid", payment_mode: "UPI", waiver_signed: false, notes: "" };

const Voucher = ({ booking, onClose }) => (
  <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
    <DialogContent data-testid="voucher-dialog" className="border-slate-800 bg-[#0F172A] text-slate-100">
      <DialogHeader><DialogTitle className="text-white">Booking voucher</DialogTitle></DialogHeader>
      {booking && (
        <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm">
          <p className="font-mono text-2xl font-bold text-cyan-300" data-testid="voucher-code">{booking.code}</p>
          <p className="mt-2 text-slate-200">{booking.guest_name} · {booking.phone}</p>
          <p className="text-slate-400">{booking.activity_name} — {booking.date} at {booking.slot}</p>
          <p className="text-slate-400">{booking.adults} adult(s), {booking.kids} kid(s)</p>
          <p className="mt-2 text-slate-200">Total {inr(booking.amount)} · Paid {inr(booking.paid_amount)}</p>
        </div>
      )}
      <button data-testid="voucher-print-btn" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
        <Printer size={16} /> Print voucher
      </button>
    </DialogContent>
  </Dialog>
);

export default function FrontDesk() {
  const { activities, slots, bump } = useOps();
  const [activityId, setActivityId] = useState("");
  const [date, setDate] = useState(todayIST());
  const [slot, setSlot] = useState("");
  const [avail, setAvail] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState(null);

  const live = activities.filter((a) => !a.paused);
  const act = activities.find((a) => a.id === activityId);
  const pax = Number(f.adults) + Number(f.kids);
  const total = useMemo(() => (act ? act.price * pax : 0), [act, pax]);

  useEffect(() => {
    if (!activityId && live.length) setActivityId(live[0].id);
  }, [live, activityId]);

  useEffect(() => {
    if (!activityId) { return; }
    api.get("/availability", { params: { activity_id: activityId, date } }).then(({ data }) => setAvail(data));
  }, [activityId, date, voucher]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!slot) { toast.error("Pick a time slot"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/bookings", { ...f, adults: Number(f.adults), kids: Number(f.kids), activity_id: activityId, date, slot });
      setVoucher(data);
      setF(EMPTY);
      setSlot("");
      bump();
      toast.success(`Booking ${data.code} created`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="front-desk-page">
      <PageTitle title="Front Desk" sub="Register walk-in guests and issue vouchers" />
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5 rounded-2xl border border-slate-800/80 bg-[#111827] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Activity">
              <NativeSelect testId="walkin-activity-select" value={activityId} onChange={(e) => { setActivityId(e.target.value); setSlot(""); }}
                options={activities.map((a) => ({ value: a.id, label: `${a.name} — ${inr(a.price)}${a.paused ? " (paused)" : ""}`, disabled: a.paused }))} />
            </Field>
            <Field label="Date"><input data-testid="walkin-date-input" type="date" className={inputCls} value={date} min={todayIST()} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Time slot</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(avail.length ? avail : slots.map((s) => ({ slot: s, left: 0 }))).map((a) => (
                <button type="button" key={a.slot} data-testid={`walkin-slot-${a.slot.replace(":", "")}`} disabled={a.left < pax}
                  onClick={() => setSlot(a.slot)}
                  className={`rounded-lg border px-2 py-2 text-center transition-colors disabled:opacity-40 ${slot === a.slot ? "border-cyan-500 bg-cyan-500/10 text-cyan-300" : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600"}`}>
                  <span className="block text-sm font-semibold">{a.slot}</span>
                  <span className="block text-[10px] text-slate-500">{a.left} left</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest name"><input data-testid="walkin-name-input" required className={inputCls} value={f.guest_name} onChange={set("guest_name")} placeholder="Full name" /></Field>
            <Field label="Phone"><input data-testid="walkin-phone-input" required minLength={5} className={inputCls} value={f.phone} onChange={set("phone")} placeholder="+91" /></Field>
            <Field label="Adults"><input data-testid="walkin-adults-input" type="number" min={1} className={inputCls} value={f.adults} onChange={set("adults")} /></Field>
            <Field label="Kids"><input data-testid="walkin-kids-input" type="number" min={0} className={inputCls} value={f.kids} onChange={set("kids")} /></Field>
            <Field label="Channel">
              <NativeSelect testId="walkin-channel-select" value={f.channel} onChange={set("channel")} options={[{ value: "retail", label: "Retail customer" }, { value: "b2b", label: "B2B travel agent" }]} />
            </Field>
            {f.channel === "b2b" && <Field label="Agent name"><input data-testid="walkin-agent-input" className={inputCls} value={f.agent_name} onChange={set("agent_name")} /></Field>}
            <Field label="Payment">
              <NativeSelect testId="walkin-payment-status-select" value={f.payment_status} onChange={set("payment_status")} options={[{ value: "paid", label: "Paid in full" }, { value: "advance", label: "10% advance" }, { value: "pending", label: "Pending" }]} />
            </Field>
            <Field label="Payment mode">
              <NativeSelect testId="walkin-payment-mode-select" value={f.payment_mode} onChange={set("payment_mode")} options={["UPI", "Card", "Cash"].map((m) => ({ value: m, label: m }))} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input data-testid="walkin-waiver-checkbox" type="checkbox" checked={f.waiver_signed} onChange={set("waiver_signed")} className="accent-cyan-500" /> Safety waiver signed
          </label>
        </div>
        <aside className="h-fit space-y-3 rounded-2xl border border-slate-800/80 bg-[#111827] p-5 lg:sticky lg:top-20">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Summary</p>
          <p className="text-sm text-slate-300">{act?.name || "—"}</p>
          <p className="text-sm text-slate-400">{date} · {slot || "no slot"} · {pax} pax</p>
          <p className="font-heading text-3xl font-bold text-emerald-400" data-testid="walkin-total">{inr(total)}</p>
          <button data-testid="walkin-booking-submit-btn" disabled={busy || !live.length} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-colors hover:bg-cyan-400 disabled:opacity-50">
            <Ticket size={16} /> {busy ? "Booking…" : "Create booking"}
          </button>
          {!live.length && <p className="text-xs text-rose-400">All activities are paused.</p>}
        </aside>
      </form>
      <Voucher booking={voucher} onClose={() => setVoucher(null)} />
    </div>
  );
}
