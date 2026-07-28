"use client";

/**
 * Driver portal client store (UI phase). A tiny React context that holds the
 * mock, interactive state shared across driver screens so the whole portal is
 * clickable end-to-end: an online/offline toggle, the job board (accept /
 * decline), and the single active trip whose status the driver steps through.
 *
 * No persistence, auth, DB or realtime — this all resets on reload and is
 * replaced by real data wiring in a later phase.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACTIVE_RIDE,
  AVAILABLE_RIDES,
  HISTORY_RIDES,
  TRIP_FLOW,
  type Ride,
  type TripStage,
} from "@/lib/driver/mock";

type DriverStore = {
  online: boolean;
  setOnline: (v: boolean) => void;

  jobs: Ride[];
  activeRide: Ride | null;
  history: Ride[];

  acceptJob: (id: string) => void;
  declineJob: (id: string) => void;
  startTrip: (id: string) => void;
  advanceStage: (id: string) => void;
  cancelActive: (id: string) => void;

  rideById: (id: string) => Ride | undefined;
};

const Ctx = createContext<DriverStore | null>(null);

export function DriverStoreProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [jobs, setJobs] = useState<Ride[]>(AVAILABLE_RIDES);
  const [activeRide, setActiveRide] = useState<Ride | null>(ACTIVE_RIDE);
  const [history, setHistory] = useState<Ride[]>(HISTORY_RIDES);

  const acceptJob = useCallback((id: string) => {
    setJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (!job) return prev;
      setActiveRide((cur) => {
        // If a trip is already active, park it in Upcoming instead of losing it.
        if (cur) {
          setHistory((h) => [{ ...cur, stage: "accepted", bucket: "upcoming" }, ...h]);
        }
        return { ...job, stage: "accepted", bucket: "active" };
      });
      return prev.filter((j) => j.id !== id);
    });
  }, []);

  const declineJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  // Resume a parked/upcoming trip: pull it from history and make it active,
  // parking any currently-active trip back into Upcoming.
  const startTrip = useCallback(
    (id: string) => {
      const target = history.find((r) => r.id === id);
      if (!target) return;
      setHistory((hist) => {
        const rest = hist.filter((r) => r.id !== id);
        return activeRide
          ? [{ ...activeRide, stage: "accepted" as TripStage, bucket: "upcoming" as const }, ...rest]
          : rest;
      });
      setActiveRide({ ...target, bucket: "active" });
    },
    [history, activeRide]
  );

  const advanceStage = useCallback((id: string) => {
    setActiveRide((cur) => {
      if (!cur || cur.id !== id) return cur;
      const idx = TRIP_FLOW.indexOf(cur.stage as (typeof TRIP_FLOW)[number]);
      const next = TRIP_FLOW[idx + 1] as TripStage | undefined;
      if (!next) return cur;
      if (next === "completed") {
        setHistory((h) => [{ ...cur, stage: "completed", bucket: "completed" }, ...h]);
        return null;
      }
      return { ...cur, stage: next };
    });
  }, []);

  const cancelActive = useCallback((id: string) => {
    setActiveRide((cur) => {
      if (!cur || cur.id !== id) return cur;
      setHistory((h) => [{ ...cur, stage: "cancelled", bucket: "cancelled" }, ...h]);
      return null;
    });
  }, []);

  const rideById = useCallback(
    (id: string) =>
      (activeRide && activeRide.id === id ? activeRide : undefined) ??
      jobs.find((j) => j.id === id) ??
      history.find((h) => h.id === id),
    [activeRide, jobs, history]
  );

  const value = useMemo<DriverStore>(
    () => ({
      online,
      setOnline,
      jobs,
      activeRide,
      history,
      acceptJob,
      declineJob,
      startTrip,
      advanceStage,
      cancelActive,
      rideById,
    }),
    [online, jobs, activeRide, history, acceptJob, declineJob, startTrip, advanceStage, cancelActive, rideById]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDriverStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDriverStore must be used within DriverStoreProvider");
  return ctx;
}
