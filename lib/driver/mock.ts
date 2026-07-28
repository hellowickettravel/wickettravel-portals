/**
 * Driver Partner Portal — mock data (UI phase only).
 *
 * This is a frontend-only build: no auth, DB, or realtime. Everything here is
 * hardcoded sample data used to render and click through the driver screens.
 * Realistic Indian names, Hyderabad / Chennai / Bengaluru airports, INR fares
 * and local drop-off areas across Telangana & Andhra Pradesh.
 */

export type Airport = {
  code: "HYD" | "MAA" | "BLR";
  name: string;
  city: string;
};

export const AIRPORTS: Airport[] = [
  { code: "HYD", name: "Rajiv Gandhi Intl (RGIA)", city: "Hyderabad" },
  { code: "MAA", name: "Chennai Intl", city: "Chennai" },
  { code: "BLR", name: "Kempegowda Intl", city: "Bengaluru" },
];

export function airportLabel(code: Airport["code"]) {
  const a = AIRPORTS.find((x) => x.code === code);
  return a ? `${a.city} · ${a.name}` : code;
}

export function airportShort(code: Airport["code"]) {
  const a = AIRPORTS.find((x) => x.code === code);
  return a ? a.city : code;
}

export type VehicleType = "Sedan" | "SUV" | "Tempo Traveller";

/** The step a live trip is on, in order. `available` = still on the job board. */
export type TripStage =
  | "available"
  | "accepted"
  | "heading"
  | "arrived"
  | "onboard"
  | "enroute"
  | "completed"
  | "cancelled";

export const TRIP_FLOW: Exclude<TripStage, "available" | "cancelled">[] = [
  "accepted",
  "heading",
  "arrived",
  "onboard",
  "enroute",
  "completed",
];

export const STAGE_META: Record<
  TripStage,
  { label: string; short: string; nextLabel?: string }
> = {
  available: { label: "Available", short: "Available" },
  accepted: { label: "Accepted", short: "Accepted", nextLabel: "Start heading to pickup" },
  heading: { label: "Heading to pickup", short: "En route to pickup", nextLabel: "I've arrived" },
  arrived: { label: "Arrived at pickup", short: "At pickup", nextLabel: "Passenger on board" },
  onboard: { label: "Passenger on board", short: "On board", nextLabel: "Start trip" },
  enroute: { label: "On route to drop-off", short: "On route", nextLabel: "Mark as complete" },
  completed: { label: "Completed", short: "Completed" },
  cancelled: { label: "Cancelled", short: "Cancelled" },
};

export type Ride = {
  id: string;
  ref: string;
  pickupAirport: Airport["code"];
  /** Human pickup point inside the airport (terminal / kerb). */
  pickupPoint: string;
  dropoff: string;
  /** Longer drop address for the detail screen. */
  dropoffFull: string;
  dateLabel: string;
  timeLabel: string;
  flight: string;
  passengers: number;
  luggage: number;
  vehicleType: VehicleType;
  distanceKm: number;
  etaMins: number;
  fare: number;
  commission: number;
  customerName: string;
  customerPhone: string;
  stage: TripStage;
  /** For history bucketing. */
  bucket: "available" | "upcoming" | "active" | "completed" | "cancelled";
};

export function netOf(ride: Pick<Ride, "fare" | "commission">) {
  return ride.fare - ride.commission;
}

