import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { api, errMsg, todayStr } from "@/lib/api";
import { PageHeader, Card, Btn, selectCls } from "@/components/common";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SlotRow = ({ s, onSave }) => {
  const [cap, setCap] = useState(s.capacity);
  useEffect(() => setCap(s.capacity), [s.capacity]);
  const full = s.booked >= s.capacity;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0" data-testid={`slot-row-${s.slot}`}>
      <div className="flex-1">
        <p className="font-semibold text-navy">{s.slot}</p>
        <p className={`text-xs ${full ? "text-brand font-semibold" : "text-slate-500"}`}>{s.booked}/{s.capacity} filled{full && " · FULL"}</p>
      </div>
      <div className="flex items-center border border-slate-200 rounded-lg">
        <button className="p-2" onClick={() => setCap(Math.max(0, cap - 1))} aria-label="Decrease capacity" data-testid={`cap-minus-${s.slot}`}><Minus className="h-4 w-4" /></button>
        <span className="w-8 text-center font-bold" data-testid={`cap-value-${s.slot}`}>{cap}</span>
        <button className="p-2" onClick={() => setCap(cap + 1)} aria-label="Increase capacity" data-testid={`cap-plus-${s.slot}`}><Plus className="h-4 w-4" /></button>
      </div>
      <Btn variant="outline" className="h-9 px-3" disabled={cap === s.capacity} onClick={() => onSave(s.slot, cap)} data-testid={`cap-save-${s.slot}`}>Save</Btn>
    </div>
  );
};

export default function CalendarPage() {
  const [acts, setActs] = useState([]);
  const [activity, setActivity] = useState("act_bungee");
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [days, setDays] = useState([]);
  const [sel, setSel] = useState(todayStr());
  const [slots, setSlots] = useState([]);

  useEffect(() => { api.get("/catalog").then((r) => setActs(r.data.activities)); }, []);
  const loadMonth = useCallback(() => api.get("/calendar", { params: { month, activity_id: activity } }).then((r) => setDays(r.data.days)), [month, activity]);
  const loadDay = useCallback(() => api.get("/calendar/day", { params: { date: sel, activity_id: activity } }).then((r) => setSlots(r.data.slots)), [sel, activity]);
  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { loadDay(); }, [loadDay]);

  const shift = (n) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const save = async (slot, capacity) => {
    try {
      await api.put("/calendar/capacity", { date: sel, activity_id: activity, slot, capacity });
      toast.success(`Capacity for ${slot} updated`);
      loadDay(); loadMonth();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const [y, m] = month.split("-").map(Number);
  const offset = new Date(y, m - 1, 1).getDay();
  const label = new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendar" sub="Slot capacity by day">
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className={selectCls} data-testid="calendar-activity-select">
          {acts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </PageHeader>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Previous month" data-testid="prev-month-btn"><ChevronLeft className="h-5 w-5" /></button>
            <p className="font-heading font-bold text-lg text-navy" data-testid="calendar-month-label">{label}</p>
            <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Next month" data-testid="next-month-btn"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEK.map((w) => <span key={w} className="text-xs font-bold text-slate-400 py-1">{w}</span>)}
            {Array.from({ length: offset }).map((_, i) => <span key={`e${i}`} />)}
            {days.map((d) => {
              const pct = d.capacity ? d.booked / d.capacity : 0;
              const active = d.date === sel;
              return (
                <button key={d.date} onClick={() => setSel(d.date)} data-testid={`calendar-day-${d.date}`}
                  className={`aspect-square rounded-xl border p-1 flex flex-col items-center justify-center transition-colors ${active ? "border-brand bg-brand-light" : "border-slate-100 hover:bg-slate-50"}`}>
                  <span className={`text-sm font-semibold ${d.date === todayStr() ? "text-brand" : "text-navy"}`}>{Number(d.date.slice(8))}</span>
                  <span className="text-[10px] text-slate-500 hidden sm:block">{d.booked}/{d.capacity}</span>
                  <span className="w-3/4 h-1 rounded-full bg-slate-100 mt-1 overflow-hidden">
                    <span className={`block h-full ${pct >= 1 ? "bg-brand" : pct > 0.6 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="p-4 sm:p-6" data-testid="day-slots-panel">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Slots</p>
          <p className="font-heading font-bold text-xl text-navy mb-2" data-testid="selected-day-label">{sel}</p>
          {slots.map((s) => <SlotRow key={s.slot} s={s} onSave={save} />)}
        </Card>
      </div>
    </>
  );
}
