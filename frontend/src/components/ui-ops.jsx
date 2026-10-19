export const inputCls =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
    {children}
  </label>
);

export const NativeSelect = ({ options, testId, ...props }) => (
  <select data-testid={testId} className={inputCls} {...props}>
    {options.map((o) => (
      <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
    ))}
  </select>
);

export const PageTitle = ({ title, sub, testId, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 data-testid={testId} className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
    {children}
  </div>
);
