/**
 * Parent Travel Assist — the lists behind the public board's search and
 * filters (wickettravel.com/parents-tickets), managed by an admin at
 * /admin/parents-options and served to the website by
 * GET /api/parent-ticket/options.
 *
 * Plain module (no "use server") so the admin screen, the server actions
 * and the public route can all share the same types, limits and defaults.
 *
 * Four kinds:
 *   airport   value = IATA code ("LHR"), label = name ("London Heathrow"),
 *             region = "uk" | "destination" (which end of a trip it usually
 *             sits at — the website lists UK airports first under "Flying
 *             from" and destinations first under "Flying to")
 *   airline   value = the name as travellers write it ("Emirates")
 *   language  value = the language ("Urdu")
 *   support   value = the wording stored on a post ("Wheelchair assistance"),
 *             label = the short chip text ("Wheelchair help")
 *
 * Website contract (keep in sync with wickettravel-website
 * lib/boardOptions.ts): the public route returns only active rows, ordered by
 * sort_order then value, grouped by kind.
 */

export const OPTION_KINDS = ["airport", "airline", "language", "support"] as const;
export type OptionKind = (typeof OPTION_KINDS)[number];

export const AIRPORT_REGIONS = ["uk", "destination"] as const;
export type AirportRegion = (typeof AIRPORT_REGIONS)[number];

export type BoardOption = {
  id: string;
  kind: OptionKind;
  value: string;
  label: string | null;
  region: AirportRegion | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string | null;
};

export type BoardOptionInput = {
  id?: string;
  kind: OptionKind;
  value: string;
  label?: string | null;
  region?: AirportRegion | null;
  sort_order?: number;
  is_active?: boolean;
};

export const OPTION_LIMITS = { value: 80, label: 80, sortMin: 0, sortMax: 9999 } as const;

export const KIND_COPY: Record<
  OptionKind,
  { tab: string; singular: string; valueLabel: string; valueHint: string; labelLabel?: string; labelHint?: string }
> = {
  airport: {
    tab: "Airports",
    singular: "airport",
    valueLabel: "IATA code",
    valueHint: "Three letters, e.g. LHR",
    labelLabel: "Airport or city name",
    labelHint: "e.g. London Heathrow",
  },
  airline: {
    tab: "Airlines",
    singular: "airline",
    valueLabel: "Airline name",
    valueHint: "As travellers write it, e.g. Emirates",
  },
  language: {
    tab: "Languages",
    singular: "language",
    valueLabel: "Language",
    valueHint: "e.g. Urdu",
  },
  support: {
    tab: "Help needed",
    singular: "help option",
    valueLabel: "Full wording",
    valueHint: "Shown on the form, e.g. Wheelchair assistance",
    labelLabel: "Short chip label",
    labelHint: "Shown on board cards, e.g. Wheelchair help",
  },
};

/** Trim, collapse whitespace, drop control characters, cap length. */
export function cleanOptionText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const ch of value) {
    const c = ch.codePointAt(0)!;
    out += c < 32 || c === 127 ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Validate an admin's input. Returns the cleaned row or a message. */
export function validateOption(
  input: BoardOptionInput
): { ok: true; value: Omit<BoardOption, "id" | "updated_at"> } | { ok: false; error: string } {
  if (!OPTION_KINDS.includes(input.kind)) return { ok: false, error: "Unknown list." };

  let value = cleanOptionText(input.value, OPTION_LIMITS.value);
  const label = cleanOptionText(input.label ?? "", OPTION_LIMITS.label) || null;

  if (input.kind === "airport") {
    value = value.toUpperCase();
    if (!/^[A-Z]{3}$/.test(value)) return { ok: false, error: "An airport code is three letters, e.g. LHR." };
    if (!label) return { ok: false, error: "Add the airport or city name, e.g. London Heathrow." };
  } else if (!value) {
    return { ok: false, error: `Enter the ${KIND_COPY[input.kind].valueLabel.toLowerCase()}.` };
  }
  if (input.kind === "support" && !label) {
    return { ok: false, error: "Add a short chip label, e.g. Wheelchair help." };
  }

  const region =
    input.kind === "airport"
      ? AIRPORT_REGIONS.includes(input.region as AirportRegion)
        ? (input.region as AirportRegion)
        : "destination"
      : null;

  const n = Number(input.sort_order ?? 100);
  const sort_order = Number.isFinite(n)
    ? Math.min(OPTION_LIMITS.sortMax, Math.max(OPTION_LIMITS.sortMin, Math.round(n)))
    : 100;

  return {
    ok: true,
    value: {
      kind: input.kind,
      value,
      label: input.kind === "airport" || input.kind === "support" ? label : null,
      region,
      sort_order,
      is_active: input.is_active ?? true,
    },
  };
}

/** The shape the public route serves and the website reads. */
export type PublicBoardOptions = {
  airports: { code: string; name: string; region: AirportRegion }[];
  airlines: string[];
  languages: string[];
  supports: { value: string; label: string }[];
};

export function toPublicOptions(rows: Pick<BoardOption, "kind" | "value" | "label" | "region">[]): PublicBoardOptions {
  const out: PublicBoardOptions = { airports: [], airlines: [], languages: [], supports: [] };
  for (const r of rows) {
    if (r.kind === "airport") out.airports.push({ code: r.value, name: r.label ?? r.value, region: r.region ?? "destination" });
    else if (r.kind === "airline") out.airlines.push(r.value);
    else if (r.kind === "language") out.languages.push(r.value);
    else if (r.kind === "support") out.supports.push({ value: r.value, label: r.label ?? r.value });
  }
  return out;
}
