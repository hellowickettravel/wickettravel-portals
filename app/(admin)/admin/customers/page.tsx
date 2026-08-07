"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  Btn,
  Card as DesignCard,
  EmptyState,
  PageHead,
  Pill,
  Screen,
  Table as DTable,
  TableFoot,
  TableScroll,
  TableSkeleton as DesignTableSkeleton,
  Td,
  Th,
  Thead,
  Tr,
  ViewButton,
  focusRing,
} from "@/components/admin/ui";
import { ExportIcon, PlusIcon } from "@/components/admin/icons";
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
import { listCustomersWithStats, createCustomer } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";
import { downloadCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CUSTOMERS_KEY = ["admin", "customers", "list"] as const;
const PAGE_SIZE = 5;

const STATUS_TABS: { label: string; value: "all" | OrderStatus }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AdminCustomersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const topSearch = params.get("q") ?? "";
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
  const [search, setSearch] = useState(topSearch);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return statusFiltered;
    return statusFiltered.filter((c) =>
      `${c.name ?? ""} ${c.wa_phone ?? ""}`.toLowerCase().includes(q)
    );
  }, [statusFiltered, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [search, statusTab]);

  const visible = rows.slice(0, limit);
  const remaining = Math.max(0, rows.length - limit);

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
    <Screen>
      <PageHead
        title="Customers"
        intro="Everyone with a customer account, whether they signed up themselves or an employee created the account for them."
        actions={
          <>
            <Btn onClick={exportCsv} disabled={all.length === 0}>
              <ExportIcon size={15} />
              Export CSV
            </Btn>
            <Btn variant="ember" onClick={() => setOpen(true)}>
              <PlusIcon size={15} />
              Add customer
            </Btn>
          </>
        }
      />

      <DesignCard>
        <div className="border-line-soft flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setStatusTab(t.value)}
                aria-pressed={statusTab === t.value}
                className={cn(
                  "flex h-[34px] shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap outline-none",
                  statusTab === t.value
                    ? "border-ink-800 bg-ink-800 text-white"
                    : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search customers"
            className={cn(
              "border-line-field bg-surface-1 text-ink-800 h-10 w-full max-w-[380px] rounded-[10px] border px-4 text-[13px] font-normal outline-none focus:bg-white",
              focusRing
            )}
          />
        </div>

        {isLoading ? (
          <DesignTableSkeleton rows={6} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load customers"
            body="Something went wrong reading the customer list. Refresh the page to try again."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0
                ? "No customers yet"
                : "No customers match these filters"
            }
            body={
              all.length === 0
                ? "Customers appear here the moment they sign up or message in — or add one yourself and we'll email them their login."
                : "Clear the status filter or try a different name, email or phone number."
            }
            action={
              all.length === 0 ? (
                <Btn variant="ember" onClick={() => setOpen(true)}>
                  <PlusIcon size={15} />
                  Add customer
                </Btn>
              ) : (
                <Btn
                  onClick={() => {
                    setSearch("");
                    setStatusTab("all");
                  }}
                >
                  Clear all filters
                </Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <DTable min={900}>
                <Thead>
                  <Th>Customer</Th>
                  <Th>Phone</Th>
                  <Th>Orders</Th>
                  <Th>Conversations</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((c) => {
                    const name = c.name || "Unnamed";
                    return (
                      <Tr
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/customers/${c.id}`)}
                      >
                        <Td>
                          <Link
                            href={`/admin/customers/${c.id}`}
                            className="text-ink-800 flex items-center gap-3 no-underline hover:no-underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Avatar name={name} size={30} />
                            <span className="text-[13px] font-medium">{name}</span>
                          </Link>
                        </Td>
                        <Td className="text-ink-600 text-[13px]">
                          {c.wa_phone ?? "—"}
                        </Td>
                        <Td className="font-semibold tabular-nums">
                          {c.orderCount}
                        </Td>
                        <Td className="font-semibold tabular-nums">
                          {c.conversationCount}
                        </Td>
                        <Td>
                          <Pill tone={c.profile_id ? "ok" : "ink"}>
                            {c.profile_id ? "Active" : "Lead"}
                          </Pill>
                        </Td>
                        <Td align="right" onClick={(e) => e.stopPropagation()}>
                          <ViewButton href={`/admin/customers/${c.id}`} />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </DTable>
            </TableScroll>
            <TableFoot
              shown={visible.length}
              total={rows.length}
              noun="customers"
              action={
                remaining > 0 ? (
                  <Btn onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Load {Math.min(PAGE_SIZE, remaining)} more — {remaining}{" "}
                    remaining
                  </Btn>
                ) : undefined
              }
            />
          </>
        )}
      </DesignCard>

      {/* Add Customer dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins">Add Customer</DialogTitle>
            <DialogDescription>
              Creates a portal login so the customer can sign in straight away.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Full name
              </Label>
              <Input
                id="cust-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
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
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Phone number <span className="font-normal normal-case tracking-normal text-ink-600">(optional)</span>
              </Label>
              <Input
                id="cust-phone"
                type="tel"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+44 7700 900000"
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-pass" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
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
                  className="h-10 rounded-[10px] bg-surface-1 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-600 transition-colors hover:text-ink-800"
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
    </Screen>
  );
}
