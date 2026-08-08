"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  CheckCircleIcon,
  EditIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  UserPlusIcon,
} from "@/components/admin/icons";
import { AccessCard, PersonDialog } from "@/components/admin/person-dialog";
import { ConfirmSheet } from "@/components/admin/sheet";
import {
  listEmployees,
  listOrders,
  createEmployee,
  setEmployeeActive,
  updateEmployee,
  deleteEmployee,
} from "@/lib/actions/admin";
import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVEL_DESCRIPTIONS,
  ACCESS_LEVELS,
  normalizeAccess,
  type AccessLevel,
} from "@/lib/access";
import type { Profile } from "@/lib/db/types";

const EMPLOYEES_KEY = ["admin", "employees"] as const;
const PAGE_SIZE = 5;

/** The design's own option lists on the Add-employee form. */
const JOB_TITLES = [
  "Ticketing agent",
  "Senior consultant",
  "Visa specialist",
  "Customer support",
  "Accounts",
];
const COMMISSION_BANDS = [
  "Standard — 8%",
  "Senior — 10%",
  "Trainee — 5%",
  "No commission",
];

export default function EmployeesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const topSearch = params.get("q") ?? "";
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });

  const { data: employees, isLoading, isError } = useQuery({
    queryKey: EMPLOYEES_KEY,
    queryFn: listEmployees,
  });

  // Add form state
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("full");
  // The rest of the design's Add-employee form.
  const [jobTitle, setJobTitle] = useState(JOB_TITLES[0]);
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [commissionRate, setCommissionRate] = useState(COMMISSION_BANDS[0]);
  const [status, setStatus] = useState("active");

  // Deactivate / delete / edit targets
  const [deactivating, setDeactivating] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAccess, setEditAccess] = useState<AccessLevel>("full");

  function openEdit(emp: Profile) {
    setEditing(emp);
    setEditName(emp.full_name ?? "");
    setEditEmail(emp.email ?? "");
    setEditAccess(normalizeAccess(emp.access_level));
  }

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't create employee", { description: res.error });
        return;
      }
      toast.success("Employee created", {
        description: "They can sign in with the email and password you set.",
      });
      setOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setAccessLevel("full");
      setJobTitle(JOB_TITLES[0]);
      setPhone("");
      setStartDate("");
      setCommissionRate(COMMISSION_BANDS[0]);
      setStatus("active");
      invalidate();
    },
    onError: () =>
      toast.error("Couldn't create employee", {
        description: "Please try again.",
      }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setEmployeeActive(id, isActive),
    onSuccess: (res, vars) => {
      if (!res.ok) {
        toast.error("Update failed", { description: res.error });
        return;
      }
      toast.success(vars.isActive ? "Employee activated" : "Employee deactivated");
      invalidate();
    },
    onError: () => toast.error("Update failed", { description: "Please try again." }),
  });

  const editMutation = useMutation({
    mutationFn: (input: {
      id: string;
      fullName: string;
      email: string;
      accessLevel: AccessLevel;
    }) => updateEmployee(input),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Update failed", { description: res.error });
        return;
      }
      toast.success("Employee updated");
      setEditing(null);
      invalidate();
    },
    onError: () => toast.error("Update failed", { description: "Please try again." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't delete employee", { description: res.error });
        return;
      }
      toast.success("Employee deleted");
      setDeleting(null);
      invalidate();
    },
    onError: () =>
      toast.error("Couldn't delete employee", { description: "Please try again." }),
  });

  function handleCreate() {
    createMutation.mutate({
      fullName,
      email,
      password,
      accessLevel,
      jobTitle,
      phone,
      startDate,
      commissionRate,
      active: status === "active",
    });
  }

  const all = useMemo(() => employees ?? [], [employees]);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [search, setSearch] = useState(topSearch);

  // Open orders per employee — the design's fourth column, computed from the
  // live order list rather than a stored counter.
  const { data: orders } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: listOrders,
  });
  const openOrdersBy = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders ?? []) {
      if (o.status !== "new" && o.status !== "in_progress") continue;
      const id = o.assigned_employee_id;
      if (id) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((emp) =>
      `${emp.full_name ?? ""} ${emp.email ?? ""} ${emp.job_title ?? ""} ${ACCESS_LEVEL_LABELS[normalizeAccess(emp.access_level)]}`
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

  // Shared row-actions menu, reused by the desktop table + mobile cards.
  /**
   * The design's people table ends on a single View pill and has no overflow
   * menu at all. These actions have to live somewhere, so they sit inline as
   * 30px icon pills in the design's own control language rather than in a
   * shadcn dropdown wearing the other portals' skin.
   */
  const iconBtn =
    "border-line-field hover:bg-surface-1 hover:border-ink-300 inline-flex size-[30px] items-center justify-center rounded-full border bg-white outline-none";

  const renderActions = (emp: Profile) => (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        title="Edit employee"
        aria-label={`Edit ${emp.full_name || "employee"}`}
        onClick={() => openEdit(emp)}
        className={cn(iconBtn, "text-ink-600", focusRing)}
      >
        <EditIcon size={14} />
      </button>
      {emp.is_active ? (
        <button
          type="button"
          title="Deactivate account"
          aria-label={`Deactivate ${emp.full_name || "employee"}`}
          onClick={() => setDeactivating(emp)}
          className={cn(iconBtn, "text-ink-600", focusRing)}
        >
          <PowerIcon size={14} />
        </button>
      ) : (
        <button
          type="button"
          title="Activate account"
          aria-label={`Activate ${emp.full_name || "employee"}`}
          onClick={() => activeMutation.mutate({ id: emp.id, isActive: true })}
          className={cn(iconBtn, "text-ok-ink", focusRing)}
        >
          <CheckCircleIcon size={14} />
        </button>
      )}
      <button
        type="button"
        title="Delete employee"
        aria-label={`Delete ${emp.full_name || "employee"}`}
        onClick={() => setDeleting(emp)}
        className={cn(iconBtn, "text-danger-ink", focusRing)}
      >
        <TrashIcon size={14} />
      </button>
    </span>
  );

  return (
    <Screen>
      <PageHead
        title="Employees"
        intro="Employee accounts and what they are working on. Deactivated accounts keep their history but cannot sign in."
        actions={
          <Btn variant="ember" onClick={() => setOpen(true)}>
            <PlusIcon size={15} />
            Add employee
          </Btn>
        }
      />

      <DesignCard>
        <div className="border-line-soft border-b px-5 py-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role or email"
            aria-label="Search employees"
            className={cn(
              "border-line-field bg-surface-1 text-ink-800 h-10 w-full max-w-[380px] rounded-[10px] border px-4 text-[13px] font-normal outline-none focus:bg-white",
              focusRing
            )}
          />
        </div>

        {isLoading ? (
          <DesignTableSkeleton rows={5} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load employees"
            body="Something went wrong reading the team list. Refresh the page to try again."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              all.length === 0 ? "No employees yet" : "No employees match that search"
            }
            body={
              all.length === 0
                ? "Add your first team member to give them portal access. They receive their login by email."
                : "Try a different name, role or email address."
            }
            action={
              all.length === 0 ? (
                <Btn variant="ember" onClick={() => setOpen(true)}>
                  <PlusIcon size={15} />
                  Add employee
                </Btn>
              ) : (
                <Btn onClick={() => setSearch("")}>Clear search</Btn>
              )
            }
          />
        ) : (
          <>
            <TableScroll>
              <DTable min={900}>
                <Thead>
                  <Th>Employee</Th>
                  <Th>Role</Th>
                  <Th>Email</Th>
                  <Th>Open orders</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </Thead>
                <tbody>
                  {visible.map((emp) => {
                    const level = normalizeAccess(emp.access_level);
                    const name = emp.full_name || "Unnamed";
                    return (
                      <Tr
                        key={emp.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/employees/${emp.id}`)}
                      >
                        <Td>
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="text-ink-800 flex items-center gap-3 no-underline hover:no-underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Avatar name={name} size={30} />
                            <span className="text-[13px] font-medium">{name}</span>
                          </Link>
                        </Td>
                        {/* The design's Role column is a job title; the access
                            level is a permission tier and reads beneath it. */}
                        <Td>
                          <span className="flex flex-col gap-0.5">
                            <span className="text-ink-800 text-[13px] font-medium">
                              {emp.job_title?.trim() || "No title set"}
                            </span>
                            <span className="text-ink-500 text-[11.5px] font-normal">
                              {ACCESS_LEVEL_LABELS[level]}
                            </span>
                          </span>
                        </Td>
                        <Td className="text-ink-600 text-[13px]">
                          {emp.email ?? "—"}
                        </Td>
                        <Td className="font-semibold tabular-nums">
                          {openOrdersBy.get(emp.id) ?? 0}
                        </Td>
                        <Td>
                          <Pill tone={emp.is_active ? "ok" : "ink"}>
                            {emp.is_active ? "Active" : "Deactivated"}
                          </Pill>
                        </Td>
                        <Td align="right" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1.5">
                            <ViewButton href={`/admin/employees/${emp.id}`} />
                            {renderActions(emp)}
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
              noun="employees"
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

      {/* Add Employee — the design's own modal, not the shared shadcn sheet */}
      <PersonDialog
        open={open}
        onClose={() => setOpen(false)}
        icon={<UserPlusIcon size={20} />}
        title="Add employee"
        subtitle="Creates the staff account, its login and the parts of the portal they can reach."
        cta="Create employee account"
        note="They can sign in with the email and temporary password you set here."
        busy={createMutation.isPending}
        onSubmit={handleCreate}
        sections={[
          {
            title: "Employee details",
            fields: [
              {
                kind: "text",
                id: "emp-name",
                label: "Full name",
                placeholder: "First and last name",
                required: true,
                value: fullName,
                onChange: setFullName,
              },
              {
                kind: "select",
                id: "emp-title",
                label: "Job title",
                options: JOB_TITLES.map((t) => ({ value: t, label: t })),
                value: jobTitle,
                onChange: setJobTitle,
              },
              {
                kind: "text",
                id: "emp-email",
                label: "Work email",
                type: "email",
                placeholder: "name@wickettravel.co.uk",
                required: true,
                value: email,
                onChange: setEmail,
              },
              {
                kind: "text",
                id: "emp-phone",
                label: "Phone number",
                type: "tel",
                placeholder: "+44 …",
                value: phone,
                onChange: setPhone,
              },
              {
                kind: "text",
                id: "emp-start",
                label: "Start date",
                type: "date",
                value: startDate,
                onChange: setStartDate,
              },
              {
                kind: "select",
                id: "emp-commission",
                label: "Commission rate",
                options: COMMISSION_BANDS.map((c) => ({ value: c, label: c })),
                value: commissionRate,
                onChange: setCommissionRate,
              },
            ],
          },
          {
            title: "Login",
            fields: [
              {
                kind: "text",
                id: "emp-pass",
                label: "Temporary password",
                type: "password",
                placeholder: "At least 8 characters",
                required: true,
                value: password,
                onChange: setPassword,
              },
              {
                kind: "select",
                id: "emp-status",
                label: "Account status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ],
                value: status,
                onChange: setStatus,
              },
            ],
          },
        ]}
        extra={
          <div className="flex flex-col gap-[14px] pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-ink-500 text-[11px] font-semibold tracking-[0.11em] uppercase">
                Access level
              </span>
              {/* The design offers a tick per area. What RLS actually enforces
                  here is one tier per employee, so the same cards are a single
                  choice — a per-area matrix would not be honoured. */}
              <span className="text-ink-600 text-[12.5px] font-normal text-pretty">
                Pick the tier this employee works at. It decides what they can
                open and what they can change.
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Access level"
              className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2.5"
            >
              {ACCESS_LEVELS.map((lvl) => (
                <AccessCard
                  key={lvl}
                  label={ACCESS_LEVEL_LABELS[lvl]}
                  hint={ACCESS_LEVEL_DESCRIPTIONS[lvl]}
                  checked={accessLevel === lvl}
                  onSelect={() => setAccessLevel(lvl)}
                />
              ))}
            </div>
          </div>
        }
      />

      {/* Edit employee — the same design sheet as Add */}
      <PersonDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        icon={<EditIcon size={20} />}
        title="Edit employee"
        subtitle="Change their name, sign-in email or what they can reach in the portal."
        cta="Save changes"
        note="Changing the email changes the address they sign in with."
        busy={editMutation.isPending}
        onSubmit={() =>
          editing &&
          editMutation.mutate({
            id: editing.id,
            fullName: editName,
            email: editEmail,
            accessLevel: editAccess,
          })
        }
        sections={[
          {
            title: "Employee details",
            fields: [
              {
                kind: "text",
                id: "edit-emp-name",
                label: "Full name",
                required: true,
                value: editName,
                onChange: setEditName,
              },
              {
                kind: "text",
                id: "edit-emp-email",
                label: "Work email",
                type: "email",
                required: true,
                value: editEmail,
                onChange: setEditEmail,
              },
            ],
          },
        ]}
        extra={
          <div className="flex flex-col gap-[14px] pt-6">
            <span className="text-ink-500 text-[11px] font-semibold tracking-[0.11em] uppercase">
              Access level
            </span>
            <div
              role="radiogroup"
              aria-label="Access level"
              className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2.5"
            >
              {ACCESS_LEVELS.map((lvl) => (
                <AccessCard
                  key={lvl}
                  label={ACCESS_LEVEL_LABELS[lvl]}
                  hint={ACCESS_LEVEL_DESCRIPTIONS[lvl]}
                  checked={editAccess === lvl}
                  onSelect={() => setEditAccess(lvl)}
                />
              ))}
            </div>
          </div>
        }
      />

      {/* Deactivate confirmation */}
      <ConfirmSheet
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        onConfirm={() => {
          if (deactivating) {
            activeMutation.mutate({ id: deactivating.id, isActive: false });
            setDeactivating(null);
          }
        }}
        destructive
        busy={activeMutation.isPending}
        icon={<PowerIcon size={20} />}
        title="Deactivate employee?"
        body={
          deactivating
            ? `${deactivating.full_name || "This employee"} will lose access to the portal until reactivated. Their conversations and orders are kept.`
            : ""
        }
        confirmLabel="Deactivate"
      />

      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        destructive
        busy={deleteMutation.isPending}
        icon={<TrashIcon size={20} />}
        title="Delete employee?"
        body={
          deleting
            ? `This permanently removes ${deleting.full_name || "this employee"} and their login — it cannot be undone. Orders they created and messages they sent are kept but un-attributed, and their conversation assignments are removed.`
            : ""
        }
        confirmLabel="Delete permanently"
      />
    </Screen>
  );
}
