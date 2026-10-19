import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { api, errMsg, inr } from "@/lib/api";

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-slate-800 py-2 text-sm">
    <span className="text-slate-500">{k}</span><span className="text-right text-slate-200">{v}</span>
  </div>
);

export const BookingDetailDialog = ({ booking, onClose, onChanged }) => {
  const act = async (fn, msg) => {
    try {
      const { data } = await fn();
      onChanged(data);
      toast.success(msg);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const setStatus = (status, msg) => act(() => api.patch(`/bookings/${booking.id}/status`, { status }), msg);
  const patch = (body, msg) => act(() => api.patch(`/bookings/${booking.id}`, body), msg);
  const b = booking;

  return (
    <Dialog open={!!b} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="booking-detail-dialog" className="max-h-[90vh] overflow-y-auto border-slate-800 bg-[#0F172A] text-slate-100">
        {b && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white">
                <span className="font-mono text-cyan-300">{b.code}</span> <StatusBadge value={b.status} testId="detail-status" />
              </DialogTitle>
            </DialogHeader>
            <div>
              <Row k="Guest" v={b.guest_name} />
              <Row k="Phone" v={b.phone} />
              <Row k="Activity" v={b.activity_name} />
              <Row k="Date & batch" v={`${b.date} · ${b.slot}`} />
              <Row k="Guests" v={`${b.adults} adults · ${b.kids} kids`} />
              <Row k="Channel" v={b.channel === "b2b" ? `B2B · ${b.agent_name || "Agent"}` : "Retail"} />
              <Row k="Source" v={b.source} />
              <Row k="Amount" v={`${inr(b.amount)} (paid ${inr(b.paid_amount)})`} />
              <Row k="Payment" v={<StatusBadge value={b.payment_status} />} />
              <Row k="Waiver" v={b.waiver_signed ? "Signed" : "Pending"} />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {b.status === "confirmed" && (
                <button data-testid="detail-checkin-btn" onClick={() => setStatus("checked_in", "Guest checked in")} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Check in</button>
              )}
              {b.status === "checked_in" && (
                <button data-testid="detail-complete-btn" onClick={() => setStatus("completed", "Marked completed")} className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400">Mark completed</button>
              )}
              {b.payment_status !== "paid" && b.status !== "cancelled" && (
                <button data-testid="detail-mark-paid-btn" onClick={() => patch({ payment_status: "paid" }, "Marked as paid")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">Mark paid</button>
              )}
              {!b.waiver_signed && (
                <button data-testid="detail-waiver-btn" onClick={() => patch({ waiver_signed: true }, "Waiver recorded")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">Waiver signed</button>
              )}
              {b.status === "cancelled" ? (
                <button data-testid="detail-restore-btn" onClick={() => setStatus("confirmed", "Booking restored")} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Restore</button>
              ) : (
                <button data-testid="detail-cancel-btn" onClick={() => setStatus("cancelled", "Booking cancelled")} className="rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">Cancel booking</button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
