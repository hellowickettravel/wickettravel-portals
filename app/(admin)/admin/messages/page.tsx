import Link from "next/link";
import { Eye, Inbox } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { UserCell } from "@/components/admin/user-cell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getConversationsOverview } from "@/lib/db/conversations";
import type { ConversationStatus } from "@/lib/db/types";
import { fmtRelative, titleCase } from "@/lib/format";

const CONVO_TONE: Record<ConversationStatus, Tone> = {
  open: "blue",
  closed: "green",
};

export default async function MessagesPage() {
  const conversations = await getConversationsOverview();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        subtitle="An overview of every customer conversation across the team."
      />

      <SectionCard flush>
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-chip text-brand-dark">
              <Inbox className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              No conversations yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Customer conversations will appear here once messaging is active.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Customer</TableHead>
                <TableHead className="w-[36%]">Last message</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6">
                    <UserCell
                      name={c.customer?.name || "Unknown"}
                      sub={c.customer?.wa_phone ?? undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                      {c.preview ?? "No messages yet"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.assignedEmployee ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={CONVO_TONE[c.status]}>
                      {titleCase(c.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtRelative(c.last_message_at)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={`/admin/messages/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand transition-colors hover:bg-chip hover:text-brand-dark focus-visible:ring-[3px] focus-visible:ring-brand/25"
                    >
                      <Eye className="size-4" />
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
