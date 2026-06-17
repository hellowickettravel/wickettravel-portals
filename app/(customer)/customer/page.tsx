import { Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomerHomePage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy">
          My Bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your flights and orders here.
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
            <Plane className="size-6 -rotate-45" />
          </div>
          <p className="font-display text-base font-semibold text-foreground">
            No bookings yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            When you place an order with our team, it will appear here. This
            portal is a placeholder — full booking management is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
