/** Hairline rule with a Plex Mono micro-label centred in it. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-line" />
      <span className="font-micro text-tx-faint">Or</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
