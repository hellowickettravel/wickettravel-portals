import { redirect } from "next/navigation";
import { getUserAndProfile, roleDashboardPath } from "@/lib/auth";
import { CustomerNav } from "@/components/customer/customer-nav";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    redirect("/login");
  }
  if (profile?.role !== "customer") {
    // Logged in but wrong portal → send to their own dashboard, not /login.
    redirect(roleDashboardPath(profile?.role) ?? "/login");
  }

  const name = profile?.full_name?.trim() || user.email || "Traveller";

  return (
    <div className="min-h-dvh bg-background">
      <CustomerNav userName={name} />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
