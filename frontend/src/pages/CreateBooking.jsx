import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Compass, Ticket, CalendarDays, Clock, User, Phone, MapPin, ClipboardEdit, IndianRupee, Wallet, Minus, Plus, X, Briefcase, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api, errMsg, inr, todayStr } from "@/lib/api";
import { Card, Field, Btn, inputCls } from "@/components/common";

const Label = ({ children }) => <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{children}</p>;

export default function CreateBooking() {
  const nav = useNavigate();
  const [cat, setCat] = useState(null);
  const [agents, setAgents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    location_id: "loc_murudeshwara", activity_id: "", date: todayStr(), slot: "", full_name: "", phone: "",
    city: "", admin_note: "", is_agent_booking: false, agent_id: "", price_per_person: 0, participants: 1,
    advance_amount: 0, payment_mode: "Cash",
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get("/catalog").then((r) => setCat(r.data));
    api.get("/agents").then((r) => setAgents(r.data.agents));
  }, []);

  useEffect(() => {
    if (!f.activity_id || !f.date) return setSlots([]);
    api.get("/calendar/day", { params: { date: f.date, activity_id: f.activity_id } }).then((r) => setSlots(r.data.slots));
  }, [f.activity_id, f.date]);

  const activities = useMemo(() => (cat?.activities || []).filter((a) => a.location_id === f.location_id), [cat, f.location_id]);
  const total = Number(f.price_per_person || 0) * f.participants;
  const due = Math.max(total - Number(f.advance_amount || 0), 0);

  const pickActivity = (id) => {
    const a = cat.activities.find((x) => x.id === id);
    setF((s) => ({ ...s, activity_id: id, slot: "", price_per_person: a ? a.price : 0 }));
  };

  const submit = async () => {
    if (!f.activity_id || !f.slot) return toast.error("Select activity and time slot");
    if (!f.full_name.trim() || f.phone.trim().length < 6) return toast.error("Enter full name and a valid phone number");
    if (f.is_agent_booking && !f.agent_id) return toast.error("Select an agent");
    setBusy(true);
    try {
      const { data } = await api.post("/bookings", {
        ...f, price_per_person: Number(f.price_per_person), advance_amount: Number(f.advance_amount || 0),
        city: f.city || null, agent_id: f.is_agent_booking ? f.agent_id : null,
      });
      toast.success(`Booking ${data.booking_no} created`);
      nav("/");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (!cat) return null;
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => nav(-1)} aria-label="Back" data-testid="back-btn" className="p-2 -ml-2 rounded-lg hover:bg-slate-100"><ArrowLeft className="h-6 w-6 text-navy" /></button>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy">Create offline booking</h1>
      </div>
      <div className="space-y-5">
        <Card className="p-4 space-y-3">
          <Field icon={Compass}>
            <select value={f.location_id} onChange={(e) => setF((s) => ({ ...s, location_id: e.target.value, activity_id: "", slot: "" }))} className={inputCls} data-testid="location-select">
              <option value="">Select location</option>
              {cat.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {f.location_id && <button onClick={() => set("location_id", "")} aria-label="Clear location" data-testid="clear-location-btn"><X className="h-4 w-4 text-slate-400" /></button>}
          </Field>
          <Field icon={Ticket}>
            <select value={f.activity_id} onChange={(e) => pickActivity(e.target.value)} className={inputCls} data-testid="activity-select">
              <option value="">Select activity</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.name} · {inr(a.price)}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field icon={CalendarDays}>
              <input type="date" value={f.date} min={todayStr()} onChange={(e) => setF((s) => ({ ...s, date: e.target.value, slot: "" }))} className={inputCls} data-testid="date-input" />
            </Field>
            <Field icon={Clock}>
              <select value={f.slot} onChange={(e) => set("slot", e.target.value)} className={inputCls} data-testid="slot-select">
                <option value="">Select slot</option>
                {slots.map((s) => {
                  const left = s.capacity - s.booked;
                  return <option key={s.slot} value={s.slot} disabled={left <= 0}>{s.slot} ({left > 0 ? `${left} left` : "Full"})</option>;
                })}
              </select>
            </Field>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <Field icon={User}><input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Full name" className={inputCls} data-testid="full-name-input" /></Field>
          <Field icon={Phone}><input value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^0-9+]/g, ""))} placeholder="Phone number" inputMode="tel" className={inputCls} data-testid="phone-input" /></Field>
          <Field icon={MapPin}>
            <select value={f.city} onChange={(e) => set("city", e.target.value)} className={inputCls} data-testid="city-select">
              <option value="">Select city (optional)</option>
              {cat.cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field icon={ClipboardEdit}><input value={f.admin_note} onChange={(e) => set("admin_note", e.target.value)} placeholder="Admin note" className={inputCls} data-testid="admin-note-input" /></Field>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-heading font-semibold text-slate-800">Is Agent Booking</p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">{f.is_agent_booking ? "ON" : "OFF"}</span>
              <Switch checked={f.is_agent_booking} onCheckedChange={(v) => set("is_agent_booking", v)} className="data-[state=checked]:bg-brand" data-testid="agent-booking-switch" />
            </div>
          </div>
          {f.is_agent_booking && (
            <Field icon={Briefcase}>
              <select value={f.agent_id} onChange={(e) => set("agent_id", e.target.value)} className={inputCls} data-testid="agent-select">
                <option value="">Select agent</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.commission_pct}%)</option>)}
              </select>
            </Field>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price per person (INR)</Label>
              <Field icon={IndianRupee}><input type="number" min="0" value={f.price_per_person} onChange={(e) => set("price_per_person", e.target.value)} className={inputCls} data-testid="price-input" /></Field>
            </div>
            <div>
              <Label>Participants</Label>
              <div className="flex items-center justify-between h-14 px-2 rounded-xl border border-slate-200 bg-slate-50">
                <button onClick={() => set("participants", Math.max(1, f.participants - 1))} aria-label="Decrease" data-testid="participants-minus-btn" className="p-2 text-slate-500"><Minus className="h-5 w-5" /></button>
                <span className="font-heading font-bold text-lg" data-testid="participants-count">{f.participants}</span>
                <button onClick={() => set("participants", Math.min(50, f.participants + 1))} aria-label="Increase" data-testid="participants-plus-btn" className="p-2 text-slate-700"><Plus className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
          <div>
            <Label>Advance Amount (INR)</Label>
            <Field icon={Wallet}><input type="number" min="0" value={f.advance_amount} onChange={(e) => set("advance_amount", e.target.value)} className={inputCls} data-testid="advance-input" /></Field>
          </div>
          {Number(f.advance_amount) > 0 && (
            <Field icon={CreditCard}>
              <select value={f.payment_mode} onChange={(e) => set("payment_mode", e.target.value)} className={inputCls} data-testid="payment-mode-select">
                {cat.modes.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          )}
          <div className="rounded-xl bg-slate-50 border border-dashed border-slate-300 p-4 grid grid-cols-2 gap-2 text-sm">
            <span className="text-slate-500">Total</span><span className="text-right font-heading font-bold text-navy" data-testid="summary-total">{inr(total)}</span>
            <span className="text-slate-500">Balance due</span><span className="text-right font-heading font-bold text-brand" data-testid="summary-due">{inr(due)}</span>
          </div>
        </Card>
        <Btn className="w-full h-14 text-base" onClick={submit} disabled={busy} data-testid="create-booking-submit-btn">{busy ? "Saving..." : "Create booking"}</Btn>
      </div>
    </div>
  );
}
