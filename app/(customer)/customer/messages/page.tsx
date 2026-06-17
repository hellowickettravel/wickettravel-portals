"use client";

import { useState } from "react";
import { Plane, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHAT_MESSAGES, type ChatMessage } from "@/lib/mock/customer";
import { cn } from "@/lib/utils";

export default function CustomerMessagesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
  const [draft, setDraft] = useState("");

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    setMessages((prev) => [
      ...prev,
      { id: `local-${prev.length}`, from: "customer", text, time },
    ]);
    setDraft("");
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chat with the Wicket team about your trips.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-16rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plane className="size-5 -rotate-45" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-navy">Wicket Team</p>
            <p className="text-xs text-emerald-600">Online · typically replies in minutes</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-soft/50 px-4 py-5 md:px-6">
          {messages.map((m) => {
            const mine = m.from === "customer";
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[65%]",
                    mine
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-white text-foreground"
                  )}
                >
                  <p className="leading-relaxed">{m.text}</p>
                  <span
                    className={cn(
                      "mt-1 block text-right text-[10px]",
                      mine ? "text-white/70" : "text-muted-foreground"
                    )}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-border bg-card px-4 py-3"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="h-11 rounded-full bg-neutral-soft"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            className="size-11 shrink-0 rounded-full"
            disabled={!draft.trim()}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        This is a portal mirror of your WhatsApp chat — your real conversations stay on WhatsApp.
      </p>
    </div>
  );
}