/** Available ride requests shown on the Job Board. */
export const AVAILABLE_RIDES: Ride[] = [
  {
    id: "j1",
    ref: "WKT-10482",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 4",
    dropoff: "Gachibowli, Hyderabad",
    dropoffFull: "DLF Cyber City, Gachibowli, Hyderabad, Telangana 500032",
    dateLabel: "Today",
    timeLabel: "2:45 PM",
    flight: "6E 234",
    passengers: 3,
    luggage: 4,
    vehicleType: "SUV",
    distanceKm: 34,
    etaMins: 48,
    fare: 1450,
    commission: 218,
    customerName: "Ananya Reddy",
    customerPhone: "+91 98490 11234",
    stage: "available",
    bucket: "available",
  },
  {
    id: "j2",
    ref: "WKT-10485",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 2",
    dropoff: "Banjara Hills, Hyderabad",
    dropoffFull: "Road No. 12, Banjara Hills, Hyderabad, Telangana 500034",
    dateLabel: "Today",
    timeLabel: "4:10 PM",
    flight: "AI 560",
    passengers: 2,
    luggage: 2,
    vehicleType: "Sedan",
    distanceKm: 28,
    etaMins: 40,
    fare: 1150,
    commission: 172,
    customerName: "Vikram Nair",
    customerPhone: "+91 90000 55321",
    stage: "available",
    bucket: "available",
  },
  {
    id: "j3",
    ref: "WKT-10490",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 6",
    dropoff: "Warangal (outstation)",
    dropoffFull: "Hanamkonda, Warangal, Telangana 506001",
    dateLabel: "Tomorrow",
    timeLabel: "9:30 AM",
    flight: "UK 845",
    passengers: 5,
    luggage: 6,
    vehicleType: "Tempo Traveller",
    distanceKm: 148,
    etaMins: 180,
    fare: 4800,
    commission: 720,
    customerName: "Sai Krishna Varma",
    customerPhone: "+91 96765 44012",
    stage: "available",
    bucket: "available",
  },
  {
    id: "j4",
    ref: "WKT-10492",
    pickupAirport: "MAA",
    pickupPoint: "Terminal 1 · Arrivals",
    dropoff: "T. Nagar, Chennai",
    dropoffFull: "Ranganathan Street, T. Nagar, Chennai, Tamil Nadu 600017",
    dateLabel: "Today",
    timeLabel: "6:20 PM",
    flight: "6E 512",
    passengers: 2,
    luggage: 3,
    vehicleType: "Sedan",
    distanceKm: 21,
    etaMins: 45,
    fare: 980,
    commission: 147,
    customerName: "Deepika Iyer",
    customerPhone: "+91 94440 78210",
    stage: "available",
    bucket: "available",
  },
  {
    id: "j5",
    ref: "WKT-10495",
    pickupAirport: "BLR",
    pickupPoint: "Terminal 2 · Arrivals",
    dropoff: "Whitefield, Bengaluru",
    dropoffFull: "ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066",
    dateLabel: "Tomorrow",
    timeLabel: "11:15 AM",
    flight: "AI 803",
    passengers: 4,
    luggage: 5,
    vehicleType: "SUV",
    distanceKm: 39,
    etaMins: 65,
    fare: 1680,
    commission: 252,
    customerName: "Rohan Gupta",
    customerPhone: "+91 99001 23456",
    stage: "available",
    bucket: "available",
  },
  {
    id: "j6",
    ref: "WKT-10498",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 1",
    dropoff: "Vijayawada (outstation)",
    dropoffFull: "Benz Circle, Vijayawada, Andhra Pradesh 520010",
    dateLabel: "Tomorrow",
    timeLabel: "7:00 AM",
    flight: "6E 118",
    passengers: 3,
    luggage: 4,
    vehicleType: "SUV",
    distanceKm: 275,
    etaMins: 300,
    fare: 6500,
    commission: 975,
    customerName: "Lakshmi Prasad",
    customerPhone: "+91 91234 90876",
    stage: "available",
    bucket: "available",
  },
];

/** A trip already accepted and in progress — powers Home + Active Trip. */
export const ACTIVE_RIDE: Ride = {
  id: "a1",
  ref: "WKT-10471",
  pickupAirport: "HYD",
  pickupPoint: "Arrivals · Gate 4",
  dropoff: "HITEC City, Hyderabad",
  dropoffFull: "Mindspace, HITEC City, Madhapur, Hyderabad, Telangana 500081",
  dateLabel: "Today",
  timeLabel: "1:15 PM",
  flight: "6E 677",
  passengers: 2,
  luggage: 2,
  vehicleType: "SUV",
  distanceKm: 31,
  etaMins: 44,
  fare: 1350,
  commission: 202,
  customerName: "Meera Chandra",
  customerPhone: "+91 98765 20030",
  stage: "heading",
  bucket: "active",
};

