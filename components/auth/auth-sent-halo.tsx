/**
 * The 64px halo that opens the "check your email" screens. The design uses a
 * plain ember dot inside an ember tint rather than an icon — the same dot
 * language as the headings, checklist and alert.
 */
export function AuthSentHalo() {
  return (
    <span className="bg-ember-50 mb-6 flex size-16 items-center justify-center rounded-full">
      <span className="bg-ember-600 block size-4 rounded-full" />
    </span>
  );
}
