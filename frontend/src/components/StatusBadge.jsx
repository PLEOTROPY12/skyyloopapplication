const STYLES = {
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  checked_in: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  advance: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  retail: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  b2b: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

const LABELS = { checked_in: "Checked in", advance: "10% advance", b2b: "B2B" };

export const StatusBadge = ({ value, testId }) => (
  <span
    data-testid={testId}
    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize whitespace-nowrap ${STYLES[value] || STYLES.retail}`}
  >
    {LABELS[value] || value}
  </span>
);