/** Ride history (upcoming / completed / cancelled) for My Rides. */
export const HISTORY_RIDES: Ride[] = [
  {
    id: "u1",
    ref: "WKT-10466",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 2",
    dropoff: "Kukatpally, Hyderabad",
    dropoffFull: "KPHB Phase 1, Kukatpally, Hyderabad, Telangana 500072",
    dateLabel: "Tomorrow",
    timeLabel: "5:45 PM",
    flight: "AI 542",
    passengers: 3,
    luggage: 3,
    vehicleType: "SUV",
    distanceKm: 33,
    etaMins: 50,
    fare: 1400,
    commission: 210,
    customerName: "Harish Rao",
    customerPhone: "+91 90300 11882",
    stage: "accepted",
    bucket: "upcoming",
  },
  {
    id: "c1",
    ref: "WKT-10402",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 3",
    dropoff: "Secunderabad",
    dropoffFull: "SP Road, Secunderabad, Telangana 500003",
    dateLabel: "26 Jul",
    timeLabel: "10:20 AM",
    flight: "6E 445",
    passengers: 2,
    luggage: 2,
    vehicleType: "Sedan",
    distanceKm: 26,
    etaMins: 42,
    fare: 1100,
    commission: 165,
    customerName: "Priya Menon",
    customerPhone: "+91 99887 66554",
    stage: "completed",
    bucket: "completed",
  },
  {
    id: "c2",
    ref: "WKT-10388",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 5",
    dropoff: "Kondapur, Hyderabad",
    dropoffFull: "Botanical Garden Road, Kondapur, Hyderabad, Telangana 500084",
    dateLabel: "25 Jul",
    timeLabel: "8:05 PM",
    flight: "UK 762",
    passengers: 4,
    luggage: 5,
    vehicleType: "SUV",
    distanceKm: 30,
    etaMins: 47,
    fare: 1320,
    commission: 198,
    customerName: "Arjun Desai",
    customerPhone: "+91 98001 44556",
    stage: "completed",
    bucket: "completed",
  },
  {
    id: "c3",
    ref: "WKT-10355",
    pickupAirport: "BLR",
    pickupPoint: "Terminal 1 · Arrivals",
    dropoff: "Electronic City, Bengaluru",
    dropoffFull: "Phase 1, Electronic City, Bengaluru, Karnataka 560100",
    dateLabel: "23 Jul",
    timeLabel: "3:30 PM",
    flight: "6E 902",
    passengers: 1,
    luggage: 1,
    vehicleType: "Sedan",
    distanceKm: 44,
    etaMins: 70,
    fare: 1750,
    commission: 262,
    customerName: "Nikhil Shetty",
    customerPhone: "+91 97400 88221",
    stage: "completed",
    bucket: "completed",
  },
  {
    id: "x1",
    ref: "WKT-10370",
    pickupAirport: "HYD",
    pickupPoint: "Arrivals · Gate 1",
    dropoff: "Miyapur, Hyderabad",
    dropoffFull: "Miyapur X Roads, Hyderabad, Telangana 500049",
    dateLabel: "24 Jul",
    timeLabel: "11:50 AM",
    flight: "AI 620",
    passengers: 2,
    luggage: 2,
    vehicleType: "Sedan",
    distanceKm: 29,
    etaMins: 45,
    fare: 1200,
    commission: 180,
    customerName: "Sneha Kulkarni",
    customerPhone: "+91 90080 33445",
    stage: "cancelled",
    bucket: "cancelled",
  },
];

export type EarningEntry = {
  ref: string;
  dateLabel: string;
  route: string;
  fare: number;
  commission: number;
};

