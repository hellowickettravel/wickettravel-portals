"use client";

import { useState } from "react";
import { Paperclip, Send, FilePlus2, Lock, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import {
  MY_CONVERSATIONS,
  type EmpConversation,
  type EmpChatMessage,
  type EmpConversationStatus,
} from "@/lib/mock/employee";
import { type AccessLevel, isReadOnly } from "@/lib/access";
import { cn } from "@/lib/utils";

const CONVO_TONE: Record<EmpConversationStatus, Tone> = {
  Open: "blue",
  Pending: "amber",
  Closed: "green",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MessagesInbox({ accessLevel }: { accessLevel: AccessLevel }) {
  const readOnly = isReadOnly(accessLevel);
  const [activeId, setActiveId] = useState<string | undefined>(
    MY_CONVERSATIONS[0]?.id
  );
  const [threads, setThreads] = useState<Record<string, EmpChatMessage[]>>(() =>
    Object.fromEntries(MY_CONVERSATIONS.map((c) => [c.id, c.messages]))
  );
  const [draft, setDraft] = useState("");

  const active: EmpConversation | undefined = MY_CONVERSATIONS.find(
    (c) => c.id === activeId
  );
  const messages = activeId ? threads[activeId] ?? [] : [];

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    setThreads((prev) => ({
      ...prev,
      [activeId]: [
        ...(prev[activeId] ?? []),
        { id: `local-${(prev[activeId]?.length ?? 0) + 1}`, from: "me", text, time },
      ],
    }));
    setDraft("");
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {/* LEFT — conversation list */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-border md:w-[330px]",
          active && "hidden md:flex"
        )}
      >
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search chats…" className="h-10 rounded-[10px] bg-neutral-soft pl-9" />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {MY_CONVERSATIONS.map((c) => {
            const isActive = c.id === activeId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors",
                    isActive ? "bg-chip/60" : "hover:bg-neutral-soft"
                  )}
                >
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-chip text-xs font-semibold text-brand-dark">
                      {initialsOf(c.customer)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{c.customer}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
                      {c.unread > 0 ? (
                        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* RIGHT — conversation view */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !active && "hidden md:flex")}>
        {active ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveId(undefined)}
                  className="text-sm text-brand md:hidden"
                >
                  ←
                </button>
                <Avatar className="size-9">
                  <AvatarFallback className="bg-chip text-xs font-semibold text-brand-dark">
                    {initialsOf(active.customer)}
                  </AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <p className="font-display text-sm font-semibold text-navy">{active.customer}</p>
                  <p className="text-xs text-muted-foreground">{active.phone}</p>
                </div>
                <StatusBadge tone={CONVO_TONE[active.status]} className="ml-1 hidden sm:inline-flex">
                  {active.status}
                </StatusBadge>
              </div>
              {!readOnly ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.success("Create order", {
                      description: "UI only — pre-fills a new order from this chat.",
                    })
                  }
                >
                  <FilePlus2 className="size-4" />
                  <span className="hidden sm:inline">Create order</span>
                </Button>
              ) : null}
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-soft/50 px-4 py-5 md:px-6">
              {messages.map((m) => {
                const mine = m.from === "me";
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[60%]",
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border border-border bg-white text-foreground"
                      )}
                    >
                      <p className="leading-relaxed">{m.text}</p>
                      <span className={cn("mt-1 block text-right text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                        {m.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input / read-only notice */}
            {readOnly ? (
              <div className="flex items-center justify-center gap-2 border-t border-border bg-muted/60 px-4 py-4 text-sm text-muted-foreground">
                <Lock className="size-4" />
                Read-only access — you can view but not reply.
              </div>
            ) : (
              <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-full text-muted-foreground"
                  onClick={() => toast.info("Attach image", { description: "UI only — image upload comes later." })}
                >
                  <Paperclip className="size-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  className="h-11 rounded-full bg-neutral-soft"
                />
                <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={!draft.trim()}>
                  <Send className="size-4" />
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start.
          </div>
        )}
      </section>
    </div>
  );
}
