import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Filter, Mountain, Check, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errMsg, inr, todayStr, fmtDateTime } from "@/lib/api";
import { PageHeader, Card, Btn, Badge, Empty, selectCls } from "@/components/common";

const JumpRow = ({ j, onMark }) => {
  const [w, setW] = useState("");
  const done = j.status === "completed";
  return (
    <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`jump-row-${j.pid}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-slate-500">{j.booking_no}</span>
          <Badge tone="brand">{j.activity_name}</Badge>
          {j.balance_due > 0 && <Badge tone="red">Due {inr(j.balance_due)}</Badge>}
        </div>
        <p className="font-heading font-bold text-navy mt-1">{j.name}</p>
        <p className="text-xs text-slate-500">{j.phone} · {j.date} · {j.slot}{done && ` · Jumped ${fmtDateTime(j.jumped_at)}${j.weight ? ` · ${j.weight} kg` : ""}`}</p>
      </div>
      {done ? (
        <Btn variant="outline" className="h-9" onClick={() => onMark(j, "pending")} data-testid={`undo-jump-btn-${j.pid}`}><RotateCcw className="h-4 w-4" />Undo</Btn>
      ) : (
        <div className="flex gap-2">
          <input type="number" placeholder="Weight kg" value={w} onChange={(e) => setW(e.target.value)} className={`${selectCls} w-28 h-9`} data-testid={`jump-weight-input-${j.pid}`} />
          <Btn className="h-9" onClick={() => onMark(j, "completed", w)} data-testid={`mark-jumped-btn-${j.pid}`}><Check className="h-4 w-4" />Jumped</Btn>
        </div>
      )}
    </Card>
  );
};

export default function Jumps() {
  const [tab, setTab] = useState("pending");
  const [q, setQ] = useState("");
  const [date, setDate] = useState(todayStr());
  const [activity, setActivity] = useState("");
  const [acts, setActs] = useState([]);
  const [data, setData] = useState({ pending: [], completed: [] });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => { api.get("/catalog").then((r) => setActs(r.data.activities)); }, []);
  const load = useCallback(() => api.get("/jumps", { params: { q, date, activity_id: activity } }).then((r) => setData(r.data)), [q, date, activity]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const mark = async (j, status, weight) => {
    try {
      await api.patch(`/jumps/${j.booking_id}/${j.pid}`, { status, weight: weight ? Number(weight) : null });
      toast.success(status === "completed" ? `${j.name} jumped` : "Moved back to pending");
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const list = data[tab];
  const filtered = date || activity;
  return (
    <>
      <PageHeader title="Jump details" sub={`Record jumps at the tower · ${date || "All dates"}`}>
        <button onClick={() => setFilterOpen(true)} className="relative p-2 rounded-lg hover:bg-slate-100" aria-label="Filters" data-testid="jump-filter-btn">
          <Filter className="h-6 w-6 text-navy" />
          {filtered && <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-brand" />}
        </button>
      </PageHeader>
      <Card className="p-3 mb-4 flex items-center gap-3 px-4">
        <Search className="h-5 w-5 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, booking no..." className="flex-1 h-10 outline-none bg-transparent" data-testid="jump-search-input" />
      </Card>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl border border-slate-200 bg-white mb-6">
        {["pending", "completed"].map((t) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`jump-tab-${t}`}
            className={`h-12 rounded-xl font-heading font-semibold capitalize transition-colors ${tab === t ? "bg-brand text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>
            {t} ({data[t].length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty icon={Mountain} title={`No ${tab} participants for these filters`} sub="Use search above or tap Filters." testid="jumps-empty" />
      ) : (
        <div className="space-y-3" data-testid="jumps-list">{list.map((j) => <JumpRow key={j.pid} j={j} onMark={mark} />)}</div>
      )}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent data-testid="jump-filter-dialog">
          <DialogHeader><DialogTitle className="font-heading">Filters</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${selectCls} w-full`} data-testid="jump-date-filter" />
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className={`${selectCls} w-full`} data-testid="jump-activity-filter">
              <option value="">All activities</option>
              {acts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex gap-2">
              <Btn variant="outline" className="flex-1" onClick={() => { setDate(""); setActivity(""); }} data-testid="jump-filter-clear-btn">Clear</Btn>
              <Btn className="flex-1" onClick={() => setFilterOpen(false)} data-testid="jump-filter-apply-btn">Apply</Btn>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
