/**
 * Inline form error for the auth screens. Errors here are the user's next
 * action, so they stay on the page instead of expiring in a toast.
 */
export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3"
    >
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-rose-700" />
      <div className="text-[13px] leading-[1.5] text-rose-700">{children}</div>
    </div>
  );
}
