import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Trend = { dir: "up" | "down"; value: string };

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: Trend;
  hint?: string;
};

export function StatCard({ label, value, icon: Icon, trend, hint }: StatCardProps) {
  return (
    <Card className="shadow-card">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <p className="font-label text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="flex size-9 items-center justify-center rounded-xl bg-chip text-brand-dark">
            <Icon className="size-[18px]" />
          </div>
        </div>
        <p className="mt-3 font-display text-2xl font-semibold text-foreground">
          {value}
        </p>
        {trend ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trend.dir === "up" ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {trend.dir === "up" ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {trend.value}
            </span>
            <span className="text-muted-foreground">{hint ?? "vs last month"}</span>
          </div>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
