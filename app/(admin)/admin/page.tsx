import { Users, ShoppingBag, MessageSquare, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-navy">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your team, orders and conversations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Employees" value="—" hint="Active team members" icon={Users} />
        <StatCard label="Open Orders" value="—" hint="Awaiting action" icon={ShoppingBag} />
        <StatCard label="Conversations" value="—" hint="Across the inbox" icon={MessageSquare} />
        <StatCard label="Revenue" value="—" hint="This month" icon={TrendingUp} />
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This is a placeholder shell. Real analytics, employee management and
          order tables will be wired up in upcoming steps.
        </CardContent>
      </Card>
    </div>
  );
}
