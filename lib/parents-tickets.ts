import type { Tone } from "@/components/admin/status-badge";

/**
 * Shared types + constants for Parents Tickets leads (table:
 * parent_ticket_enquiries, migration: APPLY_PARENTS_TICKETS.sql). Client-safe —
 * no server imports here; the admin server actions live in
 * lib/actions/parents-tickets.ts and the public submit endpoint in
 * app/api/parent-ticket/route.ts.
 *
 * A lead is one of two "sides" of the board:
 *   • traveller — someone flying who can assist a parent en route
 *   • requester — someone who needs a companion for their parent's trip
 */

export type ParentTicketType = "traveller" | "requester";

export const PARENT_TICKET_TYPES: ParentTicketType[] = ["traveller", "requester"];

/** Short badge/tab label per side. */
export const PARENT_TICKET_TYPE_LABELS: Record<ParentTicketType, string> = {
  traveller: "Traveller",
  requester: "Needs help",
};

/** Badge tone per side — traveller offers help (green), requester needs it (gold). */
export const PARENT_TICKET_TYPE_TONE: Record<ParentTicketType, Tone> = {
  traveller: "green",
  requester: "gold",
};

export type ParentTicketStatus = "new" | "contacted" | "matched" | "closed";

export const PARENT_TICKET_STATUSES: ParentTicketStatus[] = [
  "new",
  "contacted",
  "matched",
  "closed",
];

export const PARENT_TICKET_STATUS_LABELS: Record<ParentTicketStatus, string> = {
  new: "New",
  contacted: "Contacted",
  matched: "Matched",
  closed: "Closed",
};

/** Badge tone per lead status (same semantic palette as order/visa badges). */
export const PARENT_TICKET_STATUS_TONE: Record<ParentTicketStatus, Tone> = {
  new: "blue",
  contacted: "violet",
  matched: "green",
  closed: "slate",
};

/** One timestamped internal note stored on parent_ticket_enquiries.admin_notes. */
export type ParentTicketNote = {
  id: string;
  body: string;
  created_at: string;
};

/** Full parent_ticket_enquiries row. */
export type ParentTicketEnquiry = {
  id: string;
  reference_number: string;
  enquiry_type: ParentTicketType;
  // Shared
  full_name: string;
  email: string;
  phone: string;
  from_location: string;
  to_location: string;
  travel_date: string | null;
  airline: string | null;
  languages: string | null;
  notes: string | null;
  // Traveller-side (offering help)
  assistance_offered: string | null;
  parents_can_help: number | null;
  fee_amount: number | null;
  // Requester-side (needs help)
  parent_name: string | null;
  parent_age: number | null;
  relationship: string | null;
  assistance_needed: string | null;
  mobility_needs: string | null;
  offer_amount: number | null;
  // Management
  status: ParentTicketStatus;
  admin_notes: ParentTicketNote[];
  /** Submitter opted in to public display on the form (set once at intake). */
  consent_public: boolean;
  /** Admin approved this entry for the public board. Requires consent_public. */
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Mask a submitter's name for public display: first name + last initial, e.g.
 * "Rajesh Kumar" → "Rajesh K.". Single-word names are returned as-is (there is
 * no surname to drop), and anything unusable falls back to "Traveller".
 *
 * This is the ONLY form of a person's name that ever leaves the portal — see
 * app/api/parent-ticket/public/route.ts.
 */
export function maskDisplayName(fullName: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Traveller";
  const first = parts[0]!;
  if (parts.length === 1) return first;
  return `${first} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

/** Slim row for the admin list view. */
export type ParentTicketListItem = Pick<
  ParentTicketEnquiry,
  | "id"
  | "reference_number"
  | "enquiry_type"
  | "full_name"
  | "email"
  | "phone"
  | "from_location"
  | "to_location"
  | "travel_date"
  | "status"
  | "consent_public"
  | "is_public"
  | "created_at"
>;
