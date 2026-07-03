/**
 * Safe post-auth redirect handling. A `?redirect=` / `?next=` target is
 * attacker-controllable, so we must only ever follow a **same-origin, relative**
 * path. Pure + dependency-free so it can run on the client (before
 * window.location.assign) and the server (auth callback, middleware).
 *
 * The subtle bug this guards against: `startsWith("/") && !startsWith("//")`
 * alone is NOT enough, because browsers normalise a backslash to a forward
 * slash. `"/\\evil.com"` passes that naive check, but `window.location.assign`
 * resolves it to `//evil.com` -> a protocol-relative OPEN REDIRECT to evil.com.
 * We therefore reject backslashes, control characters, and any second-character
 * `/` outright, and only accept a clean absolute path beginning with a single
 * `/` followed by a normal path character.
 */

// C0 control chars + DEL - never valid in a path we would follow.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

/**
 * Returns the path if it is a safe same-origin relative destination, else null.
 * Accepts things like `/customer/book?x=1#frag`; rejects `//evil.com`,
 * `/\evil.com`, `https://evil.com`, `javascript:...`, and control-char tricks.
 */
export function safeInternalPath(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.length > 2048) return null; // absurdly long -> drop

  // Must begin with exactly one forward slash.
  if (value[0] !== "/") return null;
  // Reject protocol-relative ("//host") and backslash tricks ("/\host", "\..").
  if (value[1] === "/" || value[1] === "\\") return null;
  if (value.includes("\\")) return null;
  // Reject ASCII control chars (incl. NUL, tab, newline) that can smuggle intent.
  if (CONTROL_CHARS.test(value)) return null;

  return value;
}
