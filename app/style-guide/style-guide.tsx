"use client";

import * as React from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Clock,
  Copy,
  Download,
  MapPin,
  Plane,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Field, FieldGroup } from "@/components/ui/field";
import { IconChip } from "@/components/ui/icon-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panel, Section, SectionHead, SectionWrap } from "@/components/ui/section";
import { Textarea } from "@/components/ui/textarea";

/* ── local scaffolding for the guide itself ───────────────────────── */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-faint py-[17px] first:border-t-0">
      <span className="w-[196px] shrink-0 font-mono text-[10px] leading-[1.75] tracking-[0.06em] text-tx-faint uppercase">
        {label}
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Spec({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-1 border-t border-line-faint px-[22px] py-[15px] first:border-t-0">
      <span className="w-[158px] shrink-0 font-mono text-[10.5px] tracking-[0.07em] text-ocean uppercase">
        {k}
      </span>
      <span className="min-w-[210px] flex-1 text-[14.5px] leading-[1.6] text-tx-body">
        {v}
      </span>
    </div>
  );
}

function Swatch({
  name,
  token,
  hex,
  className,
  note,
}: {
  name: string;
  token: string;
  hex: string;
  className: string;
  note?: string;
}) {
  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface shadow-lift">
      <div className={`relative h-[82px] ${className}`}>
        <span className="absolute bottom-3 left-3.5 rounded-[5px] bg-surface/95 px-2 py-1 font-mono text-[10.5px] tracking-[0.07em] text-ocean-deep">
          {hex}
        </span>
      </div>
      <div className="px-[18px] py-4">
        <b className="block text-[14.5px] font-semibold text-tx-head">{name}</b>
        <span className="mt-1 block font-mono text-[10px] tracking-[0.06em] text-tx-muted">
          {token}
        </span>
        {note ? (
          <small className="mt-1.5 block text-[13.5px] leading-[1.55] text-tx-muted">
            {note}
          </small>
        ) : null}
      </div>
    </div>
  );
}

/* ── the guide ────────────────────────────────────────────────────── */

