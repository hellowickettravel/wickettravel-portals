// Mock data for the customer portal UI. Replaced with Supabase queries later.

import type { Tone } from "@/components/admin/status-badge";

export type CustomerOrderStatus =
  | "Quote requested"
  | "Confirmed"
  | "Ticketed"
  | "Completed"
  | "Cancelled";

export type CustomerOrder = {
  id: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  tripType: "One-way" | "Return";
  departDate: string;
  returnDate?: string;
  pax: number;
  cabin: "Economy" | "Business";
  status: CustomerOrderStatus;
  price?: number;
  agent: string;
  reference: string;
};

export const CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: "WT-1042",
    from: "LHR",
    to: "DXB",
    fromCity: "London Heathrow",
    toCity: "Dubai",
    tripType: "Return",
    departDate: "24 Jun 2026",
    returnDate: "08 Jul 2026",
    pax: 2,
    cabin: "Economy",
    status: "Confirmed",
    price: 1840,
    agent: "Aisha Khan",
    reference: "WCK-7F3A21",
  },
  {
    id: "WT-1051",
    from: "LGW",
    to: "IST",
    fromCity: "London Gatwick",
    toCity: "Istanbul",
    tripType: "Return",
    departDate: "12 Aug 2026",
    returnDate: "26 Aug 2026",
    pax: 3,
    cabin: "Economy",
    status: "Quote requested",
    agent: "Priya Sharma",
    reference: "WCK-9B0C44",
  },
  {
    id: "WT-1009",
    from: "MAN",
    to: "JFK",
    fromCity: "Manchester",
    toCity: "New York JFK",
    tripType: "Return",
    departDate: "02 Mar 2026",
    returnDate: "14 Mar 2026",
    pax: 2,
    cabin: "Business",
    status: "Completed",
    price: 4980,
    agent: "Sofia Rossi",
    reference: "WCK-4D8E10",
  },
  {
    id: "WT-1024",
    from: "LHR",
    to: "JED",
    fromCity: "London Heathrow",
    toCity: "Jeddah",
    tripType: "One-way",
    departDate: "19 Apr 2026",
    pax: 1,
    cabin: "Economy",
    status: "Ticketed",
    price: 410,
    agent: "Aisha Khan",
    reference: "WCK-1A6F92",
  },
  {
    id: "WT-0991",
    from: "STN",
    to: "DEL",
    fromCity: "London Stansted",
    toCity: "Delhi",
    tripType: "Return",
    departDate: "08 Jan 2026",
    returnDate: "22 Jan 2026",
    pax: 4,
    cabin: "Economy",
    status: "Cancelled",
    agent: "Daniel Owusu",
    reference: "WCK-3C2B57",
  },
];

export function customerStatusTone(status: CustomerOrderStatus): Tone {
  switch (status) {
    case "Quote requested":
      return "amber";
    case "Confirmed":
      return "blue";
    case "Ticketed":
      return "violet";
    case "Completed":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "slate";
  }
}

export type ChatMessage = {
  id: string;
  from: "customer" | "team";
  text: string;
  time: string;
};

export const CHAT_MESSAGES: ChatMessage[] = [
  { id: "m1", from: "team", text: "Hi! Thanks for reaching out to Wicket Travel ✈️ How can we help with your trip?", time: "09:02" },
  { id: "m2", from: "customer", text: "Hi, I'd like a return from London to Dubai for 2 adults in late June.", time: "09:05" },
  { id: "m3", from: "team", text: "Perfect. Any preferred dates and cabin class?", time: "09:06" },
  { id: "m4", from: "customer", text: "24th June out, 8th July back. Economy is fine.", time: "09:08" },
  { id: "m5", from: "team", text: "Great — I've found a good Emirates fare at £1,840 for both. Shall I hold it?", time: "09:14" },
  { id: "m6", from: "customer", text: "Yes please, let's go ahead 🙌", time: "09:15" },
  { id: "m7", from: "team", text: "Done! I've created order WT-1042 and it's now confirmed. I'll send the e-tickets shortly.", time: "09:16" },
];
