"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOrderFromChat } from "@/lib/actions/employee";
import type { InboxConversation } from "@/lib/db/conversations";
import { MY_ORDERS_KEY } from "@/lib/query-keys";

function fieldLabel(text: string) {
  return (
    <span className="font-label text-xs font-medium uppercase tracking-wider text-slate-600">
      {text}
    </span>
  );
}

function parseNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  conversations,
  presetConversationId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conversations the employee can file an order against (the picker source). */
  conversations: InboxConversation[];
  /** When launched from a chat, lock the conversation to this id. */
  presetConversationId?: string;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();

  const [convId, setConvId] = useState<string>(
    presetConversationId ?? conversations[0]?.id ?? ""
  );
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState("");

  // Keep the preset honoured each time the dialog re-opens from a chat.
  const effectiveConvId = presetConversationId ?? convId;
  const selected = useMemo(
    () => conversations.find((c) => c.id === effectiveConvId),
    [conversations, effectiveConvId]
  );
  const customerName = selected?.customer?.name ?? "this customer";

  function reset() {
    setRouteFrom("");
    setRouteTo("");
    setTravelDate("");
    setReturnDate("");
    setPassengers("1");
    setSellingPrice("");
    setCostPrice("");
    setCommission("");
    setNotes("");
  }

  const mutation = useMutation({
    mutationFn: createOrderFromChat,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't create order", { description: res.error });
        return;
      }
      toast.success("Order created", {
        description: `Linked to ${customerName}. It's now in My Orders.`,
      });
      reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: MY_ORDERS_KEY });
      onCreated?.();
    },
    onError: () =>
      toast.error("Couldn't create order", { description: "Please try again." }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick a conversation first.");
      return;
    }
    if (!selected.customer?.id) {
      toast.error("This conversation has no linked customer.");
      return;
    }
    mutation.mutate({
      conversationId: selected.id,
      customerId: selected.customer.id,
      routeFrom,
      routeTo,
      travelDate: travelDate || null,
      returnDate: returnDate || null,
      passengers: parseNum(passengers),
      sellingPrice: parseNum(sellingPrice),
      costPrice: parseNum(costPrice),
      commission: parseNum(commission),
      notes: notes || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Create order</DialogTitle>
          <DialogDescription>
            {presetConversationId
              ? `Pre-filled from your chat with ${customerName}.`
              : "Pick one of your conversations and file an order against it."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!presetConversationId ? (
            <div className="space-y-2">
              <Label htmlFor="ord-conv">{fieldLabel("Conversation")}</Label>
              <select
                id="ord-conv"
                value={convId}
                onChange={(e) => setConvId(e.target.value)}
                disabled={mutation.isPending || conversations.length === 0}
                className="h-10 w-full rounded-[10px] border border-input bg-neutral-soft px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30"
              >
                {conversations.length === 0 ? (
                  <option value="">No assigned conversations</option>
                ) : (
                  conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer?.name || c.customer?.wa_phone || "Unknown customer"}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ord-from">{fieldLabel("From")}</Label>
              <Input
                id="ord-from"
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
                placeholder="LHR"
                required
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-to">{fieldLabel("To")}</Label>
              <Input
                id="ord-to"
                value={routeTo}
                onChange={(e) => setRouteTo(e.target.value)}
                placeholder="DXB"
                required
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ord-travel">{fieldLabel("Travel date")}</Label>
              <Input
                id="ord-travel"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-return">{fieldLabel("Return date")}</Label>
              <Input
                id="ord-return"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ord-pax">{fieldLabel("Passengers")}</Label>
              <Input
                id="ord-pax"
                type="number"
                min={1}
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-sell">{fieldLabel("Selling price (£)")}</Label>
              <Input
                id="ord-sell"
                type="number"
                min={0}
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ord-cost">{fieldLabel("Cost price (£)")}</Label>
              <Input
                id="ord-cost"
                type="number"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-comm">{fieldLabel("Commission (£)")}</Label>
              <Input
                id="ord-comm"
                type="number"
                min={0}
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="0.00"
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ord-notes">{fieldLabel("Notes")}</Label>
            <Textarea
              id="ord-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember about this booking…"
              rows={3}
              disabled={mutation.isPending}
              className="rounded-[10px] bg-neutral-soft"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !selected}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create order"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
