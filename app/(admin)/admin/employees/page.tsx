"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
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
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { useListControls } from "@/lib/hooks/use-list-controls";
import {
  listEmployees,
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
import { fmtDate } from "@/lib/format";

const ACCESS_TONE: Record<AccessLevel, Tone> = {
  full: "blue",
  semi_admin: "gold",
  chat_only: "violet",
  view_only: "slate",
};

const EMPLOYEES_KEY = ["admin", "employees"] as const;

export default function EmployeesPage() {
  const router = useRouter();
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

  const all = employees ?? [];
  const { query, setQuery, visible, total, hasMore, loadMore } = useListControls(
    all,
    10,
    (emp, q) =>
      (emp.full_name ?? "").toLowerCase().includes(q) ||
      (emp.email ?? "").toLowerCase().includes(q)
  );

  // Shared row-actions menu, reused by the desktop table + mobile cards.
  const renderActions = (emp: Profile) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${emp.full_name || "employee"}`}
        className="inline-flex size-9 items-center justify-center rounded-control text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ocean/25"
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Team"
        title="Employees"
        subtitle="Manage your team, their access levels and assignments."
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="size-4" />
            Add Employee
          </Button>
        }
      />

      {all.length > 0 ? (
        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
      ) : null}

      <SectionCard flush>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Couldn’t load employees. Refresh to try again.
          </p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-surface bg-sky-tint text-ocean-deep">
              <UserPlus className="size-6" />
            </div>
            <p className="tracking-heading text-base font-semibold text-foreground">
              No employees yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first team member to give them portal access.
            </p>
            <Button className="mt-2" onClick={() => setOpen(true)}>
              <UserPlus className="size-4" />
              Add Employee
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <div className="space-y-3 p-4 md:hidden">
              {visible.map((emp) => {
                const level = normalizeAccess(emp.access_level);
                return (
                  <MobileRecordCard
                    key={emp.id}
                    title={
                      <Link href={`/admin/employees/${emp.id}`} className="hover:text-ocean">
                        <UserCell name={emp.full_name || "Unnamed"} />
                      </Link>
                    }
                    action={renderActions(emp)}
                    badge={
                      <StatusBadge tone={emp.is_active ? "green" : "slate"}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    }
                    fields={[
                      { label: "Email", value: emp.email ?? "—", wide: true },
                      {
                        label: "Access",
                        value: (
                          <StatusBadge tone={ACCESS_TONE[level]}>
                            {ACCESS_LEVEL_LABELS[level]}
                          </StatusBadge>
                        ),
                      },
                      { label: "Joined", value: fmtDate(emp.created_at) },
                    ]}
                  />
                );
              })}
            </div>

            {/* Desktop: full table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((emp) => {
                    const level = normalizeAccess(emp.access_level);
                    return (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/employees/${emp.id}`)}
                      >
                        <TableCell className="pl-6">
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="hover:text-ocean"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <UserCell name={emp.full_name || "Unnamed"} />
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {emp.email ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={ACCESS_TONE[level]}>
                            {ACCESS_LEVEL_LABELS[level]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={emp.is_active ? "green" : "slate"}>
                            {emp.is_active ? "Active" : "Inactive"}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtDate(emp.created_at)}
                        </TableCell>
                        <TableCell
                          className="pr-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderActions(emp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* Add Employee dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-heading">Add Employee</DialogTitle>
            <DialogDescription>
              Creates a login and team member with the access level you choose.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                Full name
              </Label>
              <Input
                id="emp-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-access" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                Access level
              </Label>
              <select
                id="emp-access"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                disabled={createMutation.isPending}
                className="h-10 w-full rounded-control border border-input bg-sunk px-3 text-base text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-ocean focus-visible:ring-[3px] focus-visible:ring-ocean/25 sm:text-sm"
              >
                {ACCESS_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {ACCESS_LEVEL_LABELS[lvl]} — {ACCESS_LEVEL_DESCRIPTIONS[lvl]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-pass" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
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
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-1 text-muted-foreground transition-colors hover:text-foreground"
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
            <DialogTitle className="tracking-heading">Edit employee</DialogTitle>
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
              <Label htmlFor="edit-name" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                Full name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Jane Smith"
                required
                disabled={editMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-access" className="text-xs font-medium uppercase tracking-wider text-tx-muted">
                Access level
              </Label>
              <select
                id="edit-access"
                value={editAccess}
                onChange={(e) => setEditAccess(e.target.value as AccessLevel)}
                disabled={editMutation.isPending}
                className="h-10 w-full rounded-control border border-input bg-sunk px-3 text-base text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-ocean focus-visible:ring-[3px] focus-visible:ring-ocean/25 sm:text-sm"
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
    </div>
  );
}
