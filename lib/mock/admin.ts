// Mock data for the admin portal UI. Replaced with Supabase queries later.

export type AccessLevel = "Full" | "Chat-only" | "View-only";
export type EmployeeStatus = "Active" | "Inactive";

export type Employee = {
  id: string;
  name: string;
  email: string;
  accessLevel: AccessLevel;
  chats: number;
  status: EmployeeStatus;
};

export const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Aisha Khan", email: "aisha@wicket.co.uk", accessLevel: "Full", chats: 14, status: "Active" },
  { id: "e2", name: "Daniel Owusu", email: "daniel@wicket.co.uk", accessLevel: "Chat-only", chats: 9, status: "Active" },
  { id: "e3", name: "Priya Sharma", email: "priya@wicket.co.uk", accessLevel: "Chat-only", chats: 11, status: "Active" },
  { id: "e4", name: "Tom Bailey", email: "tom@wicket.co.uk", accessLevel: "View-only", chats: 0, status: "Inactive" },
  { id: "e5", name: "Sofia Rossi", email: "sofia@wicket.co.uk", accessLevel: "Full", chats: 7, status: "Active" },
  { id: "e6", name: "Mohammed Ali", email: "mo@wicket.co.uk", accessLevel: "Chat-only", chats: 5, status: "Active" },
];

export type OrderStatus = "Open" | "In Progress" | "Closed" | "Cancelled";

export type Order = {
  id: string;
  customer: string;
  from: string;
  to: string;
  date: string;
  pax: number;
  price: number;
  commission: number;
  status: OrderStatus;
  employee: string;
};

export const ORDERS: Order[] = [
  { id: "WT-1042", customer: "James Carter", from: "LHR", to: "DXB", date: "24 Jun 2026", pax: 2, price: 1840, commission: 220, status: "Open", employee: "Aisha Khan" },
  { id: "WT-1041", customer: "Lucy Bennett", from: "MAN", to: "ISB", date: "02 Jul 2026", pax: 1, price: 720, commission: 95, status: "In Progress", employee: "Daniel Owusu" },
  { id: "WT-1040", customer: "Omar Farouk", from: "LGW", to: "CAI", date: "18 Jun 2026", pax: 3, price: 2310, commission: 290, status: "Closed", employee: "Priya Sharma" },
  { id: "WT-1039", customer: "Grace Miller", from: "BHX", to: "JFK", date: "11 Aug 2026", pax: 2, price: 1990, commission: 240, status: "Open", employee: "Sofia Rossi" },
  { id: "WT-1038", customer: "Hassan Raza", from: "LHR", to: "LHE", date: "29 Jun 2026", pax: 4, price: 3120, commission: 380, status: "In Progress", employee: "Mohammed Ali" },
  { id: "WT-1037", customer: "Emma Wright", from: "STN", to: "DEL", date: "07 Jul 2026", pax: 1, price: 640, commission: 80, status: "Closed", employee: "Aisha Khan" },
  { id: "WT-1036", customer: "Noah Clarke", from: "EDI", to: "DXB", date: "15 Jul 2026", pax: 2, price: 1760, commission: 210, status: "Cancelled", employee: "Daniel Owusu" },
  { id: "WT-1035", customer: "Fatima Noor", from: "LHR", to: "JED", date: "21 Jun 2026", pax: 5, price: 4250, commission: 510, status: "Open", employee: "Priya Sharma" },
  { id: "WT-1034", customer: "Liam Scott", from: "MAN", to: "BKK", date: "03 Sep 2026", pax: 2, price: 2080, commission: 250, status: "Closed", employee: "Sofia Rossi" },
  { id: "WT-1033", customer: "Zara Ahmed", from: "LGW", to: "IST", date: "27 Jun 2026", pax: 3, price: 1530, commission: 180, status: "In Progress", employee: "Mohammed Ali" },
];

export type ConversationStatus = "Open" | "Pending" | "Closed";

export type Conversation = {
  id: string;
  customer: string;
  phone: string;
  preview: string;
  employee: string;
  unread: number;
  status: ConversationStatus;
  lastActivity: string;
};

