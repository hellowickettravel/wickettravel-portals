// Mock data for the employee portal UI (personal / assigned-to-me only).
// Replaced with Supabase queries (scoped to the signed-in employee) later.

export type EmpChatMessage = {
  id: string;
  from: "them" | "me";
  text: string;
  time: string;
};

export type EmpConversationStatus = "Open" | "Pending" | "Closed";

export type EmpConversation = {
  id: string;
  customer: string;
  phone: string;
  preview: string;
  time: string;
  unread: number;
  status: EmpConversationStatus;
  messages: EmpChatMessage[];
};

export const MY_CONVERSATIONS: EmpConversation[] = [
  {
    id: "c1",
    customer: "James Carter",
    phone: "+44 7700 900123",
    preview: "Great, can you confirm the return date?",
    time: "09:24",
    unread: 2,
    status: "Open",
    messages: [
      { id: "m1", from: "them", text: "Hi, I need a return London → Dubai for 2 adults.", time: "09:02" },
      { id: "m2", from: "me", text: "Hi James! Sure — what dates were you thinking?", time: "09:05" },
      { id: "m3", from: "them", text: "24th June out, returning 8th July.", time: "09:18" },
      { id: "m4", from: "me", text: "Perfect, I've found a good Emirates fare at £1,840 total.", time: "09:21" },
      { id: "m5", from: "them", text: "Great, can you confirm the return date?", time: "09:24" },
    ],
  },
  {
    id: "c2",
    customer: "Grace Miller",
    phone: "+44 7700 900222",
    preview: "Is there a cheaper morning flight?",
    time: "08:50",
    unread: 1,
    status: "Open",
    messages: [
      { id: "m1", from: "them", text: "Looking at Birmingham → New York in August.", time: "08:40" },
      { id: "m2", from: "me", text: "Nice! For how many passengers?", time: "08:44" },
      { id: "m3", from: "them", text: "2 adults. Is there a cheaper morning flight?", time: "08:50" },
    ],
  },
  {
    id: "c3",
    customer: "Hassan Raza",
    phone: "+44 7700 900333",
    preview: "We are 4 adults and 1 infant.",
    time: "Yesterday",
    unread: 0,
    status: "Pending",
    messages: [
      { id: "m1", from: "them", text: "Family trip to Lahore in late June.", time: "16:10" },
      { id: "m2", from: "me", text: "How many travelling?", time: "16:15" },
      { id: "m3", from: "them", text: "We are 4 adults and 1 infant.", time: "16:20" },
    ],
  },
  {
    id: "c4",
    customer: "Emma Wright",
    phone: "+44 7700 900444",
    preview: "Perfect, see you then!",
    time: "Mon",
    unread: 0,
    status: "Closed",
    messages: [
      { id: "m1", from: "me", text: "Your e-tickets are confirmed and sent ✅", time: "11:02" },
      { id: "m2", from: "them", text: "Perfect, see you then!", time: "11:05" },
    ],
  },
];

export type EmpOrderStatus = "Open" | "In Progress" | "Closed" | "Cancelled";

export type EmpOrder = {
  id: string;
  customer: string;
  from: string;
  to: string;
  date: string;
  pax: number;
  price: number;
  commission: number;
  status: EmpOrderStatus;
};

export const MY_ORDERS: EmpOrder[] = [
  { id: "WT-1042", customer: "James Carter", from: "LHR", to: "DXB", date: "24 Jun 2026", pax: 2, price: 1840, commission: 220, status: "Open" },
  { id: "WT-1037", customer: "Emma Wright", from: "STN", to: "DEL", date: "07 Jul 2026", pax: 1, price: 640, commission: 80, status: "Closed" },
  { id: "WT-1031", customer: "Grace Miller", from: "BHX", to: "JFK", date: "11 Aug 2026", pax: 2, price: 1990, commission: 240, status: "In Progress" },
  { id: "WT-1028", customer: "Hassan Raza", from: "LHR", to: "LHE", date: "29 Jun 2026", pax: 5, price: 3120, commission: 380, status: "Open" },
  { id: "WT-1019", customer: "Liam Scott", from: "MAN", to: "BKK", date: "03 Sep 2026", pax: 2, price: 2080, commission: 250, status: "Closed" },
  { id: "WT-1004", customer: "Zara Ahmed", from: "LGW", to: "IST", date: "27 Jun 2026", pax: 3, price: 1530, commission: 180, status: "Cancelled" },
];

// Personal performance (NOT company-wide).
export const MY_PERFORMANCE = {
  closedThisMonth: 12,
  closedThisWeek: 4,
  responseRate: "96%",
  avgResponse: "4m",
};
