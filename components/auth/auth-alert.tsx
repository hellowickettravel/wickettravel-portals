/**
 * Inline form error for the auth screens. Errors here are the user's next
 * action, so they stay on the page instead of expiring in a toast.
 */
export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="border-alert-line bg-alert-bg mb-5 flex items-start gap-3 rounded-[10px] border px-4 py-3"
    >
      <span className="bg-alert-ink mt-1.5 block size-2 flex-none rounded-full" />
      <div className="text-alert-ink text-[13px] leading-[1.5] font-normal">
        {children}
      </div>
    </div>
  );
}
