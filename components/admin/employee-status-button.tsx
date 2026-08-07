"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Btn } from "@/components/admin/ui";
import { PowerIcon } from "@/components/admin/icons";
import { setEmployeeActive } from "@/lib/actions/admin";

/**
 * The design's danger action in the person-detail header: deactivate an
 * employee (they keep their history but cannot sign in), or bring them back.
 */
export function EmployeeStatusButton({
  employeeId,
  isActive,
}: {
  employeeId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await setEmployeeActive(employeeId, !isActive);
    setBusy(false);
    if (!res.ok) {
      toast.error("Couldn't update account", { description: res.error });
      return;
    }
    toast.success(isActive ? "Employee deactivated" : "Employee activated");
    router.refresh();
  }

  return (
    <Btn variant={isActive ? "danger" : "ghost"} disabled={busy} onClick={toggle}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <PowerIcon size={15} />}
      {isActive ? "Deactivate account" : "Activate account"}
    </Btn>
  );
}