export const CONVERSATIONS: Conversation[] = [
  { id: "c1", customer: "James Carter", phone: "+44 7700 900123", preview: "Great, can you confirm the return date?", employee: "Aisha Khan", unread: 2, status: "Open", lastActivity: "2m ago" },
  { id: "c2", customer: "Lucy Bennett", phone: "+44 7700 900456", preview: "Thanks — I'll send the passport copy shortly.", employee: "Daniel Owusu", unread: 0, status: "Pending", lastActivity: "18m ago" },
  { id: "c3", customer: "Omar Farouk", phone: "+44 7700 900789", preview: "Payment done ✅", employee: "Priya Sharma", unread: 0, status: "Closed", lastActivity: "1h ago" },
  { id: "c4", customer: "Grace Miller", phone: "+44 7700 900222", preview: "Is there a cheaper morning flight?", employee: "Sofia Rossi", unread: 3, status: "Open", lastActivity: "3h ago" },
  { id: "c5", customer: "Hassan Raza", phone: "+44 7700 900333", preview: "We are 4 adults and 1 infant.", employee: "Mohammed Ali", unread: 1, status: "Open", lastActivity: "5h ago" },
  { id: "c6", customer: "Emma Wright", phone: "+44 7700 900444", preview: "Perfect, see you then!", employee: "Aisha Khan", unread: 0, status: "Closed", lastActivity: "Yesterday" },
  { id: "c7", customer: "Fatima Noor", phone: "+44 7700 900555", preview: "Can we split the payment?", employee: "Priya Sharma", unread: 1, status: "Pending", lastActivity: "Yesterday" },
];

export type ActivityItem = {
  id: string;
  text: string;
  meta: string;
  time: string;
  tone: "blue" | "green" | "amber" | "slate";
};

export const ACTIVITY: ActivityItem[] = [
  { id: "a1", text: "New order WT-1042 created", meta: "by Aisha Khan", time: "2m ago", tone: "blue" },
  { id: "a2", text: "Order WT-1040 marked Closed", meta: "by Priya Sharma", time: "1h ago", tone: "green" },
  { id: "a3", text: "New conversation from Grace Miller", meta: "unassigned → Sofia Rossi", time: "3h ago", tone: "amber" },
  { id: "a4", text: "Employee Tom Bailey deactivated", meta: "by Admin", time: "Yesterday", tone: "slate" },
  { id: "a5", text: "Order WT-1036 cancelled", meta: "by Daniel Owusu", time: "Yesterday", tone: "amber" },
];

// ----- Analytics -----

export const ORDERS_OVER_TIME: { month: string; orders: number }[] = [
  { month: "Jan", orders: 28 },
  { month: "Feb", orders: 34 },
  { month: "Mar", orders: 41 },
  { month: "Apr", orders: 38 },
  { month: "May", orders: 52 },
  { month: "Jun", orders: 47 },
];

export const REVENUE_BY_MONTH: { month: string; revenue: number }[] = [
  { month: "Jan", revenue: 18400 },
  { month: "Feb", revenue: 22600 },
  { month: "Mar", revenue: 27800 },
  { month: "Apr", revenue: 25100 },
  { month: "May", revenue: 34200 },
  { month: "Jun", revenue: 31250 },
];

export const ORDERS_BY_STATUS: {
  label: string;
  value: number;
  tone: "blue" | "amber" | "green" | "red";
  color: string;
}[] = [
  { label: "Open", value: 42, tone: "blue", color: "#0088CC" },
  { label: "In Progress", value: 23, tone: "amber", color: "#F59E0B" },
  { label: "Closed", value: 78, tone: "green", color: "#10B981" },
  { label: "Cancelled", value: 9, tone: "red", color: "#F43F5E" },
];

export const TOP_EMPLOYEES: { name: string; closed: number }[] = [
  { name: "Priya Sharma", closed: 34 },
  { name: "Aisha Khan", closed: 29 },
  { name: "Sofia Rossi", closed: 24 },
  { name: "Daniel Owusu", closed: 18 },
  { name: "Mohammed Ali", closed: 12 },
];
