import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errMsg, inr } from "@/lib/api";
import { Btn, selectCls } from "@/components/common";

const MODES = ["Cash", "UPI", "Card", "Bank Transfer"];

export const PaymentDialog = ({ booking, onClose, onDone }) => {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  useEffect(() => { if (booking) setAmount(String(booking.balance_due)); }, [booking]);

  const submit = async () => {
    try {
      await api.post(`/bookings/${booking.id}/payment`, { amount: Number(amount), mode });
      toast.success("Payment recorded");
      onClose();
      onDone();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="payment-dialog">
        <DialogHeader><DialogTitle className="font-heading">Collect payment</DialogTitle></DialogHeader>
        {booking && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{booking.full_name} · {booking.booking_no} · Due <b>{inr(booking.balance_due)}</b></p>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${selectCls} w-full`} data-testid="payment-amount-input" />
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={`${selectCls} w-full`} data-testid="payment-mode-select">
              {MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
            <Btn className="w-full" onClick={submit} data-testid="payment-submit-btn">Record payment</Btn>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
