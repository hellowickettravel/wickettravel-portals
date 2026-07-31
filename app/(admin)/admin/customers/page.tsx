"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contact, Download, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilterBar,
  FilterBarSpacer,
  FilterChips,
  FilterSearch,
} from "@/components/portal/filter-bar";
import { DataTable, type DataColumn } from "@/components/portal/data-table";
import { LoadMoreFooter } from "@/components/portal/pagination";
import { PasswordInput } from "@/components/portal/password-input";
import { listCustomersWithStats, createCustomer } from "@/lib/actions/admin";
import { useListControls } from "@/lib/hooks/use-list-controls";
import type { OrderStatus } from "@/lib/db/types";
import { downloadCsv } from "@/lib/csv";
import { fmtDate, num } from "@/lib/format";

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
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
    onError: () =>
      toast.error("Couldn't create customer", { description: "Please try again." }),
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createMutation.mutate({ fullName, email, password, waPhone: waPhone || null });
  }

  // Newest customers first (the server sorts alphabetically for the order
  // picker; this list wants latest-at-top). Sort a copy so we don't mutate cache.
  const all = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [data]
  );
  // Filter by order status first (customers with a matching order), then let the
  // shared controls handle name/phone search + paging over the narrowed set.
  const statusFiltered = useMemo(
    () =>
      statusTab === "all"
        ? all
        : all.filter((c) => c.orderStatuses.includes(statusTab)),
    [all, statusTab]
  );
  // Counts for the chips: how many customers have an order in each state.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: all.length };
    for (const t of STATUS_TABS) {
      const status = t.value;
      if (status === "all") continue;
      counts[status] = all.filter((c) =>
        c.orderStatuses.includes(status)
      ).length;
    }
    return counts;
  }, [all]);

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

  type CustomerRow = (typeof all)[number];

  const columns: DataColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Name",
      mobile: "title",
      cell: (c) => (
        <span className="font-semibold text-tx-head">{c.name || "Unnamed"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      mobile: "subtitle",
      // A phone number is a code, not prose — tabular so the columns align.
      cell: (c) =>
        c.wa_phone ? (
          <span className="tabular text-tx-muted">{c.wa_phone}</span>
        ) : (
          <span className="text-tx-faint">—</span>
        ),
    },
    {
      key: "account",
      header: "Account",
      mobile: "badge",
      // Mint = they have a working login. Neutral = a lead with no account yet;
      // that isn't a problem, so it isn't rose.
      cell: (c) => (
        <StatusBadge tone={c.profile_id ? "green" : "slate"}>
          {c.profile_id ? "Account" : "Lead"}
        </StatusBadge>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      numeric: true,
      cell: (c) => c.orderCount,
    },
    {
      key: "conversations",
      header: "Conversations",
      numeric: true,
      cell: (c) => c.conversationCount,
    },
    {
      key: "created",
      header: "Created",
      numeric: true,
      cell: (c) => fmtDate(c.created_at),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${num(all.length)} on the books`}
        title="Customers"
        subtitle="Everyone who has booked or messaged Wicket Travel."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={all.length === 0}>
              <Download />
              Export CSV
            </Button>
            <Button onClick={() => setOpen(true)}>
              <UserPlus />
              Add customer
            </Button>
          </>
        }
      />

      <section className="space-y-5">
        <FilterBar>
          <FilterChips
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as "all" | OrderStatus)}
            options={STATUS_TABS.map((t) => ({
              value: t.value,
              label: t.label,
              count: statusCounts[t.value] ?? 0,
            }))}
          />
          <FilterBarSpacer />
          <FilterSearch
            value={query}
            onValueChange={setQuery}
            placeholder="Search by name or phone…"
            aria-label="Search customers"
          />
        </FilterBar>

        <DataTable
          columns={columns}
          rows={visible}
          getRowKey={(c) => c.id}
          rowHref={(c) => `/admin/customers/${c.id}`}
          caption="Customers, newest first"
          unit="customers"
          loading={isLoading}
          error={isError}
          empty={
            all.length === 0
              ? {
                  icon: <Contact />,
                  title: "No customers yet",
                  description: "Customers appear here once they sign up or message in.",
                  action: (
                    <Button onClick={() => setOpen(true)}>
                      <UserPlus />
                      Add customer
                    </Button>
                  ),
                }
              : {
                  icon: <Contact />,
                  title: "Nobody matches that",
                  description:
                    "Try a different name or phone number, or switch the status filter.",
                }
          }
          footer={
            hasMore ? (
              <LoadMoreFooter
                remaining={total - visible.length}
                step={PAGE_SIZE}
                unit="customers"
                onLoadMore={loadMore}
              />
            ) : null
          }
        />
      </section>

      {/* Add Customer dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Creates a portal login so the customer can sign in straight away.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate}>
            <FieldGroup>
              <Field label="Full name" htmlFor="cust-name" required>
                <Input
                  id="cust-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={createMutation.isPending}
                />
              </Field>
              <Field label="Email" htmlFor="cust-email" required>
                <Input
                  id="cust-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  disabled={createMutation.isPending}
                />
              </Field>
              <Field
                label="Phone number"
                htmlFor="cust-phone"
                hint="Optional — used to match them to an existing conversation."
              >
                <Input
                  id="cust-phone"
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="+44 7700 900000"
                  disabled={createMutation.isPending}
                />
              </Field>
              <Field
                label="Temporary password"
                htmlFor="cust-pass"
                hint="At least 8 characters. They can change it once they sign in."
                required
              >
                <PasswordInput
                  id="cust-pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  disabled={createMutation.isPending}
                />
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-8">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
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
