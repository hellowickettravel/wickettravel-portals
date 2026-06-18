"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { listCustomers, createOrder } from "@/lib/actions/admin";
import type { OrderStatus } from "@/lib/db/types";

const ADMIN_CUSTOMERS_KEY = ["admin", "customers"] as const;
const ADMIN_ORDERS_KEY = ["admin", "orders"] as const;

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const selectClass =
  "h-10 w-full rounded-[10px] border border-input bg-neutral-soft px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] duration-150 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/25";

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

/**
 * Admin "New Order" — pick any existing customer and file an order against
 * them. Not tied to a conversation (created_by = admin, conversation_id null).
 */
export function AdminCreateOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ADMIN_CUSTOMERS_KEY,
    queryFn: listCustomers,
    enabled: open,
  });
  const custs = customers ?? [];

  const [customerId, setCustomerId] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OrderStatus>("open");

  function reset() {
    setCustomerId("");
    setRouteFrom("");
    setRouteTo("");
    setTravelDate("");
    setReturnDate("");
    setPassengers("1");
    setSellingPrice("");
    setCostPrice("");
    setCommission("");
    setNotes("");
    setStatus("open");
  }

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't create order", { description: res.error });
        return;
      }
      toast.success("Order created", { description: "It's now in Orders." });
      reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY });
    },
    onError: () =>
      toast.error("Couldn't create order", { description: "Please try again." }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerId) {
      toast.error("Pick a customer first.");
      return;
    }
    mutation.mutate({
      customerId,
      routeFrom,
      routeTo,
      travelDate: travelDate || null,
      returnDate: returnDate || null,
      passengers: parseNum(passengers),
      sellingPrice: parseNum(sellingPrice),
      costPrice: parseNum(costPrice),
      commission: parseNum(commission),
      notes: notes || null,
      status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">New order</DialogTitle>
          <DialogDescription>
            Create an order for an existing customer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ao-cust">{fieldLabel("Customer")}</Label>
            <select
              id="ao-cust"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={mutation.isPending || custs.length === 0}
              className={selectClass}
            >
              {custs.length === 0 ? (
                <option value="">No customers yet</option>
              ) : (
                <>
                  <option value="">— Select customer —</option>
                  {custs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.wa_phone || "Unnamed customer"}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ao-from">{fieldLabel("From")}</Label>
              <Input
                id="ao-from"
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
                placeholder="LHR"
                required
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ao-to">{fieldLabel("To")}</Label>
              <Input
                id="ao-to"
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
              <Label htmlFor="ao-travel">{fieldLabel("Travel date")}</Label>
              <Input
                id="ao-travel"
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ao-return">{fieldLabel("Return date")}</Label>
              <Input
                id="ao-return"
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
              <Label htmlFor="ao-pax">{fieldLabel("Passengers")}</Label>
              <Input
                id="ao-pax"
                type="number"
                min={1}
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                disabled={mutation.isPending}
                className="h-10 rounded-[10px] bg-neutral-soft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ao-status">{fieldLabel("Status")}</Label>
              <select
                id="ao-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                disabled={mutation.isPending}
                className={selectClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ao-sell">{fieldLabel("Selling (£)")}</Label>
              <Input
                id="ao-sell"
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
            <div className="space-y-2">
              <Label htmlFor="ao-cost">{fieldLabel("Cost (£)")}</Label>
              <Input
                id="ao-cost"
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
              <Label htmlFor="ao-comm">{fieldLabel("Commission (£)")}</Label>
              <Input
                id="ao-comm"
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
            <Label htmlFor="ao-notes">{fieldLabel("Notes")}</Label>
            <Textarea
              id="ao-notes"
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
            <Button type="submit" disabled={mutation.isPending || custs.length === 0}>
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
