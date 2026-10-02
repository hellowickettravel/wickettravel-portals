"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { LoadMore } from "@/components/admin/load-more";
import { PlusIcon, UserPlusIcon } from "@/components/admin/icons";
import { PersonDialog } from "@/components/admin/person-dialog";
import { DeleteRowButton } from "@/components/admin/delete-row";
import {
  listCustomersWithStats,
  createCustomer,
  listEmployees,
  deleteCustomer,
} from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

const CUSTOMERS_KEY = ["admin", "customers", "list"] as const;
const PAGE_SIZE = 5;

/** The design's own nationality list on the Add-customer form. */
const NATIONALITIES = [
  "United Kingdom",
  "India",
  "China",
  "Nigeria",
  "Ireland",
  "Other",
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
  // The rest of the design's Add-customer form.
  const [preferredName, setPreferredName] = useState("");
  const [nationality, setNationality] = useState(NATIONALITIES[0]);
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [status, setStatus] = useState("active");

  // Consultants for the "Assigned consultant" select.
  const { data: employees } = useQuery({
    queryKey: ["admin", "employees"],
    queryFn: listEmployees,
  });

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
      setPreferredName("");
      setNationality(NATIONALITIES[0]);
      setDob("");
      setAddress("");
      setInternalNote("");
      setConsultantId("");
      setStatus("active");
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
    onError: () =>
      toast.error("Couldn't create customer", { description: "Please try again." }),
  });

  function handleCreate() {
    createMutation.mutate({
      fullName,
      email,
      password,
      waPhone: waPhone || null,
      preferredName,
      nationality,
      dateOfBirth: dob,
      address,
      internalNote,
      consultantId: consultantId || null,
      active: status === "active",
    });
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
  const [search, setSearch] = useState(topSearch);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) =>
      `${c.name ?? ""} ${c.email ?? ""} ${c.wa_phone ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [all, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(PAGE_SIZE);
  }, [search]);

  const visible = rows.slice(0, limit);
  const remaining = Math.max(0, rows.length - limit);

  return (
    <Screen>
      <PageHead
        title="Customers"
        intro="Everyone with a customer account, whether they signed up themselves or an employee created the account for them."
        actions={
          /* The design's people screens carry a single action. */
          <Btn variant="ember" onClick={() => setOpen(true)}>
            <PlusIcon size={15} />
            Add customer
          </Btn>
        }
      />

      <DesignCard>
        {/* The design gives a people screen one control: the search box. */}
        <div className="border-line-soft border-b px-5 py-4">
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
                  onClick={() => setSearch("")}
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
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Orders</Th>
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
                          {c.email ?? "—"}
                        </Td>
                        <Td className="text-ink-600 text-[13px]">
                          {c.wa_phone ?? "—"}
                        </Td>
                        <Td className="font-semibold tabular-nums">
                          {c.orderCount}
                        </Td>
                        <Td>
                          <Pill tone={c.profile_id ? "ok" : "ink"}>
                            {c.profile_id ? "Active" : "Lead"}
                          </Pill>
                        </Td>
                        <Td align="right" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-2">
                            <DeleteRowButton
                              what="customer"
                              name={name}
                              body={`This permanently removes ${name}, their portal login and their conversations. Their orders are kept for revenue history but un-linked from the customer. This can't be undone.`}
                              action={() => deleteCustomer(c.id)}
                              onDeleted={() => queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY })}
                            />
                            <ViewButton href={`/admin/customers/${c.id}`} />
                          </span>
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
                  <LoadMore
                    remaining={remaining}
                    pageSize={PAGE_SIZE}
                    noun="customers"
                    onLoad={() => setLimit((l) => l + PAGE_SIZE)}
                  />
                ) : undefined
              }
            />
          </>
        )}
      </DesignCard>

      {/* Add Customer — the design's own modal */}
      <PersonDialog
        open={open}
        onClose={() => setOpen(false)}
        icon={<UserPlusIcon size={20} />}
        title="Add customer"
        subtitle="Creates the customer record and their portal login. They can sign in with the temporary password you set."
        cta="Create customer account"
        note="They can change their own name and password from their portal settings."
        busy={createMutation.isPending}
        onSubmit={handleCreate}
        sections={[
          {
            title: "Personal details",
            fields: [
              {
                kind: "text",
                id: "cust-name",
                label: "Full name",
                placeholder: "As shown on passport",
                required: true,
                value: fullName,
                onChange: setFullName,
              },
              {
                kind: "text",
                id: "cust-preferred",
                label: "Preferred name",
                placeholder: "Optional",
                value: preferredName,
                onChange: setPreferredName,
              },
              {
                kind: "text",
                id: "cust-email",
                label: "Email address",
                type: "email",
                placeholder: "name@example.com",
                required: true,
                value: email,
                onChange: setEmail,
              },
              {
                kind: "text",
                id: "cust-phone",
                label: "Phone number",
                type: "tel",
                placeholder: "+44 …",
                value: waPhone,
                onChange: setWaPhone,
              },
              {
                kind: "select",
                id: "cust-nationality",
                label: "Nationality",
                options: NATIONALITIES.map((n) => ({ value: n, label: n })),
                value: nationality,
                onChange: setNationality,
              },
              {
                kind: "text",
                id: "cust-dob",
                label: "Date of birth",
                type: "date",
                value: dob,
                onChange: setDob,
              },
              {
                kind: "area",
                id: "cust-address",
                label: "Address",
                placeholder: "Street, city, postcode",
                full: true,
                value: address,
                onChange: setAddress,
              },
            ],
          },
          {
            title: "Account & login",
            fields: [
              {
                kind: "text",
                id: "cust-pass",
                label: "Temporary password",
                type: "password",
                placeholder: "At least 8 characters",
                required: true,
                value: password,
                onChange: setPassword,
              },
              {
                kind: "select",
                id: "cust-status",
                label: "Account status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ],
                value: status,
                onChange: setStatus,
              },
              {
                kind: "select",
                id: "cust-consultant",
                label: "Assigned consultant",
                options: [
                  { value: "", label: "Unassigned" },
                  ...(employees ?? []).map((e) => ({
                    value: e.id,
                    label: e.full_name || e.email || "Employee",
                  })),
                ],
                value: consultantId,
                onChange: setConsultantId,
              },
              {
                kind: "area",
                id: "cust-note",
                label: "Internal note",
                placeholder: "How they found us, special requirements…",
                full: true,
                value: internalNote,
                onChange: setInternalNote,
              },
            ],
          },
        ]}
      />

    </Screen>
  );
}
