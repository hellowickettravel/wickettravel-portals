"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PersonDialog, type PersonSection } from "@/components/admin/person-dialog";
import { EditIcon, UserPlusIcon } from "@/components/admin/icons";
import { listOrderCustomers } from "@/lib/actions/admin";
import { saveTraveller } from "@/lib/actions/travellers";
import { EMPTY_TRAVELLER, RELATIONSHIPS, type TravellerInput } from "@/lib/travellers";

/**
 * Add / edit a traveller — the design's own 780px person sheet, the same one
 * Add customer and Add employee use, driven by a traveller field model.
 */
export function TravellerForm({
  open,
  onClose,
  initial,
  isAccountHolder = false,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Omit to add a new traveller. */
  initial?: TravellerInput | null;
  /** They are the person behind a customer account: nobody books for them. */
  isAccountHolder?: boolean;
  onSaved: (id: string, created: boolean) => void;
}) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [v, setV] = useState<TravellerInput>(initial ?? EMPTY_TRAVELLER);

  // Every time the sheet opens, start from the record (or a blank form) rather
  // than from whatever was half-typed the last time it was closed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setV(initial ?? EMPTY_TRAVELLER);
  }, [open, initial]);

  const { data: customers } = useQuery({
    queryKey: ["admin", "travel-details", "bookers"],
    queryFn: listOrderCustomers,
    enabled: open && !isAccountHolder,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: saveTraveller,
    onSuccess: (res) => {
      if (!res.ok) {
        const existing = res.existingId;
        toast.error(editing ? "Couldn't save changes" : "Couldn't add traveller", {
          description: res.error,
          action: existing
            ? { label: "Open", onClick: () => router.push(`/admin/travel-details/${existing}`) }
            : undefined,
        });
        return;
      }
      toast.success(editing ? "Changes saved" : "Traveller saved", {
        description: editing ? undefined : `${v.fullName.trim()} is now in Travel details.`,
      });
      onSaved(res.id, !editing);
    },
    onError: () => toast.error("Couldn't save", { description: "Please try again." }),
  });

  const set =
    <K extends keyof TravellerInput>(k: K) =>
    (value: TravellerInput[K]) =>
      setV((cur) => ({ ...cur, [k]: value }));

  const sections: PersonSection[] = [
    {
      title: "Personal details",
      fields: [
        {
          kind: "text",
          id: "tr-name",
          label: "Full name",
          placeholder: "As shown on passport",
          required: true,
          value: v.fullName,
          onChange: set("fullName"),
        },
        {
          kind: "text",
          id: "tr-preferred",
          label: "Preferred name",
          placeholder: "What they like to be called",
          value: v.preferredName,
          onChange: set("preferredName"),
        },
        {
          kind: "text",
          id: "tr-dob",
          label: "Date of birth",
          type: "date",
          value: v.dateOfBirth,
          onChange: set("dateOfBirth"),
        },
        {
          kind: "text",
          id: "tr-nationality",
          label: "Nationality",
          placeholder: "e.g. British",
          value: v.nationality,
          onChange: set("nationality"),
        },
      ],
    },
    {
      title: "Contact",
      fields: [
        {
          kind: "text",
          id: "tr-email",
          label: "Email address",
          type: "email",
          placeholder: "name@example.com",
          value: v.email,
          onChange: set("email"),
        },
        {
          kind: "text",
          id: "tr-phone",
          label: "Phone number",
          type: "tel",
          placeholder: "+44 …",
          value: v.phone,
          onChange: set("phone"),
        },
        // Address and IBE number share a row: address left, IBE right.
        {
          kind: "text",
          id: "tr-address",
          label: "Address",
          placeholder: "Street, city, postcode",
          value: v.address,
          onChange: set("address"),
        },
        {
          kind: "text",
          id: "tr-ibe",
          label: "IBE number",
          placeholder: "As on their booking",
          value: v.ibeNumber,
          onChange: set("ibeNumber"),
        },
      ],
    },
    {
      title: "Passport",
      fields: [
        {
          kind: "text",
          id: "tr-passport",
          label: "Passport number",
          placeholder: "Optional",
          value: v.passportNumber,
          onChange: set("passportNumber"),
        },
        {
          kind: "text",
          id: "tr-passport-expiry",
          label: "Passport expiry",
          type: "date",
          value: v.passportExpiry,
          onChange: set("passportExpiry"),
        },
      ],
    },
    ...(isAccountHolder
      ? []
      : [
          {
            title: "Family & relatives",
            fields: [
              {
                kind: "select" as const,
                id: "tr-booker",
                label: "Books through (customer)",
                options: [
                  { value: "", label: "Nobody — they book for themselves" },
                  ...(customers ?? []).map((c) => ({ value: c.id, label: c.label })),
                  // Keep the saved choice selectable while the list loads.
                  ...(v.bookedByCustomerId && !(customers ?? []).some((c) => c.id === v.bookedByCustomerId)
                    ? [{ value: v.bookedByCustomerId, label: "Current customer" }]
                    : []),
                ],
                value: v.bookedByCustomerId,
                onChange: set("bookedByCustomerId"),
              },
              {
                kind: "select" as const,
                id: "tr-relationship",
                label: "Their relationship to that customer",
                options: [
                  { value: "", label: "Not recorded" },
                  ...RELATIONSHIPS.map((r) => ({ value: r, label: r })),
                ],
                value: v.relationship,
                onChange: set("relationship"),
              },
            ],
          },
        ]),
    {
      title: "Marketing & notes",
      fields: [
        {
          kind: "select",
          id: "tr-marketing",
          label: "Birthday wishes & offers",
          options: [
            { value: "yes", label: "Happy to receive them" },
            { value: "no", label: "Doesn't want marketing emails" },
          ],
          value: v.marketingOptOut ? "no" : "yes",
          onChange: (x) => set("marketingOptOut")(x === "no"),
        },
        {
          kind: "area",
          id: "tr-notes",
          label: "Notes",
          placeholder: "Seat and meal preferences, frequent-flyer numbers, anything worth remembering…",
          full: true,
          value: v.notes,
          onChange: set("notes"),
        },
      ],
    },
  ];

  return (
    <PersonDialog
      open={open}
      onClose={() => !save.isPending && onClose()}
      icon={editing ? <EditIcon size={20} /> : <UserPlusIcon size={20} />}
      title={editing ? `Edit ${initial?.fullName || "traveller"}` : "Add traveller"}
      subtitle={
        editing
          ? isAccountHolder
            ? "They have a customer account, so their date of birth is kept in step with it."
            : "Update what you know about them. Only the full name is required."
          : "Save someone you book travel for. Only the full name is required — fill in whatever else you know."
      }
      cta={editing ? "Save changes" : "Save traveller"}
      busyLabel="Saving…"
      note="Only admins can see Travel details."
      busy={save.isPending}
      onSubmit={() => save.mutate(v)}
      sections={sections}
    />
  );
}
