import { MessageSquare, ShoppingBag, Clock } from "lucide-react";
import { StatCard } from "@/components/portal/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployeeDashboardPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-navy">
          Employee Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your assigned conversations and orders at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="My Chats" value="—" hint="Assigned to you" icon={MessageSquare} />
        <StatCard label="My Orders" value="—" hint="In progress" icon={ShoppingBag} />
        <StatCard label="Awaiting Reply" value="—" hint="Needs a response" icon={Clock} />
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This is a placeholder shell. The WhatsApp-style chat inbox and order
          tools will appear here in the next build steps.
        </CardContent>
      </Card>
    </div>
  );
}