export function StyleGuide() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* MASTHEAD — the ocean statement band */}
      <header className="relative overflow-hidden bg-[linear-gradient(165deg,var(--ocean)_0%,var(--ocean-deep)_58%,var(--ocean-night)_100%)] py-16">
        <SectionWrap className="relative z-10">
          <span className="font-micro text-amber">
            Wicket Travel · Foundation · Locked
          </span>
          <h1 className="mt-4 max-w-[19ch] text-[clamp(32px,5vw,46px)] leading-[1.1] font-bold tracking-[-0.02em] text-tx-invert">
            Every primitive, in every state.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17.5px] leading-[1.65] text-tx-invert-2">
            Tokens, base styles and primitives only — screens come in later
            passes.{" "}
            <span className="font-editorial">
              If a value isn&apos;t on this page, it doesn&apos;t go on a screen.
            </span>
          </p>
          <div className="mt-9 flex flex-wrap gap-x-11 gap-y-4 border-t border-tx-invert/15 pt-[22px] text-[13.5px] text-tx-invert-3">
            <div>
              Type
              <b className="mt-[3px] block text-[15px] font-semibold text-tx-invert">
                Hanken Grotesk · Newsreader · Plex Mono
              </b>
            </div>
            <div>
              Signature
              <b className="mt-[3px] block text-[15px] font-semibold text-tx-invert">
                The clipped corner
              </b>
            </div>
            <div>
              Discipline
              <b className="mt-[3px] block text-[15px] font-semibold text-tx-invert">
                Four weights, one accent
              </b>
            </div>
          </div>
        </SectionWrap>
      </header>

      {/* 01 — TYPEFACES */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="01 — Typefaces"
            title="Three faces, chosen for temperament"
            lede="Hanken Grotesk does all the work. Newsreader italic appears once per page. Plex Mono carries codes and micro-labels."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardContent>
                <div className="text-[19px] font-bold tracking-[-0.01em] text-tx-head">
                  Hanken Grotesk
                </div>
                <div className="mt-[3px] text-[13px] font-semibold text-coral-deep">
                  Everything — headings, body, UI
                </div>
                <div className="mt-[18px] mb-3.5 text-4xl leading-[1.15] font-bold tracking-[-0.02em] text-ocean">
                  Aa Hyderabad
                </div>
                <p className="text-[14.5px] leading-[1.6] text-tx-muted">
                  Weights 400 · 500 · 600 · 700 — nothing heavier, ever.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-[19px] font-bold tracking-[-0.01em] text-tx-head">
                  Newsreader <span className="font-editorial">italic</span>
                </div>
                <div className="mt-[3px] text-[13px] font-semibold text-coral-deep">
                  Editorial accent, used sparingly
                </div>
                <div className="mt-[18px] mb-3.5 font-editorial text-[34px] leading-[1.15] text-ocean">
                  the best fare, found
                </div>
                <p className="text-[14.5px] leading-[1.6] text-tx-muted">
                  One moment per page. Never for headings, labels or UI.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-[19px] font-bold tracking-[-0.01em] text-tx-head">
                  IBM Plex Mono
                </div>
                <div className="mt-[3px] text-[13px] font-semibold text-coral-deep">
                  Codes, references, micro-labels
                </div>
                <div className="mt-[18px] mb-3.5 font-mono text-[29px] leading-[1.15] font-medium text-coral-deep">
                  LHR → HYD
                </div>
                <p className="text-[14.5px] leading-[1.6] text-tx-muted">
                  Airport codes, booking references, timestamps. Weight 500 only.
                </p>
              </CardContent>
            </Card>
          </div>
        </SectionWrap>
      </Section>

      {/* 02 — TYPE SCALE */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="02 — Type scale"
            title="Every size, weight, spacing and colour"
            lede="Locked values. If a size isn't on this list, it doesn't go on a screen."
          />
          <Card>
            <CardContent>
              <Row label="DISPLAY · hero only · 700 · 44/48 · −0.02em">
                <span className="text-[44px] leading-[1.08] font-bold tracking-[-0.02em] text-tx-head">
                  Fares that hold
                </span>
              </Row>
              <Row label="H1 · page title · 700 · 32/37 · −0.015em">
                <span className="text-[32px] leading-[1.16] font-bold tracking-[-0.015em] text-tx-head">
                  London to Hyderabad
                </span>
              </Row>
              <Row label="H2 · section · 700 · 25/31 · −0.01em">
                <span className="text-[25px] leading-[1.26] font-bold tracking-[-0.01em] text-tx-head">
                  Why people call us back
                </span>
              </Row>
              <Row label="H3 · block · 600 · 19/26 · −0.005em">
                <span className="text-[19px] leading-[1.36] font-semibold tracking-[-0.005em] text-tx-head">
                  Change your dates free
                </span>
              </Row>
              <Row label="H4 · card title · 600 · 16.5/23">
                <span className="text-[16.5px] leading-[1.42] font-semibold text-tx-head">
                  Baggage and seats
                </span>
              </Row>
              <Row label="LEAD · 400 · 18/30 · #37485C">
                <span className="text-[18px] leading-[1.65] text-tx-body">
                  We hold the fare while you check with the family.
                </span>
              </Row>
              <Row label="BODY · 400 · 16/27 · #37485C">
                <span className="text-base leading-[1.7] text-tx-body">
                  Call or message any time — someone here answers, including at
                  midnight.
                </span>
              </Row>
              <Row label="SMALL · 400 · 14.5/23 · #6B7C8E">
                <span className="text-[14.5px] leading-[1.6] text-tx-muted">
                  Baggage, seats and meal preference confirmed before you pay.
                </span>
              </Row>
              <Row label="CAPTION · 400 · 13/20 · #98A6B5">
                <span className="text-[13px] leading-[1.5] text-tx-faint">
                  Prices shown include taxes and airline charges.
                </span>
              </Row>
              <Row label="METRIC · 700 · 30/34 · −0.022em · tabular">
                <span className="tabular text-[30px] leading-[1.15] font-bold tracking-[-0.022em] text-tx-head">
                  £6,420
                </span>
              </Row>
              <Row label="MICRO-LABEL · Plex Mono 500 · 11 · 0.1em">
                <span className="font-micro text-tx-faint">
                  Revenue today · Ref #WT-7343490
                </span>
              </Row>
              <Row label="EDITORIAL · Newsreader italic 400 · 22/32">
                <span className="font-editorial text-[22px] leading-[1.45] text-tx-body">
                  They found it £100 cheaper than the airline&apos;s own site.
                </span>
              </Row>
              <Row label="BUTTON · 600 · 15 · −0.002em">
                <Button>
                  <Search />
                  Search flights
                </Button>
              </Row>
              <Row label="FORM LABEL · 600 · 13.5 · #0A3A66">
                <Label required>Leaving from</Label>
              </Row>
            </CardContent>
          </Card>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Panel>
              <Spec k="Heading" v="#0A3A66 — ocean deep. Never pure black." />
              <Spec k="Body" v="#37485C — 9.4:1. Softer than black, still AAA." />
              <Spec k="Muted" v="#6B7C8E — captions, secondary lines, 4.9:1." />
              <Spec k="Faint" v="#98A6B5 — placeholders, micro-labels, disabled." />
              <Spec k="Link" v="#0F4C81, underline at 3px offset, 1px thickness" />
            </Panel>
            <Panel>
              <Spec k="Accent text" v="#C0451F — eyebrows, fares, one link per view." />
              <Spec k="On ocean" v="#FFFFFF headings · #C6DCEF body · #A6C6E2 muted" />
              <Spec k="Measure" v="Body capped at 68 characters. Lead at 58." />
              <Spec k="Numerals" v="tabular-nums on every fare, metric and table column" />
              <Spec k="Utilities" v="font-micro · font-editorial · tabular" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 03 — COLOUR */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="03 — Colour"
            title="Ocean, coral, and four data hues"
            lede="The hue is fixed by meaning and reused on every screen. Ocean for volume, amber for money, indigo for waiting, mint for confirmed, rose for attention, coral for featured."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Swatch name="Ocean" token="bg-ocean" hex="#0F4C81" className="bg-ocean" note="Primary action, links, brand surface." />
            <Swatch name="Ocean deep" token="bg-ocean-deep" hex="#0A3A66" className="bg-ocean-deep" note="Headings, sidebar, primary hover." />
            <Swatch name="Ocean night" token="bg-ocean-night" hex="#082F55" className="bg-ocean-night" note="The bottom of every ocean gradient." />
            <Swatch name="Sky" token="bg-sky" hex="#7EC3F0" className="bg-sky" note="Graphical accents on ocean." />
            <Swatch name="Sky tint" token="bg-sky-tint" hex="#EDF4FB" className="bg-sky-tint ring-1 ring-sky-line ring-inset" note="Grouping sections, secondary buttons, selected states." />
            <Swatch name="Coral" token="bg-coral" hex="#FF6F4D" className="bg-coral" note="Graphical accents only — too light for text." />
            <Swatch name="Coral deep" token="bg-coral-deep" hex="#C0451F" className="bg-coral-deep" note="Accent button, eyebrows, fares, focus ring." />
            <Swatch name="Coral tint" token="bg-coral-tint" hex="#FFF1EC" className="bg-coral-tint ring-1 ring-coral-line ring-inset" note="Notes, featured chips." />
            <Swatch name="Amber" token="bg-amber" hex="#E9A233" className="bg-amber" note="Money." />
            <Swatch name="Mint" token="bg-mint" hex="#0E7F72" className="bg-mint" note="Confirmed." />
            <Swatch name="Indigo" token="bg-indigo" hex="#4552C0" className="bg-indigo" note="Waiting." />
            <Swatch name="Rose" token="bg-rose" hex="#BB3348" className="bg-rose" note="Attention, destructive, errors." />
            <Swatch name="Canvas" token="bg-canvas" hex="#F6F9FC" className="bg-canvas ring-1 ring-line ring-inset" note="Page background." />
            <Swatch name="Surface" token="bg-surface" hex="#FFFFFF" className="bg-surface ring-1 ring-line ring-inset" note="Cards, panels, inputs." />
            <Swatch name="Sunken" token="bg-sunk" hex="#F1F5FA" className="bg-sunk ring-1 ring-line ring-inset" note="Disabled fields, empty states, table headers." />
            <Swatch name="Line faint" token="border-line-faint" hex="#F0F4F9" className="bg-line-faint ring-1 ring-line ring-inset" note="Internal dividers." />
            <Swatch name="Line" token="border-line" hex="#E7EDF5" className="bg-line" note="Card and section borders." />
            <Swatch name="Line strong" token="border-line-strong" hex="#D7E1EC" className="bg-line-strong" note="Inputs and anything interactive." />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Panel>
              <Spec k="Section rule" v="Alternate canvas → white → sky tint. Never three of the same in a row." />
              <Spec k="Card" v="#FFFFFF, 1px #E7EDF5, clipped corner, lift-1" />
              <Spec k="Card on white" v="Keep the border, drop the shadow — handled automatically inside <Section tone=&quot;white&quot;>" />
              <Spec k="Contrast" v="Coral is for filled surfaces and graphical accents. Small coral text uses #C0451F only." />
            </Panel>
            <Panel>
              <Spec k="Lift 1 · resting" v="shadow-lift — 0 1px 2px rgba(10,58,102,.04), 0 6px 16px rgba(10,58,102,.05)" />
              <Spec k="Lift 2 · hover" v="shadow-lift-lg + a 2px rise. Cards rise; buttons never do." />
              <Spec k="Inset · inputs" v="shadow-lift-in — inset 0 1px 2px rgba(10,58,102,.05)" />
              <Spec k="Banned" v="Black shadows, blur beyond 30px, glow, glass blur, gradient borders" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 04 — RADIUS */}
      <Section tone="sky">
        <SectionWrap>
          <SectionHead
            eyebrow="04 — Radius language"
            title="The clipped corner"
            lede="Every surface carries one small corner, top-left, as though the document had been clipped and filed. Controls stay symmetrical so they read as controls."
          />
          <Card>
            <CardContent>
              <div className="flex flex-wrap gap-[18px]">
                {[
                  { cls: "rounded-surface h-[78px] w-[104px]", label: "Surface", v: "5 · 18 · 18 · 18", token: "rounded-surface" },
                  { cls: "rounded-surface-lg h-[78px] w-[104px]", label: "Large surface", v: "6 · 24 · 24 · 24", token: "rounded-surface-lg" },
                  { cls: "rounded-control h-[46px] w-[104px]", label: "Control", v: "8 all round", token: "rounded-control" },
                  { cls: "rounded-chip h-8 w-[86px]", label: "Chip / badge", v: "6 all round", token: "rounded-chip" },
                  { cls: "rounded-icon size-[78px]", label: "Icon chip", v: "12 all round", token: "rounded-icon" },
                  { cls: "rounded-full size-[78px]", label: "Avatar only", v: "Full circle", token: "rounded-full" },
                ].map((r) => (
                  <div key={r.label} className="text-center">
                    <div
                      className={`mb-2.5 border-[1.5px] border-ocean bg-[linear-gradient(150deg,var(--sky-tint),var(--surface))] ${r.cls}`}
                    />
                    <span className="block font-micro text-[9.5px] text-tx-faint">
                      {r.label}
                    </span>
                    <b className="mt-[3px] block text-[13px] font-semibold text-tx-head">
                      {r.v}
                    </b>
                    <span className="mt-0.5 block font-mono text-[10px] text-tx-faint">
                      {r.token}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Panel className="mt-5">
            <Spec k="Cards & panels" v="rounded-surface — 5px 18px 18px 18px" />
            <Spec k="Feature blocks" v="rounded-surface-lg — heroes, modals, dark bands" />
            <Spec k="Buttons & inputs" v="rounded-control — 8px uniform" />
            <Spec k="Badges & tags" v="rounded-chip — 6px, squared like a printed label. Never a pill." />
            <Spec k="Icon chips" v="rounded-icon — 12px uniform" />
            <Spec k="Banned" v="16px-on-everything · rounded-2xl · pill buttons · pill eyebrows" />
          </Panel>
        </SectionWrap>
      </Section>

      {/* 05 — SPACING */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="05 — Spacing"
            title="A 4px grid, applied without exception"
            lede="Space between groups is always larger than space inside a group."
          />
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                {[4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96, 128].map((n) => (
                  <div key={n} className="text-center">
                    <div
                      className="mb-2 rounded-chip bg-ocean/12"
                      style={{ width: n, height: n }}
                    />
                    <span className="block font-mono text-[10px] text-tx-faint">
                      {n}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Panel>
              <Spec k="Section" v="96px vertical desktop · 72px tablet · 56px mobile" />
              <Spec k="Container" v="1160px max · 40px gutters desktop · 24px mobile" />
              <Spec k="Grid gap" v="20px cards · 24px on wide layouts · 12px inside a card" />
              <Spec k="Card padding" v="26px 28px desktop · 20px 22px mobile" />
            </Panel>
            <Panel>
              <Spec k="Eyebrow → H2" v="12px" />
              <Spec k="H2 → lede" v="14px" />
              <Spec k="Head → content" v="32px" />
              <Spec k="Label → input" v="8px" />
              <Spec k="Field → field" v="22px — <FieldGroup> applies it" />
              <Spec k="Input → error" v="8px" />
              <Spec k="Button row gap" v="12px" />
              <Spec k="Icon → label" v="9px in buttons · 13px in nav" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 06 — ICONS */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="06 — Icons"
            title="One family, one weight, always meaningful"
            lede="lucide-react exclusively, at 1.75 stroke, set globally in globals.css. No emoji, no filled icons, no second set."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sizes</CardTitle>
                <CardDescription>
                  16 inline · 18 buttons · 20 nav &amp; chips · 24 page headers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-7">
                  {[16, 18, 20, 24].map((s) => (
                    <div key={s} className="text-center text-ocean">
                      <Plane style={{ width: s, height: s }} />
                      <span className="mt-2.5 block font-mono text-[10px] text-tx-faint">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-[13px] text-tx-muted">
                  Icons alone appear only in icon-buttons, always with an
                  aria-label.
                </span>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Icon chips carry meaning, not decoration</CardTitle>
                <CardDescription>42px · 12px radius · hue at 9–16%</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3.5">
                  <IconChip tone="ocean" title="Bookings">
                    <Plane />
                  </IconChip>
                  <IconChip tone="amber" title="Revenue">
                    <CircleDollarSign />
                  </IconChip>
                  <IconChip tone="indigo" title="Pending">
                    <Clock />
                  </IconChip>
                  <IconChip tone="mint" title="Confirmed">
                    <Check />
                  </IconChip>
                  <IconChip tone="rose" title="Cancelled">
                    <X />
                  </IconChip>
                  <IconChip tone="coral" title="Featured">
                    <Star />
                  </IconChip>
                  <IconChip tone="neutral" title="Reports">
                    <BarChart3 />
                  </IconChip>
                </div>
                <p className="mt-[22px] text-[14.5px] leading-[1.6] text-tx-muted">
                  Ocean for volume · amber for money · indigo for waiting · mint
                  for confirmed · rose for attention · coral for featured.
                </p>
              </CardContent>
            </Card>
          </div>
        </SectionWrap>
      </Section>

      {/* 07 — BUTTONS */}
      <Section tone="sky">
        <SectionWrap>
          <SectionHead
            eyebrow="07 — Buttons"
            title="Four variants. One accent per view."
            lede="Ocean is the everyday action. Coral appears once — on the single thing you most want pressed. Hover deepens the fill; buttons never rise."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent>
                <Row label="Variants">
                  <Button>
                    <Search />
                    Search flights
                  </Button>
                  <Button variant="accent">Get a quote</Button>
                  <Button variant="secondary">View details</Button>
                  <Button variant="ghost">Cancel</Button>
                </Row>
                <Row label="Sizes · 38 / 46 / 54">
                  <Button size="sm">Small · 38</Button>
                  <Button>Default · 46</Button>
                  <Button size="lg">Large · 54</Button>
                </Row>
                <Row label="With icons · 18px, 9px gap">
                  <Button variant="secondary">
                    <Download />
                    Export
                  </Button>
                  <Button variant="accent">
                    <Send />
                    Send quote
                  </Button>
                  <Button variant="ghost">
                    Continue
                    <ArrowRight />
                  </Button>
                </Row>
                <Row label="Icon-only · aria-label required">
                  <Button size="icon" aria-label="Add order">
                    <Plus />
                  </Button>
                  <Button size="icon-sm" variant="secondary" aria-label="Copy reference">
                    <Copy />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Dismiss">
                    <X />
                  </Button>
                </Row>
                <Row label="Destructive · link">
                  <Button variant="destructive">
                    <Trash2 />
                    Delete order
                  </Button>
                  <Button variant="link">View the fare rules</Button>
                </Row>
                <Row label="Disabled · opacity .42">
                  <Button disabled>Primary</Button>
                  <Button variant="accent" disabled>
                    Accent
                  </Button>
                  <Button variant="secondary" disabled>
                    Secondary
                  </Button>
                  <Button variant="ghost" disabled>
                    Ghost
                  </Button>
                </Row>
                <Row label="Hover · focus · active">
                  <span className="text-[14.5px] leading-[1.6] text-tx-muted">
                    Hover any button above to see the fill and shadow deepen. Tab
                    to it for the 2px coral ring at 3px offset. Press for the 1px
                    nudge down.
                  </span>
                </Row>
              </CardContent>
            </Card>
            <Panel>
              <Spec k="Type" v="Hanken Grotesk 600 · 15px · −0.002em — never uppercase, never letterspaced" />
              <Spec k="Height" v="38 small · 46 default · 54 large. Padding 16 / 22 / 28." />
              <Spec k="Radius" v="rounded-control — 8px uniform" />
              <Spec k="Primary" v="bg-ocean, white text, shadow-btn-ocean" />
              <Spec k="Accent" v="bg-coral-deep, white text — one per view, maximum" />
              <Spec k="Secondary" v="White, ocean-deep text, 1px line-strong border" />
              <Spec k="Ghost" v="Transparent, ocean text, sky-tint on hover" />
              <Spec k="Hover" v="Darken one step + deepen shadow. No lift on buttons — only cards rise." />
              <Spec k="Active" v="translate-y-px" />
              <Spec k="Focus" v="2px coral-deep outline, 3px offset" />
              <Spec k="Icon" v="18px, 1.75 stroke, 9px gap, leading side" />
              <Spec k="Disabled" v="opacity .42, pointer-events none, no shadow" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 08 — FORM FIELDS */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="08 — Form fields"
            title="The part people actually use"
            lede="Sentence-case labels above the field, generous height, a border visible at rest, and errors that say what to do next."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent>
                <FieldGroup>
                  <Field label="Leaving from" required htmlFor="sg-from">
                    <Input
                      id="sg-from"
                      defaultValue="London Heathrow (LHR)"
                      leadingIcon={<MapPin />}
                    />
                  </Field>

                  <Field
                    label="Going to"
                    required
                    htmlFor="sg-to"
                    hint="Type three letters and we'll find the airport."
                  >
                    <Input id="sg-to" placeholder="City or airport" />
                  </Field>

                  <Field
                    label="Travel date"
                    required
                    htmlFor="sg-date"
                    error="Add a date so we can check the fare."
                  >
                    <Input
                      id="sg-date"
                      placeholder="dd / mm / yyyy"
                      aria-invalid
                    />
                  </Field>

                  <Field label="Cabin" htmlFor="sg-cabin">
                    <NativeSelect id="sg-cabin" defaultValue="economy">
                      <option value="economy">Economy</option>
                      <option value="premium">Premium economy</option>
                      <option value="business">Business</option>
                    </NativeSelect>
                  </Field>

                  <Field label="Assigned agent" htmlFor="sg-agent">
                    <Select defaultValue="priya">
                      <SelectTrigger id="sg-agent" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priya">Priya Sharma</SelectItem>
                        <SelectItem value="aisha">Aisha Khan</SelectItem>
                        <SelectItem value="omar">Omar Farouk</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Anything we should know?" htmlFor="sg-notes">
                    <Textarea
                      id="sg-notes"
                      placeholder="Wheelchair, meal preference, seats together…"
                    />
                  </Field>

                  <Field label="Trip type" required>
                    <div className="grid gap-2.5">
                      <ChoiceCard
                        type="radio"
                        name="sg-trip"
                        defaultChecked
                        title="Direct flight"
                        description="No changes along the way"
                      />
                      <ChoiceCard
                        type="radio"
                        name="sg-trip"
                        title="Connecting flight"
                        description="Usually cheaper, one or more stops"
                      />
                    </div>
                  </Field>

                  <Field label="Extras">
                    <div className="grid gap-2.5">
                      <ChoiceCard
                        defaultChecked
                        title="Hold the fare for 24 hours"
                        description="Free — we'll confirm before anything is charged"
                      />
                      <ChoiceCard
                        title="Seats together"
                        description="Where the airline allows it"
                      />
                      <ChoiceCard
                        disabled
                        title="Lounge access"
                        description="Not available on this fare"
                      />
                    </div>
                  </Field>

                  <Field label="Passport number" htmlFor="sg-passport">
                    <Input
                      id="sg-passport"
                      defaultValue="Confirmed after booking"
                      disabled
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
            <Panel>
              <Spec k="Label" v="600 · 13.5px · #0A3A66 · sentence case. Required marked with a coral asterisk." />
              <Spec k="Hint" v="13px · #6B7C8E · between label and field, 8px each side" />
              <Spec k="Field" v="48px tall · 15px padding · 15.5px text · rounded-control" />
              <Spec k="Border" v="1px line-strong at rest — always visible, never borderless" />
              <Spec k="Inner shadow" v="shadow-lift-in — the field reads as a container" />
              <Spec k="Placeholder" v="#98A6B5 — an example, never a replacement for the label" />
              <Spec k="Hover" v="Border → line-hover (#C3D2E1)" />
              <Spec k="Focus" v="Border → ocean, plus a 3px ocean ring at 12%" />
              <Spec k="Error" v="aria-invalid → rose border, 3px rose ring, message with a 15px icon 8px below" />
              <Spec k="Disabled" v="sunk fill, faint text, no shadow, not-allowed cursor" />
              <Spec k="Leading icon" v="18px at 14px from the left, field padding becomes 42px" />
              <Spec k="Textarea" v="Min 96px, 13px vertical padding, resize vertical only" />
              <Spec k="Choice" v="Full-width tappable card, selected = ocean border + sky fill + 1px ring" />
              <Spec k="Error copy" v={'Says what to do: "Add a date so we can check the fare." Not "Invalid input".'} />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 09 — BADGES */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="09 — Badges"
            title="Squared, not pills"
            lede="6px radius, 12.5px at 600, 1px border in a darker tint of the same hue. A 6px dot only where a live state matters."
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent>
                <Row label="Tinted variants">
                  <Badge variant="mint">Confirmed</Badge>
                  <Badge variant="sky">New</Badge>
                  <Badge variant="amber">In progress</Badge>
                  <Badge variant="indigo">Awaiting reply</Badge>
                  <Badge variant="rose">Cancelled</Badge>
                  <Badge variant="coral">Featured</Badge>
                </Row>
                <Row label="With a live-state dot">
                  <Badge variant="mint" dot>
                    Confirmed
                  </Badge>
                  <Badge variant="amber" dot>
                    In progress
                  </Badge>
                  <Badge variant="rose" dot>
                    Cancelled
                  </Badge>
                </Row>
                <Row label="Neutral · outline · solid">
                  <Badge variant="neutral">Draft</Badge>
                  <Badge variant="outline">Archived</Badge>
                  <Badge variant="solid">12</Badge>
                </Row>
                <Row label="With an icon">
                  <Badge variant="mint">
                    <Check />
                    Ticketed
                  </Badge>
                  <Badge variant="indigo">
                    <Clock />
                    Awaiting customer
                  </Badge>
                </Row>
              </CardContent>
            </Card>
            <Panel>
              <Spec k="Radius" v="rounded-chip — 6px. Never a pill." />
              <Spec k="Type" v="12.5px · 600 · −0.002em" />
              <Spec k="Padding" v="5px 11px · 7px gap" />
              <Spec k="Border" v="1px in a darker tint of the same hue" />
              <Spec k="Dot" v="6px circle in currentColor — live states only" />
              <Spec k="Meaning" v="mint confirmed · sky new · amber in progress · indigo waiting · rose attention · coral featured" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 10 — SURFACES */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="10 — Cards, panels, sections"
            title="Built from the same parts"
            lede="Cards rise 2px on hover where they are interactive. A card on a white section keeps its border and drops its shadow — compare this section with the one above."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Card · default</CardTitle>
                <CardDescription>
                  White, 1px line, clipped corner, lift-1. 26/28 padding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[14.5px] leading-[1.6] text-tx-muted">
                  Header, content and footer share one padding token so nothing
                  drifts off the grid.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="secondary">
                  View details
                </Button>
              </CardFooter>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Card · sm</CardTitle>
                <CardDescription>
                  Portal density — 20px padding, tighter rhythm.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3.5">
                  <IconChip tone="amber">
                    <CircleDollarSign />
                  </IconChip>
                  <div>
                    <div className="font-micro text-tx-faint">Revenue today</div>
                    <div className="tabular text-[30px] leading-[1.14] font-bold tracking-[-0.022em] text-tx-head">
                      £6,420
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-[box-shadow,transform] duration-200 ease-brand hover:-translate-y-0.5 hover:shadow-lift-lg">
              <CardHeader>
                <CardTitle>Card · interactive</CardTitle>
                <CardDescription>
                  Hover me: lift-2 and a 2px rise. Only cards rise.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3.5">
                  <span className="font-mono text-[25px] font-medium tracking-[0.01em] text-tx-head">
                    LHR
                  </span>
                  <Plane className="size-[17px] text-coral" />
                  <span className="font-mono text-[25px] font-medium tracking-[0.01em] text-tx-head">
                    HYD
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Panel className="mt-5 overflow-hidden">
            <div className="border-b border-line bg-sunk px-[22px] py-3.5">
              <span className="font-micro text-tx-faint">
                Panel · table header on the sunken surface
              </span>
            </div>
            <div className="divide-y divide-line-faint">
              {[
                { ref: "WT-7343490", route: "LHR → HYD", fare: "£512", badge: "mint" as const, state: "Confirmed" },
                { ref: "WT-7343491", route: "LHR → DXB", fare: "£389", badge: "amber" as const, state: "In progress" },
                { ref: "WT-7343492", route: "LHR → ISB", fare: "£604", badge: "indigo" as const, state: "Awaiting reply" },
              ].map((r) => (
                <div
                  key={r.ref}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-[22px] py-3.5"
                >
                  <span className="font-mono text-[13px] text-tx-muted">
                    {r.ref}
                  </span>
                  <span className="flex-1 text-[14.5px] text-tx-body">
                    {r.route}
                  </span>
                  <span className="tabular text-[15px] font-semibold text-tx-head">
                    {r.fare}
                  </span>
                  <Badge variant={r.badge}>{r.state}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        </SectionWrap>
      </Section>

      {/* CARD-ON-WHITE PROOF */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="11 — The rule, proved"
            title="Same card, white section"
            lede="Identical markup to the cards above. The shadow is gone; the border stays."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>No shadow here</CardTitle>
                <CardDescription>
                  Because it sits inside a white section.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Border stays</CardTitle>
                <CardDescription>
                  Borders do the structural work; shadow only lifts what
                  genuinely floats.
                </CardDescription>
              </CardHeader>
            </Card>
            <Panel className="p-[26px]">
              <div className="font-micro text-tx-faint">Panel</div>
              <p className="mt-2.5 text-[14.5px] leading-[1.6] text-tx-muted">
                The same rule applies to panels.
              </p>
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      <footer className="bg-[linear-gradient(165deg,var(--ocean-deep),var(--ocean-night))] py-11 text-[14px] leading-[1.7] text-tx-invert-3">
        <SectionWrap>
          <b className="font-semibold text-tx-invert">
            Wicket Travel — Design System, locked
          </b>
          <p className="mt-2.5">
            Hanken Grotesk 400–700 · Newsreader italic · IBM Plex Mono 500 ·
            Lucide 1.75px
            <br />
            Ocean #0F4C81 · Coral #C0451F · Amber #E9A233 · Mint #0E7F72 ·
            Indigo #4552C0 · Rose #BB3348
            <br />
            Radius 5·18·18·18 surfaces · 8 controls · 6 chips · 12 icon chips
          </p>
        </SectionWrap>
      </footer>
    </main>
  );
}
