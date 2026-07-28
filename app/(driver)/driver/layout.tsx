import type { Metadata } from "next";
import { DriverStoreProvider } from "@/lib/driver/store";
import { DriverShell } from "@/components/driver/driver-shell";

export const metadata: Metadata = {
  title: "Driver Partner · Wicket Travel",
};

/**
 * Driver Partner Portal shell (UI phase — no auth yet). Everything under
 * /driver (except the auth screens, which live outside this group) renders
 * inside the mobile-first driver app shell with shared mock state.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverStoreProvider>
      <DriverShell>{children}</DriverShell>
    </DriverStoreProvider>
  );
}
