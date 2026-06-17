export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-500">
        Or
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
