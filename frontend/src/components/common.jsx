export const PageHeader = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="hidden lg:block font-heading text-4xl font-extrabold tracking-tight text-navy">{title}</h1>
      {sub && <p className="text-slate-500 mt-1 text-sm sm:text-base">{sub}</p>}
    </div>
    {children}
  </div>
);

export const Card = ({ className = "", children, ...p }) => (
  <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-sm ${className}`} {...p}>{children}</div>
);

export const Field = ({ icon: Icon, children, className = "" }) => (
  <div className={`flex items-center gap-3 h-14 px-4 rounded-xl border border-slate-200 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 transition-[border-color,box-shadow] ${className}`}>
    {Icon && <Icon className="h-5 w-5 text-brand shrink-0" />}
    {children}
  </div>
);

export const inputCls = "flex-1 min-w-0 bg-transparent outline-none text-slate-900 placeholder:text-slate-400";
export const selectCls = "h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-brand";

export const Btn = ({ variant = "primary", className = "", ...p }) => {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-dark shadow-md shadow-red-900/10",
    outline: "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50",
    ghost: "text-slate-700 hover:bg-slate-100",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 font-semibold text-sm active:scale-[0.97] transition-[background-color,transform] disabled:opacity-50 disabled:pointer-events-none ${v} ${className}`}
      {...p}
    />
  );
};

export const Badge = ({ tone = "slate", children, ...p }) => {
  const t = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    brand: "bg-brand-light text-brand-dark",
  }[tone];
  return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 ${t}`} {...p}>{children}</span>;
};

export const Empty = ({ icon: Icon, title, sub, testid }) => (
  <div className="py-20 text-center" data-testid={testid}>
    {Icon && <Icon className="h-14 w-14 mx-auto text-slate-300" />}
    <p className="font-heading font-semibold text-slate-600 text-lg mt-4">{title}</p>
    {sub && <p className="text-slate-400 text-sm mt-1">{sub}</p>}
  </div>
);

export const Stat = ({ label, value, tone = "text-navy", testid, sub }) => (
  <Card className="p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`font-heading text-2xl sm:text-3xl font-bold mt-2 ${tone}`} data-testid={testid}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-2">{sub}</p>}
  </Card>
);
