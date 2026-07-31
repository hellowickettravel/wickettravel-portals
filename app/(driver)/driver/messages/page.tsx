"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Phone, MapPin, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHAT_THREAD, type ChatMessage } from "@/lib/driver/mock";
import { useDriverStore } from "@/lib/driver/store";
import { cn } from "@/lib/utils";

export default function DriverMessagesPage() {
  const router = useRouter();
  const { activeRide } = useDriverStore();
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_THREAD);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const customerName = activeRide?.customerName ?? "Meera Chandra";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const time = `${((now.getHours() + 11) % 12) + 1}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() < 12 ? "AM" : "PM"}`;
    setMessages((m) => [...m, { id: `d-${Date.now()}`, from: "driver", body: text, time }]);
    setDraft("");
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div className="flex h-[calc(100dvh-9.5rem)] min-h-[440px] flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 shadow-lift lg:h-[calc(100dvh-8rem)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-full bg-sky-tint font-semibold text-ocean-deep">
              {customerName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate tracking-heading text-sm font-semibold text-tx-head">
              {customerName}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {activeRide ? activeRide.ref : "Customer"}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Call customer" className="text-tx-muted">
            <Phone className="size-4" />
          </Button>
        </div>

        {/* Trip context strip */}
        {activeRide ? (
          <div className="flex items-center gap-2 border-b border-border bg-sunk/60 px-4 py-2 text-xs text-muted-foreground">
            <User className="size-3.5 shrink-0" />
            <span className="truncate">
              Pickup {activeRide.pickupPoint} · Drop {activeRide.dropoff}
            </span>
          </div>
        ) : null}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-sunk/40 px-4 py-4">
          <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[11px] text-muted-foreground ring-1 ring-inset ring-line-strong">
            Today
          </p>
          {messages.map((m) => {
            const mine = m.from === "driver";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className="max-w-[80%] sm:max-w-[65%]">
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-white text-foreground"
                    )}
                  >
                    {m.body}
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
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            className="shrink-0"
            disabled={!draft.trim()}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
