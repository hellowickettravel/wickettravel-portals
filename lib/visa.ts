
/**
 * Shared types + constants for Dubai Visa enquiries (table: visa_enquiries,
 * migration: APPLY_VISA_ENQUIRIES.sql). Client-safe — no server imports here;
 * the admin server actions live in lib/actions/visa.ts and the public submit
 * endpoint in app/api/visa-enquiry/route.ts.
 */

export type VisaEnquiryStatus =
  | "new"
  | "contacted"
  | "in_progress"
  | "completed"
  | "closed";

export const VISA_STATUSES: VisaEnquiryStatus[] = [
  "new",
  "contacted",
  "in_progress",
  "completed",
  "closed",
];

export const VISA_STATUS_LABELS: Record<VisaEnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  // Sentence case, as the design writes every status.
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
};

export type PreferredContactMethod = "email" | "phone" | "whatsapp";

export const PREFERRED_CONTACT_METHODS: PreferredContactMethod[] = [
  "email",
  "phone",
  "whatsapp",
];

/** One uploaded document reference stored on visa_enquiries.documents. */
export type VisaDocument = {
  path: string; // object key inside the private 'visa-documents' bucket
  name: string;
  size: number;
  type: string;
};

/** One timestamped internal note stored on visa_enquiries.admin_notes. */
export type VisaAdminNote = {
  id: string;
  body: string;
  created_at: string;
};

/** Full visa_enquiries row. */
export type VisaEnquiry = {
  id: string;
  reference_number: string;
  // Step 1 — Visa & Travel
  more_than_one_person: boolean;
  visa_type: string;
  purpose_of_visit: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  planned_activities: string | null;
  // Step 2 — Personal
  first_name: string;
  last_name: string;
  other_names: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  nationality: string | null;
  gender: string | null;
  marital_status: string | null;
  email: string;
  phone: string;
  uk_address: string | null;
  // Step 3 — Passport & UK visa
  passport_type: string | null;
  passport_number: string | null;
  passport_issue_date: string | null;
  passport_expiry_date: string | null;
  issuing_country: string | null;
  uk_visa_brp_ref: string | null;
  uk_visa_start_date: string | null;
  uk_visa_expiry_date: string | null;
  previously_visited_uae: boolean;
  previous_uae_visa_number: string | null;
  // Step 4 — Employment & background
  occupation: string | null;
  employer_name: string | null;
  job_title: string | null;
  employer_address: string | null;
  refused_entry_uae: boolean;
  criminal_conviction: boolean;
  who_covers_costs: string | null;
  preferred_contact_method: PreferredContactMethod;
  // Step 5 — Documents & notes
  additional_notes: string | null;
  documents: VisaDocument[];
  // Management
  status: VisaEnquiryStatus;
  admin_notes: VisaAdminNote[];
  created_at: string;
  updated_at: string;
};

/** Slim row for the admin list view. */
export type VisaEnquiryListItem = Pick<
  VisaEnquiry,
  | "id"
  | "reference_number"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "visa_type"
  | "preferred_contact_method"
  | "status"
  | "created_at"
>;