export const EARNINGS: EarningEntry[] = [
  { ref: "WKT-10402", dateLabel: "26 Jul", route: "HYD → Secunderabad", fare: 1100, commission: 165 },
  { ref: "WKT-10388", dateLabel: "25 Jul", route: "HYD → Kondapur", fare: 1320, commission: 198 },
  { ref: "WKT-10355", dateLabel: "23 Jul", route: "BLR → Electronic City", fare: 1750, commission: 262 },
  { ref: "WKT-10330", dateLabel: "22 Jul", route: "HYD → Gachibowli", fare: 1450, commission: 218 },
  { ref: "WKT-10318", dateLabel: "21 Jul", route: "HYD → Banjara Hills", fare: 1150, commission: 172 },
  { ref: "WKT-10299", dateLabel: "20 Jul", route: "HYD → Warangal", fare: 4800, commission: 720 },
  { ref: "WKT-10280", dateLabel: "19 Jul", route: "HYD → HITEC City", fare: 1350, commission: 202 },
];

/** Last 7 days net earnings (INR) for the mini bar chart. */
export const EARNINGS_TREND: { label: string; value: number }[] = [
  { label: "Mon", value: 2450 },
  { label: "Tue", value: 3120 },
  { label: "Wed", value: 1880 },
  { label: "Thu", value: 4080 },
  { label: "Fri", value: 3560 },
  { label: "Sat", value: 5240 },
  { label: "Sun", value: 2960 },
];

export const EARNINGS_SUMMARY = {
  today: 3820,
  week: 23290,
  month: 94640,
  total: 842150,
};

export type DriverDoc = {
  name: string;
  status: "verified" | "pending";
  detail: string;
};

export type DriverProfile = {
  name: string;
  phone: string;
  email: string;
  city: string;
  rating: number;
  totalTrips: number;
  memberSince: string;
  vehicle: {
    type: VehicleType;
    makeModel: string;
    plate: string;
    seats: number;
    color: string;
  };
  airports: Airport["code"][];
  serviceArea: string;
  documents: DriverDoc[];
};

export const DRIVER: DriverProfile = {
  name: "Rajesh Kumar",
  phone: "+91 98765 43210",
  email: "rajesh.kumar@example.in",
  city: "Hyderabad",
  rating: 4.8,
  totalTrips: 1243,
  memberSince: "Mar 2023",
  vehicle: {
    type: "SUV",
    makeModel: "Toyota Innova Crysta",
    plate: "TS 09 AB 1234",
    seats: 6,
    color: "Pearl White",
  },
  airports: ["HYD", "BLR"],
  serviceArea:
    "Hyderabad city + outstation (Warangal, Vijayawada, Karimnagar). Available for airport pickups 6 AM–11 PM.",
  documents: [
    { name: "Driving Licence", status: "verified", detail: "Valid till Aug 2029" },
    { name: "Vehicle Registration (RC)", status: "verified", detail: "TS 09 AB 1234" },
    { name: "Insurance", status: "pending", detail: "Renewal under review" },
    { name: "ID Photo", status: "verified", detail: "Aadhaar verified" },
  ],
};

export const TODAY_STATS = {
  rides: 4,
  earnings: 3820,
  rating: 4.8,
};

export type ChatMessage = {
  id: string;
  from: "driver" | "customer";
  body: string;
  time: string;
};

export const CHAT_THREAD: ChatMessage[] = [
  { id: "m1", from: "customer", body: "Hi, I've just landed. Standing near Gate 4.", time: "1:12 PM" },
  { id: "m2", from: "driver", body: "Hello Meera! I'm 5 minutes away, white Innova Crysta TS 09 AB 1234.", time: "1:13 PM" },
  { id: "m3", from: "customer", body: "Perfect, thank you! I have 2 bags.", time: "1:14 PM" },
  { id: "m4", from: "driver", body: "No problem, plenty of space. Pulling up to Gate 4 arrivals now.", time: "1:16 PM" },
  { id: "m5", from: "customer", body: "I can see you. Coming over 👍", time: "1:17 PM" },
];

/** ₹ formatter — Indian grouping (e.g. ₹1,23,456). */
export function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}
