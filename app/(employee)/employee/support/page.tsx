import { getSupportContactEmail } from "@/lib/actions/support";
import { EmployeeSupport } from "@/components/employee/support-view";

export default async function EmployeeSupportPage() {
  const adminEmail = await getSupportContactEmail();
  return <EmployeeSupport adminEmail={adminEmail} />;
}
