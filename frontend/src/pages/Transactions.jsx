import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errMsg, inr, fmtDateTime } from "@/lib/api";
import { PageHeader, Card, Btn, Badge, Empty, Stat, selectCls } from "@/components/common";

const MODES = ["Cash", "UPI", "Card", "Bank Transfer"];

const AddTxn = ({ open, onClose, onDone }) => {
  const [f, setF] = useState({ type: "debit", amount: "", mode: "Cash", description: "", party: "" });
  const submit = async () => {
    try {
      await api.post("/transactions", { ...f, amount: Number(f.amount) });
      toast.success("Entry added");
      setF({ type: "debit", amount: "", mode: "Cash", description: "", party: "" });
      onClose(); onDone();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="add-txn-dialog">
        <DialogHeader><DialogTitle className="font-heading">Add entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <select value={f.type} onChange={s("type")} className={`${selectCls} w-full`} data-testid="txn-type-select"><option value="credit">Money in</option><option value="debit">Money out</option></select>
          <input type="number" placeholder="Amount" value={f.amount} onChange={s("amount")} className={`${selectCls} w-full`} data-testid="txn-amount-input" />
          <select value={f.mode} onChange={s("mode")} className={`${selectCls} w-full`} data-testid="txn-mode-select">{MODES.map((m) => <option key={m}>{m}</option>)}</select>
          <input placeholder="Description" value={f.description} onChange={s("description")} className={`${selectCls} w-full`} data-testid="txn-description-input" />
          <input placeholder="Party (optional)" value={f.party} onChange={s("party")} className={`${selectCls} w-full`} data-testid="txn-party-input" />
          <Btn className="w-full" onClick={submit} data-testid="txn-submit-btn">Save entry</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Transactions() {
  const [d, setD] = useState({ items: [], total_credit: 0, total_debit: 0, net: 0 });
  const [p, setP] = useState({ q: "", type: "", mode: "" });
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => api.get("/transactions", { params: p }).then((r) => setD(r.data)), [p]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Transactions" sub="Every rupee in and out">
        <Btn onClick={() => setAdding(true)} data-testid="add-txn-btn"><Plus className="h-4 w-4" />Add entry</Btn>
      </PageHeader>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Money in" value={inr(d.total_credit)} tone="text-emerald-700" testid="txn-total-credit" />
        <Stat label="Money out" value={inr(d.total_debit)} tone="text-red-700" testid="txn-total-debit" />
        <Stat label="Net" value={inr(d.net)} testid="txn-net" />
      </div>
      <Card className="p-3 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 px-3 h-11 rounded-lg border border-slate-200">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={p.q} onChange={set("q")} placeholder="Search party, description, booking no..." className="flex-1 outline-none text-sm bg-transparent" data-testid="txn-search-input" />
        </div>
        <select value={p.type} onChange={set("type")} className={selectCls} data-testid="txn-type-filter"><option value="">All types</option><option value="credit">Money in</option><option value="debit">Money out</option></select>
        <select value={p.mode} onChange={set("mode")} className={selectCls} data-testid="txn-mode-filter"><option value="">All modes</option>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
      </Card>
      {d.items.length === 0 ? <Empty icon={ReceiptText} title="No transactions" testid="txn-empty" /> : (
        <div className="space-y-3" data-testid="txn-list">
          {d.items.map((t) => (
            <Card key={t.id} className="p-4 flex items-center gap-4" data-testid={`txn-row-${t.id}`}>
              <span className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${t.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {t.type === "credit" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy truncate">{t.description}{t.party && ` · ${t.party}`}</p>
                <p className="text-xs text-slate-500">{fmtDateTime(t.created_at)}{t.booking_no && ` · ${t.booking_no}`}</p>
              </div>
              <Badge>{t.mode}</Badge>
              <p className={`font-heading font-bold w-28 text-right ${t.type === "credit" ? "text-emerald-700" : "text-red-700"}`}>{t.type === "credit" ? "+" : "-"}{inr(t.amount)}</p>
            </Card>
          ))}
        </div>
      )}
      <AddTxn open={adding} onClose={() => setAdding(false)} onDone={load} />
    </>
  );
}
