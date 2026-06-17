import { redirect } from "next/navigation";
import { Plane } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user || profile?.role !== "customer") {
    redirect("/login");
  }

  const name = profile?.full_name?.trim() || user.email || "Traveller";

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-white px-5 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plane className="size-5 -rotate-45" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-navy">
            Wicket
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {name}
          </span>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="h-9 rounded-[10px] text-sm"
            >
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-9 md:px-8">
        {children}
      </main>
    </div>
  );
}
