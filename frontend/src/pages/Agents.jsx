import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Download, UserPlus, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errMsg, inr } from "@/lib/api";
import { PageHeader, Card, Btn, Badge, Empty, selectCls } from "@/components/common";

const downloadCsv = (agents) => {
  const rows = [["Name", "Phone", "Email", "GST", "Commission %", "Balance (INR)"],
    ...agents.map((a) => [a.name, a.phone, a.email, a.gst_number, a.commission_pct, a.balance])];
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "sky-loooop-agents.csv" });
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Agents exported");
};

const AddAgent = ({ open, onClose, onDone }) => {
  const [f, setF] = useState({ name: "", phone: "", email: "", gst_number: "", commission_pct: 10 });
  const submit = async () => {
    try {
      await api.post("/agents", { ...f, commission_pct: Number(f.commission_pct) });
      toast.success("Agent added");
      setF({ name: "", phone: "", email: "", gst_number: "", commission_pct: 10 });
      onClose(); onDone();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const fields = [["name", "Agent / agency name"], ["phone", "Phone number"], ["email", "Email (optional)"], ["gst_number", "GST number (optional)"], ["commission_pct", "Commission %"]];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="add-agent-dialog">
        <DialogHeader><DialogTitle className="font-heading">Add agent</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map(([k, p]) => (
            <input key={k} placeholder={p} value={f[k]} type={k === "commission_pct" ? "number" : "text"} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={`${selectCls} w-full`} data-testid={`agent-${k}-input`} />
          ))}
          <Btn className="w-full" onClick={submit} data-testid="add-agent-submit-btn">Save agent</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Settle = ({ agent, onClose, onDone }) => {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState("received");
  const submit = async () => {
    try {
      await api.post(`/agents/${agent.id}/settle`, { amount: Number(amount), direction, mode: "Cash" });
      toast.success("Agent balance adjusted");
      setAmount(""); onClose(); onDone();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="settle-dialog">
        <DialogHeader><DialogTitle className="font-heading">Settle with {agent?.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Current balance: <b>{inr(agent?.balance)}</b></p>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className={`${selectCls} w-full`} data-testid="settle-direction-select">
            <option value="received">Received from agent</option>
            <option value="paid">Paid to agent</option>
          </select>
          <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${selectCls} w-full`} data-testid="settle-amount-input" />
          <Btn className="w-full" onClick={submit} data-testid="settle-submit-btn">Save</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Agents() {
  const [d, setD] = useState({ agents: [], total_payable: 0, total_receivable: 0 });
  const [p, setP] = useState({ q: "", balance: "all", gst: "all", sort: "default" });
  const [adding, setAdding] = useState(false);
  const [settle, setSettle] = useState(null);
  const load = useCallback(() => api.get("/agents", { params: p }).then((r) => setD(r.data)), [p]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Agents" sub="Connected agents and what's owed either way" />
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-6 border-red-200">
          <p className="text-slate-600">Total payable</p>
          <p className="font-heading text-4xl font-bold text-red-700 mt-2" data-testid="total-payable">{inr(d.total_payable)}</p>
          <p className="text-sm text-slate-500 mt-2">Sum of negative balances (amounts owed to agents)</p>
        </Card>
        <Card className="p-6 border-emerald-200">
          <p className="text-slate-600">Total receivable</p>
          <p className="font-heading text-4xl font-bold text-emerald-700 mt-2" data-testid="total-receivable">{inr(d.total_receivable)}</p>
          <p className="text-sm text-slate-500 mt-2">Sum of positive balances (net in your favour)</p>
        </Card>
      </div>
      <Card className="p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px] flex items-center gap-3 px-3 h-11 rounded-lg border border-slate-200">
          <Search className="h-4 w-4 text-brand" />
          <input value={p.q} onChange={set("q")} placeholder="Search by name, email, or phone..." className="flex-1 outline-none text-sm bg-transparent" data-testid="agents-search-input" />
        </div>
        <select value={p.balance} onChange={set("balance")} className={selectCls} data-testid="agents-balance-filter">
          <option value="all">Balance: All rows</option><option value="positive">Receivable</option><option value="negative">Payable</option><option value="zero">Settled</option>
        </select>
        <select value={p.gst} onChange={set("gst")} className={selectCls} data-testid="agents-gst-filter">
          <option value="all">GST: All agents</option><option value="with">With GST</option><option value="without">Without GST</option>
        </select>
        <select value={p.sort} onChange={set("sort")} className={selectCls} data-testid="agents-sort-select">
          <option value="default">Default order</option><option value="name">Name A-Z</option><option value="balance_desc">Balance high-low</option><option value="balance_asc">Balance low-high</option>
        </select>
        <Btn variant="outline" onClick={() => downloadCsv(d.agents)} data-testid="download-excel-btn"><Download className="h-4 w-4 text-brand" />Download Excel</Btn>
        <Btn onClick={() => setAdding(true)} data-testid="add-agent-btn"><UserPlus className="h-4 w-4" />Add agent</Btn>
      </Card>
      {d.agents.length === 0 ? <Empty icon={User} title="No agents found" testid="agents-empty" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]" data-testid="agents-table">
            <thead><tr className="text-left text-slate-500 border-b border-slate-200">
              {["Name", "Phone Number", "Email", "GST", "Commission", "Balance", ""].map((h) => <th key={h} className="px-5 py-4 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {d.agents.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`agent-row-${a.id}`}>
                  <td className="px-5 py-4 font-semibold text-navy">{a.name}</td>
                  <td className="px-5 py-4">{a.phone}</td>
                  <td className="px-5 py-4 text-slate-500">{a.email || "-"}</td>
                  <td className="px-5 py-4">{a.gst_number ? <Badge tone="green">{a.gst_number}</Badge> : <span className="text-slate-400">-</span>}</td>
                  <td className="px-5 py-4">{a.commission_pct}%</td>
                  <td className={`px-5 py-4 font-heading font-bold ${a.balance > 0 ? "text-emerald-700" : a.balance < 0 ? "text-red-700" : "text-slate-500"}`} data-testid={`agent-balance-${a.id}`}>{inr(a.balance)}</td>
                  <td className="px-5 py-4"><Btn variant="outline" className="h-9" onClick={() => setSettle(a)} data-testid={`settle-btn-${a.id}`}>Settle</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <AddAgent open={adding} onClose={() => setAdding(false)} onDone={load} />
      <Settle agent={settle} onClose={() => setSettle(null)} onDone={load} />
    </>
  );
}
