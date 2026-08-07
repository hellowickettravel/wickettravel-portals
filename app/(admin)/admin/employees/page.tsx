"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pencil,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";
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
import { PlusIcon } from "@/components/admin/icons";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
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
  const [showPassword, setShowPassword] = useState(false);

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
      setShowPassword(false);
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

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    createMutation.mutate({
      fullName,
      email,
      password,
      accessLevel,
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
      `${emp.full_name ?? ""} ${emp.email ?? ""} ${ACCESS_LEVEL_LABELS[normalizeAccess(emp.access_level)]}`
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
  const renderActions = (emp: Profile) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${emp.full_name || "employee"}`}
        className="inline-flex size-9 items-center justify-center rounded-lg text-ink-600 outline-none transition-colors hover:bg-neutral-bg hover:text-ink-800 focus-visible:ring-[3px] focus-visible:ring-brand/25"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push(`/admin/employees/${emp.id}`)}
        >
          <Eye className="size-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(emp)}>
          <Pencil className="size-4" />
          Edit employee
        </DropdownMenuItem>
        {emp.is_active ? (
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onClick={() => setDeactivating(emp)}
          >
            <Ban className="size-4" />
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => activeMutation.mutate({ id: emp.id, isActive: true })}
          >
            <CheckCircle2 className="size-4" />
            Activate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onClick={() => setDeleting(emp)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
                        <Td>{ACCESS_LEVEL_LABELS[level]}</Td>
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

      {/* Add Employee dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins">Add Employee</DialogTitle>
            <DialogDescription>
              Creates a login and team member with the access level you choose.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Full name
              </Label>
              <Input
                id="emp-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Email
              </Label>
              <Input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@wicket.co.uk"
                required
                disabled={createMutation.isPending}
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-access" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Access level
              </Label>
              <select
                id="emp-access"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                disabled={createMutation.isPending}
                className="h-10 w-full rounded-[10px] border border-input bg-surface-1 px-3 text-sm text-ink-800 outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-marine-500 focus-visible:ring-[3px] focus-visible:ring-brand/25"
              >
                {ACCESS_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {ACCESS_LEVEL_LABELS[lvl]} — {ACCESS_LEVEL_DESCRIPTIONS[lvl]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-pass" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Temporary password
              </Label>
              <div className="relative">
                <Input
                  id="emp-pass"
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
                  "Create employee"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit employee dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins">Edit employee</DialogTitle>
            <DialogDescription>
              Update this team member’s details and access level.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing)
                editMutation.mutate({
                  id: editing.id,
                  fullName: editName,
                  email: editEmail,
                  accessLevel: editAccess,
                });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Full name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Jane Smith"
                required
                disabled={editMutation.isPending}
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="jane@wicket.co.uk"
                required
                disabled={editMutation.isPending}
                className="h-10 rounded-[10px] bg-surface-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-access" className="text-ink-500 text-[11px] font-medium uppercase tracking-[0.09em]">
                Access level
              </Label>
              <select
                id="edit-access"
                value={editAccess}
                onChange={(e) => setEditAccess(e.target.value as AccessLevel)}
                disabled={editMutation.isPending}
                className="h-10 w-full rounded-[10px] border border-input bg-surface-1 px-3 text-sm text-ink-800 outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-marine-500 focus-visible:ring-[3px] focus-visible:ring-brand/25"
              >
                {ACCESS_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {ACCESS_LEVEL_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={editMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(o) => !o && setDeactivating(null)}
        title="Deactivate employee?"
        description={
          deactivating
            ? `${deactivating.full_name || "This employee"} will lose access to the portal until reactivated. Their conversations and orders are kept.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          deactivating &&
          activeMutation.mutate({ id: deactivating.id, isActive: false })
        }
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete employee?"
        description={
          deleting
            ? `This permanently removes ${deleting.full_name || "this employee"} and their login — this cannot be undone. Orders they created and messages they sent are kept (un-attributed); their conversation assignments are removed.`
            : ""
        }
        confirmLabel="Delete permanently"
        destructive
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </Screen>
  );
}
