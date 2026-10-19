import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useOps } from "@/context/OpsContext";

const DOT = { alert: "bg-rose-500", success: "bg-emerald-500", checkin: "bg-cyan-400", booking: "bg-amber-400", info: "bg-slate-400" };

export const NotificationsSheet = () => {
  const { tick } = useOps();
  const [events, setEvents] = useState([]);
  const [seenAt, setSeenAt] = useState("");

  useEffect(() => {
    api.get("/events").then(({ data }) => setEvents(data)).catch(() => {});
  }, [tick]);

  const unread = events.filter((e) => e.created_at > seenAt).length;

  return (
    <Sheet onOpenChange={(o) => { if (o && events[0]) setSeenAt(events[0].created_at); }}>
      <SheetTrigger asChild>
        <button data-testid="notifications-bell" className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800">
          <Bell size={18} />
          {unread > 0 && (
            <span data-testid="notifications-count" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent data-testid="notifications-sheet" className="border-slate-800 bg-[#0F172A] text-slate-100">
        <SheetHeader>
          <SheetTitle className="font-heading text-white">Operations feed</SheetTitle>
        </SheetHeader>
        <ul className="mt-5 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 120px)" }}>
          {events.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 rounded-xl border border-slate-800 bg-[#111827] p-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.kind] || DOT.info}`} />
              <div>
                <p className="text-sm text-slate-200">{e.message}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{new Date(e.created_at).toLocaleString("en-IN")}</p>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
};
