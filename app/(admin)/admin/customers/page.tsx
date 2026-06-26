"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Contact,
  Download,
  Eye,
  EyeOff,
  ChevronRight,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/portal/skeletons";
import { MobileRecordCard } from "@/components/portal/mobile-record-card";
import { listCustomersWithStats, createCustomer } from "@/lib/actions/admin";
import { useListControls } from "@/lib/hooks/use-list-controls";
import type { OrderStatus } from "@/lib/db/types";
import { downloadCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CUSTOMERS_KEY = ["admin", "customers", "list"] as const;
const PAGE_SIZE = 12;

const STATUS_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AdminCustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: listCustomersWithStats,
  });

  // Add Customer form state
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusTab, setStatusTab] = useState<"all" | OrderStatus>("all");

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't create customer", { description: res.error });
        return;
      }
      toast.success("Customer created", {
        description: "They can sign in with the email and password you set.",
      });
      setOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setWaPhone("");
      setShowPassword(false);
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
    onError: () =>
      toast.error("Couldn't create customer", { description: "Please try again." }),
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createMutation.mutate({ fullName, email, password, waPhone: waPhone || null });
  }

  const all = data ?? [];
  // Filter by order status first (customers with a matching order), then let the
  // shared controls handle name/phone search + paging over the narrowed set.
  const statusFiltered = useMemo(
    () =>
      statusTab === "all"
        ? all
        : all.filter((c) => c.orderStatuses.includes(statusTab)),
    [all, statusTab]
  );
  const { query, setQuery, visible, total, hasMore, loadMore } = useListControls(
    statusFiltered,
    PAGE_SIZE,
    (c, q) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.wa_phone ?? "").toLowerCase().includes(q)
  );

  function exportCsv() {
    downloadCsv(
      "customers.csv",
      ["Name", "Phone", "Has account", "Orders", "Conversations", "Created"],
      all.map((c) => [
        c.name ?? "",
        c.wa_phone ?? "",
        c.profile_id ? "Yes" : "No",
        c.orderCount,
        c.conversationCount,
        fmtDate(c.created_at),
      ])
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="People"
        title="Customers"
        subtitle="Everyone who's booked or messaged Wicket."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={all.length === 0}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button onClick={() => setOpen(true)}>
              <UserPlus className="size-4" />
              Add Customer
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusTab(t.value)}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                statusTab === t.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative lg:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="h-10 rounded-[10px] bg-card pl-9"
          />
        </div>
      </div>

      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load customers. Refresh to try again.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <Contact className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No customers yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Customers appear here once they sign up or message in.
            </p>
            <Button className="mt-2" onClick={() => setOpen(true)}>
              <UserPlus className="size-4" />
              Add Customer
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-4 md:hidden">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No customers match your search.
                </p>
              ) : (
                visible.map((c) => (
                  <Link key={c.id} href={`/admin/customers/${c.id}`} className="block">
                    <MobileRecordCard
                      title={<span className="text-navy">{c.name || "Unnamed"}</span>}
                      subtitle={c.wa_phone ?? "No phone"}
                      action={
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-brand">
                          View
                          <ChevronRight className="size-4" />
                        </span>
                      }
                      badge={
                        <StatusBadge tone={c.profile_id ? "green" : "slate"}>
                          {c.profile_id ? "Account" : "Lead"}
                        </StatusBadge>
                      }
                      fields={[
                        { label: "Orders", value: c.orderCount },
                        { label: "Chats", value: c.conversationCount },
                        { label: "Created", value: fmtDate(c.created_at), wide: true },
                      ]}
                    />
                  </Link>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center">Conversations</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="pr-6 text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${c.id}`)}
                    >
                      <TableCell className="pl-6 font-medium text-navy">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="hover:text-brand"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.name || "Unnamed"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.wa_phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={c.profile_id ? "green" : "slate"}>
                          {c.profile_id ? "Account" : "Lead"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {c.orderCount}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {c.conversationCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDate(c.created_at)}
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
                        >
                          <Eye className="size-4" />
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No customers match your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {hasMore ? (
              <div className="flex justify-center border-t border-border p-4">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load more ({total - visible.length} more)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      {/* Add Customer dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Customer</DialogTitle>
            <DialogDescription>
              Creates a portal login so the customer can sign in straight away.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Full name
              </Label>
              <Input
                id="cust-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Email
              </Label>
              <Input
                id="cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Phone number <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="cust-phone"
                type="tel"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+44 7700 900000"
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-pass" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Temporary password
              </Label>
              <div className="relative">
                <Input
                  id="cust-pass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  disabled={createMutation.isPending}
                  className="h-10 rounded-[10px] bg-neutral-soft pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create customer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
