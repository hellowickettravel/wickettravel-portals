"use client";

import { useState } from "react";
import { UserPlus, MoreHorizontal, Pencil, Ban } from "lucide-react";
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
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EMPLOYEES, type AccessLevel } from "@/lib/mock/admin";

const ACCESS_TONE: Record<AccessLevel, Tone> = {
  Full: "blue",
  "Chat-only": "violet",
  "View-only": "slate",
};

export default function EmployeesPage() {
  const [open, setOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<
    (typeof EMPLOYEES)[number] | null
  >(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOpen(false);
    toast.success("Employee saved", {
      description: "UI only — this will create the account once wired up.",
    });
  }

  function handleDeactivate() {
    if (!deactivating) return;
    toast.success(`${deactivating.name} deactivated`, {
      description: "UI only — this will disable the account once wired up.",
    });
  }

  return (
    <div className="space-y-7">
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

      <SectionCard flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="text-center">Chats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EMPLOYEES.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="pl-6">
                  <UserCell name={emp.name} />
                </TableCell>
                <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                <TableCell>
                  <StatusBadge tone={ACCESS_TONE[emp.accessLevel]}>
                    {emp.accessLevel}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-center tabular-nums">{emp.chats}</TableCell>
                <TableCell>
                  <StatusBadge tone={emp.status === "Active" ? "green" : "slate"}>
                    {emp.status}
                  </StatusBadge>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label={`Actions for ${emp.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer">
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => setDeactivating(emp)}
                      >
                        <Ban className="size-4" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Add Employee dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Employee</DialogTitle>
            <DialogDescription>
              Create a team member and set their access level.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp-name" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Full name
              </Label>
              <Input id="emp-name" placeholder="Jane Smith" required className="h-10 rounded-[10px] bg-neutral-soft" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Email
              </Label>
              <Input id="emp-email" type="email" placeholder="jane@wicket.co.uk" required className="h-10 rounded-[10px] bg-neutral-soft" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-access" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Access level
              </Label>
              <select
                id="emp-access"
                defaultValue="Full"
                className="h-10 w-full rounded-[10px] border border-input bg-neutral-soft px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25"
              >
                <option value="Full">Full — manage chats, orders &amp; settings</option>
                <option value="Chat-only">Chat-only — conversations only, no orders</option>
                <option value="View-only">View-only — read-only, can&apos;t reply or edit</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-pass" className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
                Temporary password
              </Label>
              <Input id="emp-pass" type="text" placeholder="Set a temporary password" required className="h-10 rounded-[10px] bg-neutral-soft" />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create employee</Button>
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
            ? `${deactivating.name} will lose access to the portal until reactivated. Their conversations and orders are kept.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
