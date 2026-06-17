import { Eye } from "lucide-react";
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
import { CONVERSATIONS, type ConversationStatus } from "@/lib/mock/admin";

const CONVO_TONE: Record<ConversationStatus, Tone> = {
  Open: "blue",
  Pending: "amber",
  Closed: "green",
};

export default function MessagesPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        subtitle="An overview of every customer conversation across the team."
      />

      <SectionCard flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Customer</TableHead>
              <TableHead className="w-[36%]">Last message</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead className="text-center">Unread</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CONVERSATIONS.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-6">
                  <UserCell name={c.customer} sub={c.phone} />
                </TableCell>
                <TableCell>
                  <span className="line-clamp-1 text-sm text-muted-foreground">
                    {c.preview}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.employee}</TableCell>
                <TableCell className="text-center">
                  {c.unread > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      {c.unread}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={CONVO_TONE[c.status]}>{c.status}</StatusBadge>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.lastActivity}</TableCell>
                <TableCell className="pr-6 text-right">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">
                    <Eye className="size-4" />
                    View
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
