export const Logo = ({ small }) => (
  <div className="flex items-center gap-1 select-none" data-testid="brand-logo">
    <span
      className={`font-heading font-extrabold text-white bg-brand rounded-md ${small ? "text-lg px-1.5" : "text-2xl px-2 py-0.5"} -rotate-2`}
    >
      Sky
    </span>
    <span className={`font-heading font-extrabold text-slate-900 tracking-tight ${small ? "text-lg" : "text-2xl"}`}>
      Loooop
    </span>
  </div>
);
