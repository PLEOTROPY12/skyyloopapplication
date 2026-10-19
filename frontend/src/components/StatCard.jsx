export const StatCard = ({ title, value, sub, icon: Icon, accent, testId, children, delay = 0 }) => (
  <div
    data-testid={testId}
    style={{ animationDelay: `${delay}ms` }}
    className="ops-rise group rounded-2xl border border-slate-800/80 bg-[#111827] p-4 sm:p-5 transition-colors duration-200 hover:border-slate-700"
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs sm:text-sm text-slate-400">{title}</p>
      {Icon && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-800/80 text-slate-300 transition-colors duration-200 group-hover:text-cyan-300">
          <Icon size={16} />
        </span>
      )}
    </div>
    <p data-testid={`${testId}-value`} className={`mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight ${accent || "text-white"}`}>
      {value}
    </p>
    {sub && <p className="mt-1.5 text-[11px] sm:text-xs text-slate-500">{sub}</p>}
    {children}
  </div>
);
