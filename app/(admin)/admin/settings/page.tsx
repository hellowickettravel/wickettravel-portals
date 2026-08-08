"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getBusinessSettings,
  saveBusinessSettings,
  saveBrandLogo,
} from "@/lib/actions/admin";
import {
  getMyNotificationPrefs,
  saveMyNotificationPrefs,
} from "@/lib/actions/notifications";
import { uploadBrandingLogo } from "@/lib/storage";
import { ADMIN_SETTINGS_KEY } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  Btn,
  Card,
  CardHead,
  PageHead,
  Screen,
  focusRing,
  inputClass,
} from "@/components/admin/ui";
import { CheckIcon, UploadIcon } from "@/components/admin/icons";
import { ResetEverything } from "@/components/admin/reset-everything";

const PREFS_KEY = ["notification-prefs"] as const;

const TABS = ["Business profile", "Notifications", "Security"] as const;
type Tab = (typeof TABS)[number];

/** The design's 46×27 switch: marine track when on, 21px white thumb. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[27px] w-[46px] flex-none rounded-full border-0 p-1 outline-none transition-colors duration-150",
        checked ? "bg-marine-500 justify-end" : "bg-line-field justify-start"
      )}
    >
      <span className="block size-[21px] rounded-full bg-white shadow-[0_4px_12px_oklch(0.205_0.038_258_/_0.07)]" />
    </button>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [tab, setTab] = useState<Tab>("Business profile");

  const { data: settings, isLoading } = useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: getBusinessSettings,
  });

  const { data: prefs } = useQuery({
    queryKey: PREFS_KEY,
    queryFn: getMyNotificationPrefs,
  });

  // Business profile form state.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [commission, setCommission] = useState("");
  // The trading identifiers the design's Business profile carries (0021).
  const [companyNumber, setCompanyNumber] = useState("");
  const [atolLicence, setAtolLicence] = useState("");
  const [iataNumber, setIataNumber] = useState("");
  const [currency, setCurrency] = useState("GBP");

  // Notification prefs form state.
  const [newOrder, setNewOrder] = useState(true);
  const [newMessage, setNewMessage] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [statusChange, setStatusChange] = useState(true);

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(settings.business_name ?? "");
      setEmail(settings.business_email ?? "");
      setPhone(settings.business_phone ?? "");
      setAddress(settings.business_address ?? "");
      setCommission(
        settings.default_commission != null
          ? String(settings.default_commission)
          : ""
      );
      setCompanyNumber(settings.company_number ?? "");
      setAtolLicence(settings.atol_licence ?? "");
      setIataNumber(settings.iata_number ?? "");
      setCurrency(settings.currency ?? "GBP");
    }
  }, [settings]);

  useEffect(() => {
    if (prefs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewOrder(prefs.new_order);
      setNewMessage(prefs.new_message);
      setDailySummary(prefs.daily_summary);
      setStatusChange(prefs.status_change);
    }
  }, [prefs]);

  // Realtime: settings changes from another admin appear live.
  useEffect(() => {
    const channel = supabase
      .channel("business-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_settings" },
        () => queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const saveMutation = useMutation({
    mutationFn: saveBusinessSettings,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't save", { description: res.error });
        return;
      }
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
    },
    onError: () =>
      toast.error("Couldn't save", { description: "Please try again." }),
  });

  const prefsMutation = useMutation({
    mutationFn: saveMyNotificationPrefs,
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error("Couldn't save preferences", { description: res.error });
        return;
      }
      toast.success("Notification preferences saved");
      queryClient.invalidateQueries({ queryKey: PREFS_KEY });
    },
    onError: () =>
      toast.error("Couldn't save preferences", {
        description: "Please try again.",
      }),
  });

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = commission.trim() === "" ? null : Number(commission);
    if (parsed != null && !Number.isFinite(parsed)) {
      toast.error("Commission must be a number");
      return;
    }
    saveMutation.mutate({
      businessName: name,
      businessEmail: email,
      businessPhone: phone,
      businessAddress: address,
      defaultCommission: parsed,
      companyNumber,
      atolLicence,
      iataNumber,
      currency,
    });
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError("");
    setUploadingLogo(true);
    const uploaded = await uploadBrandingLogo(file);
    if (!uploaded.ok) {
      setUploadingLogo(false);
      setLogoError(uploaded.error);
      toast.error("Upload failed", { description: uploaded.error });
      return;
    }
    const saved = await saveBrandLogo(uploaded.url);
    setUploadingLogo(false);
    if (!saved.ok) {
      setLogoError(saved.error);
      toast.error("Couldn't save logo", { description: saved.error });
      return;
    }
    toast.success("Logo updated", {
      description: "It now appears in the portal sidebar.",
    });
    queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
  }

  async function removeLogo() {
    const saved = await saveBrandLogo(null);
    if (!saved.ok) {
      toast.error("Couldn't remove logo", { description: saved.error });
      return;
    }
    toast.success("Logo removed");
    queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
  }

  const logoUrl = settings?.logo_url ?? null;

  // The design's nine Business-profile fields, in its own order.
  const FIELDS = [
    { id: "biz-name", label: "Trading name", value: name, set: setName, type: "text" },
    { id: "biz-company", label: "Company number", value: companyNumber, set: setCompanyNumber, type: "text" },
    { id: "biz-atol", label: "ATOL licence", value: atolLicence, set: setAtolLicence, type: "text" },
    { id: "biz-iata", label: "IATA number", value: iataNumber, set: setIataNumber, type: "text" },
    { id: "biz-email", label: "Support email", value: email, set: setEmail, type: "email" },
    { id: "biz-phone", label: "Support phone", value: phone, set: setPhone, type: "text" },
    {
      id: "biz-address",
      label: "Registered address",
      value: address,
      set: setAddress,
      type: "text",
      span: "1 / -1",
    },
    {
      id: "commission",
      label: "Default commission (%)",
      value: commission,
      set: setCommission,
      type: "number",
    },
    { id: "biz-currency", label: "Currency", value: currency, set: setCurrency, type: "text" },
  ];

  const TOGGLES = [
    {
      label: "New order placed",
      hint: "Email you when a customer places an order.",
      checked: newOrder,
      set: setNewOrder,
    },
    {
      label: "Customer message received",
      hint: "Notify you when a customer sends a message in any conversation.",
      checked: newMessage,
      set: setNewMessage,
    },
    {
      label: "Order status changes",
      hint: "Alert you whenever an order moves between New, In progress, Completed or Cancelled.",
      checked: statusChange,
      set: setStatusChange,
    },
    {
      label: "Daily summary email",
      hint: "A daily digest of orders and activity across the platform.",
      checked: dailySummary,
      set: setDailySummary,
    },
  ];

  return (
    <Screen width={1080}>
      <PageHead
        title="Settings"
        intro="Business details, commission rules and who gets told about what."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "h-10 rounded-full border px-5 text-[13px] font-medium whitespace-nowrap outline-none",
              tab === t
                ? "border-ink-800 bg-ink-800 text-white"
                : "border-line-field text-ink-700 hover:bg-surface-1 bg-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Business profile" ? (
        <Card>
          <CardHead title="Business profile" />

          {/* ------------------------------------------------ brand logo */}
          <div className="border-line-soft flex flex-wrap items-center gap-5 border-b p-5">
            <span className="border-line-field bg-marine-tint text-marine-600 font-poppins relative flex size-[76px] flex-none items-center justify-center overflow-hidden rounded-full border text-[22px] font-medium">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Business logo"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                "WT"
              )}
            </span>
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
              <span className="text-ink-800 text-[13px] font-medium">
                Business logo
              </span>
              <span className="text-ink-500 text-[12.5px] leading-[1.5] font-normal text-pretty">
                PNG or JPEG only. Square images look best — this shows in the
                portal sidebar and on anything you send to customers.
              </span>
              <span className="text-ink-500 text-[11.5px] font-normal">
                {logoUrl ? "Logo uploaded" : "No logo uploaded yet"}
              </span>
              {logoError ? (
                <span className="text-danger-ink text-[12px] font-medium">
                  {logoError}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={handleLogo}
              />
              <Btn
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UploadIcon size={15} />
                )}
                {logoUrl ? "Replace logo" : "Upload logo"}
              </Btn>
              {/* The design pairs Upload with a Remove that only appears once
                  something has been uploaded. */}
              {logoUrl ? (
                <Btn
                  disabled={uploadingLogo}
                  onClick={async () => {
                    setLogoError("");
                    const res = await saveBrandLogo(null);
                    if (!res.ok) {
                      setLogoError(res.error);
                      return;
                    }
                    toast.success("Logo removed");
                    queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEY });
                  }}
                >
                  Remove
                </Btn>
              ) : null}
              {logoUrl ? <Btn onClick={removeLogo}>Remove</Btn> : null}
            </div>
          </div>

          {/* ---------------------------------------------------- fields */}
          <form onSubmit={save}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-5">
              {FIELDS.map((f) => (
                <label
                  key={f.id}
                  style={f.span ? { gridColumn: f.span } : undefined}
                  className="flex min-w-0 flex-col gap-2"
                >
                  <span className="text-ink-700 text-[11.5px] font-medium">
                    {f.label}
                  </span>
                  <input
                    id={f.id}
                    type={f.type}
                    value={f.value}
                    disabled={isLoading}
                    onChange={(e) => f.set(e.target.value)}
                    className={cn(inputClass, focusRing)}
                  />
                </label>
              ))}
            </div>
            <div className="px-5 pb-5">
              <Btn
                variant="ember"
                type="submit"
                disabled={saveMutation.isPending || isLoading}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckIcon size={15} />
                )}
                Save changes
              </Btn>
            </div>
          </form>
        </Card>
      ) : null}

      {tab === "Notifications" ? (
        <Card>
          <CardHead title="Notification preferences" />
          {TOGGLES.map((t) => (
            <div
              key={t.label}
              className="border-line-soft relative flex flex-wrap items-center gap-4 border-b px-5 py-4 last:border-b-0"
            >
              <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                <span className="text-[13px] font-medium">{t.label}</span>
                <span className="text-ink-500 text-[12.5px] leading-[1.5] font-normal text-pretty">
                  {t.hint}
                </span>
              </span>
              <Toggle
                checked={t.checked}
                label={t.label}
                onChange={(v) => t.set(v)}
              />
            </div>
          ))}
          <div className="border-line-soft border-t p-5">
            <Btn
              variant="ember"
              onClick={() =>
                prefsMutation.mutate({
                  newOrder,
                  newMessage,
                  dailySummary,
                  statusChange,
                })
              }
              disabled={prefsMutation.isPending}
            >
              {prefsMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckIcon size={15} />
              )}
              Save preferences
            </Btn>
          </div>
        </Card>
      ) : null}

      {tab === "Security" ? <ResetEverything /> : null}
    </Screen>
  );
}
