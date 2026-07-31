"use client";

import * as React from "react";
import {
  ArrowRight,
  CircleDollarSign,
  Clock,
  Download,
  MessageCircle,
  Plane,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
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
import { NativeSelect } from "@/components/ui/select";
import { Panel, Section, SectionHead, SectionWrap } from "@/components/ui/section";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/admin/stat-card";

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
  contrast,
}: {
  name: string;
  token: string;
  hex: string;
  className: string;
  note?: string;
  contrast?: string;
}) {
  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface shadow-lift">
      <div className={`relative h-[78px] ${className}`}>
        <span className="absolute bottom-3 left-3.5 rounded-chip bg-surface px-2 py-1 font-mono text-[10.5px] tracking-[0.07em] text-tx-head">
          {hex}
        </span>
      </div>
      <div className="px-[17px] py-[15px]">
        <b className="block text-[14.5px] font-semibold text-tx-head">{name}</b>
        <span className="mt-1 block font-mono text-[10px] tracking-[0.06em] text-tx-muted">
          {token}
        </span>
        {note ? (
          <small className="mt-1.5 block text-[13.5px] leading-[1.55] text-tx-muted">
            {note}
          </small>
        ) : null}
        {contrast ? (
          <span className="mt-2.5 inline-block rounded-chip bg-sky-tint px-2 py-1 font-mono text-[10px] tracking-[0.06em] text-ocean">
            {contrast}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The FAIL / PASS columns of the ship checklist. */
function Checklist({
  tone,
  tag,
  title,
  items,
}: {
  tone: "fail" | "pass";
  tag: string;
  title: string;
  items: React.ReactNode[];
}) {
  return (
    <Panel className="p-[26px]">
      <h3 className="mb-[15px] flex items-center gap-[9px] text-[15px] font-bold text-tx-head">
        <span
          className={`rounded-chip px-[9px] py-1 font-mono text-[9.5px] tracking-[0.1em] ${
            tone === "fail"
              ? "bg-ruby-tint text-ruby"
              : "bg-jade-tint text-jade"
          }`}
        >
          {tag}
        </span>
        {title}
      </h3>
      <ul className="list-disc space-y-[9px] pl-[18px]">
        {items.map((item, i) => (
          <li key={i} className="text-[14.5px] leading-[1.6] text-tx-muted">
            {item}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ── the guide ────────────────────────────────────────────────────── */

export function StyleGuide() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* MASTHEAD — a solid ocean-ink band. No gradient. */}
      <header className="bg-ocean-ink py-16">
        <SectionWrap>
          <span className="font-micro text-flame-vivid">
            Wicket Travel · Design System · v2
          </span>
          <h1 className="mt-4 max-w-[20ch] text-[clamp(30px,4.6vw,42px)] leading-[1.14] font-bold tracking-[-0.02em] text-tx-invert">
            Solid, compact, and the orange you can actually see.
          </h1>
          <p className="mt-[18px] max-w-[56ch] text-[17px] leading-[1.65] text-tx-invert-2">
            v1 shipped three mistakes: gradients, an asymmetric corner, and an
            accent so muted it vanished. All three are corrected here. This
            version replaces v1 entirely.
          </p>
          <div className="mt-9 flex flex-wrap gap-x-11 gap-y-4 border-t border-tx-invert/15 pt-[22px] text-[13.5px] text-tx-invert-3">
            <div>
              Type
              <b className="mt-[3px] block text-[15px] font-semibold text-tx-invert">
                Hanken Grotesk · IBM Plex Mono
              </b>
            </div>
            <div>
              Primary action
              <b className="mt-[3px] block text-[15px] font-semibold text-tx-invert">
                Flame #D24417
              </b>
            </div>
            <div>
              Discipline
              <b className="mt-[3px] block text-[15px] font-semibold text-tx-invert">
                Flat fills, one radius per element
              </b>
            </div>
          </div>
        </SectionWrap>
      </header>

      {/* 01 — CORRECTIONS */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="01 — Corrections"
            title="What was wrong, and what replaces it"
            lede="These are not preferences. They are defects in v1 that made finished screens look cheap."
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Panel className="overflow-hidden">
              <div className="bg-ruby-tint px-[18px] py-[11px] font-mono text-[10px] tracking-[0.1em] text-ruby uppercase">
                Remove — v1
              </div>
              <ul className="list-disc space-y-2.5 py-[22px] pr-6 pl-10 text-[14.5px] leading-[1.6] text-tx-muted">
                <li>
                  <b className="font-semibold text-tx-body">Gradient sidebar</b> —
                  a colour fading into another colour reads as a template.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">Gradient stat cards</b>{" "}
                  — tint fading to white made every card look washed.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">
                    The clipped corner (5/18/18/18)
                  </b>{" "}
                  — intended as a signature, reads as a rendering glitch.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">Accent #C0451F</b> —
                  brown, muted, and invisible on screen.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">
                    46px buttons at 22px padding
                  </b>{" "}
                  — wide and heavy.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">Visible scrollbars</b>{" "}
                  inside the sidebar and panels.
                </li>
              </ul>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="bg-jade-tint px-[18px] py-[11px] font-mono text-[10px] tracking-[0.1em] text-jade uppercase">
                Adopt — v2
              </div>
              <ul className="list-disc space-y-2.5 py-[22px] pr-6 pl-10 text-[14.5px] leading-[1.6] text-tx-muted">
                <li>
                  <b className="font-semibold text-tx-body">Solid fills only.</b>{" "}
                  No gradient anywhere in the product, ever.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">Solid tint cards</b>{" "}
                  with a matching 1px border — flat, crisp, confident.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">
                    One radius per element type
                  </b>{" "}
                  — 14 cards, 18 large, 10 controls, 11 icon chips, 7 badges.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">Flame #D24417</b> —
                  vivid, warm, and now the primary action colour.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">
                    42px buttons at 18px padding
                  </b>{" "}
                  — compact and purposeful.
                </li>
                <li>
                  <b className="font-semibold text-tx-body">
                    No scrollbar is ever visible
                  </b>{" "}
                  inside the app. Hard rule.
                </li>
              </ul>
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 02 — SCROLLING */}
      <Section tone="sky">
        <SectionWrap>
          <SectionHead
            eyebrow="02 — Scrolling"
            title="No scrollbar is ever visible"
            lede="A native scrollbar sitting inside the sidebar announces that the layout was never designed. Hard rule, no exception."
          />
          <Panel className="overflow-hidden">
            <Spec
              k="Page"
              v="The document scrolls as one. Do not create nested scroll containers for layout."
            />
            <Spec
              k="Sidebar"
              v="position:sticky, top 0, height 100dvh, overflow-y auto — with the scrollbar hidden. If the nav is long, it scrolls silently."
            />
            <Spec
              k="Enforcement"
              v={
                <>
                  <code className="font-mono text-[13px] text-ocean">
                    *:not(html):not(body)
                  </code>{" "}
                  in globals.css hides the bar on every element below the root,
                  so the browser&apos;s own page scrollbar is the only one left.
                  The <code className="font-mono text-[13px] text-ocean">no-bar</code>{" "}
                  utility states the same intent at a call site.
                </>
              }
            />
            <Spec
              k="Tables"
              v="Never scroll horizontally on mobile. <DataTable> renders <MobileRecordCard>s below md instead."
            />
            <Spec
              k="Modals & chat"
              v="Scroll silently. No visible track, no arrows, no inset shadow at the edges."
            />
            <Spec
              k="Banned"
              v="Native scrollbars, custom styled scrollbars, scroll arrows, “scroll for more” cues, nested scroll inside a card"
            />
          </Panel>
          <div className="mt-[22px] rounded-surface border border-flame-line bg-flame-tint px-6 py-5 text-[14.5px] leading-[1.6] text-tx-body">
            <b className="font-semibold text-flame">Test for it:</b> open every
            screen at 1280px and at 375px. If a track or thumb appears anywhere
            other than the browser&apos;s own page scrollbar, it is a bug — not a
            styling choice.
          </div>
        </SectionWrap>
      </Section>

      {/* 03 — COLOUR */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="03 — Colour"
            title="Blue builds the room. Orange does the work."
            lede="Flame is the primary action colour — every main button, every active nav icon — so the brand is visible on every screen while blue holds the structure."
          />
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            <Swatch
              name="Ocean"
              token="bg-ocean"
              hex="#0F4C81"
              className="bg-ocean"
              note="Sidebar, headings, links, structure. Solid — never a gradient."
              contrast="8.9:1 on white ✓ AAA"
            />
            <Swatch
              name="Ocean ink"
              token="bg-ocean-ink"
              hex="#0A3355"
              className="bg-ocean-ink"
              note="Statement bands, footers, code surfaces, heading colour."
              contrast="13.1:1 on white ✓ AAA"
            />
            <Swatch
              name="Flame"
              token="bg-flame"
              hex="#D24417"
              className="bg-flame"
              note="Primary action. Buttons, active nav icons, eyebrows, key numbers."
              contrast="4.6:1 on white ✓ AA"
            />
            <Swatch
              name="Flame vivid"
              token="bg-flame-vivid"
              hex="#F2622A"
              className="bg-flame-vivid"
              note="Icons and graphics only, where small-text contrast doesn’t apply."
              contrast="Graphics only"
            />
            <Swatch
              name="Sky tint"
              token="bg-sky-tint"
              hex="#EDF4FB"
              className="bg-sky-tint ring-1 ring-sky-line ring-inset"
              note="Tint sections, ocean stat cards, hover states. Border #D3E4F4."
            />
            <Swatch
              name="Canvas"
              token="bg-canvas"
              hex="#F5F8FC"
              className="bg-canvas ring-1 ring-line ring-inset"
              note="Page background. Surface #FFFFFF · sunk #F0F4F9 · line #E5EBF3."
            />
          </div>

          <div className="mt-[18px] grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            <Swatch
              name="Gold — money"
              token="bg-gold"
              hex="#C97A0C"
              className="bg-gold"
              note="Revenue, commission, fares."
              contrast="4.8:1 ✓ AA"
            />
            <Swatch
              name="Violet — waiting"
              token="bg-violet"
              hex="#4A4FBF"
              className="bg-violet"
              note="Pending, queued, awaiting reply."
              contrast="6.5:1 ✓ AA"
            />
            <Swatch
              name="Jade — live"
              token="bg-jade"
              hex="#0C7A6B"
              className="bg-jade"
              note="Confirmed, online, completed."
              contrast="5.1:1 ✓ AA"
            />
            <Swatch
              name="Ruby — attention"
              token="bg-ruby"
              hex="#B32F44"
              className="bg-ruby"
              note="Cancelled, failed, overdue."
              contrast="6.1:1 ✓ AA"
            />
          </div>

          <div className="mt-[22px] rounded-surface border border-flame-line bg-flame-tint px-6 py-5 text-[14.5px] leading-[1.6] text-tx-body">
            <b className="font-semibold text-flame">Fill rule:</b> every
            background in the product is a single flat colour. No
            linear-gradient, no radial-gradient, no colour fading to white, no
            tinted overlays. If a surface needs separation, it gets a 1px border
            — not a gradient.
          </div>
        </SectionWrap>
      </Section>

      {/* 04 — RADIUS */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="04 — Radius"
            title="Consistent, and slightly ours"
            lede="The clipped corner is gone. Distinctiveness comes from the colour discipline and the mono codes — not from a corner that looks broken."
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Panel className="overflow-hidden">
              <Spec k="14px" v="rounded-surface — cards, panels, stat cards, table containers, images" />
              <Spec k="18px" v="rounded-surface-lg — modals, the sidebar, hero panels, auth panels" />
              <Spec k="10px" v="rounded-control — buttons, inputs, selects, nav items" />
              <Spec k="11px" v="rounded-icon — icon chips and the monogram badge" />
              <Spec k="7px" v="rounded-chip — badges and tags. Squared, never a pill." />
              <Spec k="Circle" v="rounded-full — avatars and status dots only" />
              <Spec k="Banned" v="Asymmetric radii · 16px on everything · pill buttons · pill eyebrows" />
            </Panel>
            <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "surface", cls: "rounded-surface", px: "14" },
                { label: "surface-lg", cls: "rounded-surface-lg", px: "18" },
                { label: "control", cls: "rounded-control", px: "10" },
                { label: "icon", cls: "rounded-icon", px: "11" },
                { label: "chip", cls: "rounded-chip", px: "7" },
                { label: "full", cls: "rounded-full", px: "•" },
              ].map((r) => (
                <div key={r.label} className="text-center">
                  <div
                    className={`mb-2.5 flex h-[78px] items-center justify-center border border-ocean bg-sky-tint text-[15px] font-bold text-ocean ${r.cls}`}
                  >
                    {r.px}
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.06em] text-tx-muted">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionWrap>
      </Section>

      {/* 05 — TYPE & SPACING */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="05 — Type & spacing"
            title="Two faces, one scale"
            lede="Hanken Grotesk carried v1 well — the problem was never the type. Newsreader is retired from the portal."
          />
          <Panel className="mb-[18px] px-[26px] py-1.5">
            <Row label="H1 · page">
              <span className="text-[30px] leading-[1.16] font-bold tracking-[-0.018em] text-tx-head">
                Orders that read at a glance
              </span>
            </Row>
            <Row label="H2 · section">
              <span className="text-2xl leading-[1.25] font-bold tracking-[-0.014em] text-tx-head">
                Blue builds the room
              </span>
            </Row>
            <Row label="H3 · card">
              <span className="text-[16.5px] leading-[1.42] font-semibold text-tx-head">
                Commission this month
              </span>
            </Row>
            <Row label="Body 16/27">
              <span className="max-w-[52ch] text-base leading-[1.68] text-tx-body">
                Every fare, every message and every document for a customer, on
                one screen.
              </span>
            </Row>
            <Row label="Small 14.5/23">
              <span className="text-[14.5px] leading-[1.6] text-tx-muted">
                Last updated eleven minutes ago
              </span>
            </Row>
            <Row label="Metric 29 · tabular">
              <span className="tabular text-[29px] leading-[1.15] font-bold tracking-[-0.022em] text-tx-head">
                £24,180
              </span>
            </Row>
            <Row label="Micro-label">
              <span className="font-micro text-flame">Open orders</span>
            </Row>
            <Row label="Mono code">
              <span className="font-mono text-[15px] tracking-[0.02em] text-tx-head">
                LHR → DXB · #7343490
              </span>
            </Row>
          </Panel>

          <div className="grid gap-[18px] md:grid-cols-2">
            <Panel className="overflow-hidden">
              <Spec k="Face" v="Hanken Grotesk 400 / 500 / 600 / 700 · IBM Plex Mono 500 for codes and micro-labels" />
              <Spec k="H1 page" v="700 · 30/35 · −.018em · #0C3355" />
              <Spec k="H2 section" v="700 · 24/30 · −.014em" />
              <Spec k="Body" v="400 · 16/27 · #3A4A5C" />
              <Spec k="Small" v="400 · 14.5/23 · #6D7D8F" />
              <Spec k="Metric" v="700 · 29/33 · tabular numerals" />
              <Spec k="Micro-label" v="Plex Mono 500 · 10–11px · .1em · uppercase" />
            </Panel>
            <Panel className="overflow-hidden">
              <Spec k="Scale" v="4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72" />
              <Spec k="Portal section" v="40px between blocks · 28px page top padding" />
              <Spec k="Card padding" v="20–24px desktop · 18px mobile" />
              <Spec k="Grid gap" v="18px" />
              <Spec k="Eyebrow → H1" v="10px · H1 → lede 12px · header → content 28px" />
              <Spec k="Label → input" v="7px · field → field 20px" />
              <Spec k="Table cell" v="13px vertical · 18px horizontal · header row #F0F4F9" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 06 — STAT CARDS + ICON CHIPS */}
      <Section tone="sky">
        <SectionWrap>
          <SectionHead
            eyebrow="06 — Stat cards"
            title="Flat tint, matching border, one anatomy"
            lede="Solid tint background with a 1px border in the same family. No gradient, no shadow — these sit in the page, they don’t float above it."
          />
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              tone="violet"
              label="Open orders"
              value="9"
              icon={Clock}
              hint="New and in progress"
            />
            <StatCard
              tone="gold"
              label="Commission"
              value="£300"
              icon={CircleDollarSign}
              hint="From completed orders"
            />
            <StatCard
              tone="ocean"
              label="Conversations"
              value="12"
              icon={MessageCircle}
              hint="Total threads"
            />
            <StatCard
              tone="jade"
              label="Employees"
              value="2"
              icon={Users}
              hint="Active team members"
            />
          </div>

          <Panel className="mt-[18px] overflow-hidden">
            <Spec k="Background" v="Flat tint of the metric’s hue. Border 1px in the same family, one step darker." />
            <Spec k="Shadow" v="None. The border does the work." />
            <Spec k="Order" v="Icon chip 40px → Plex Mono label → 29px 700 tabular number → 13.5px caption" />
            <Spec k="Padding" v="20px 22px · radius 14px · grid gap 18px" />
            <Spec k="Hue by meaning" v="Ocean volume · gold money · violet waiting · jade live · ruby attention. Fixed on every screen." />
            <Spec k="Never" v="Two numbers in one card · a gradient · a sparkline with a fill · a different padding from its neighbour" />
          </Panel>

          <h3 className="mt-10 mb-4 text-[16.5px] font-semibold text-tx-head">
            Icon chips — 40px, 11px radius, flat fill, 19px Lucide at 1.75
          </h3>
          <div className="flex flex-wrap gap-3">
            <IconChip tone="ocean" title="Volume">
              <Plane />
            </IconChip>
            <IconChip tone="gold" title="Money">
              <CircleDollarSign />
            </IconChip>
            <IconChip tone="violet" title="Waiting">
              <Clock />
            </IconChip>
            <IconChip tone="jade" title="Confirmed">
              <Users />
            </IconChip>
            <IconChip tone="ruby" title="Attention">
              <X />
            </IconChip>
            <IconChip tone="flame" title="Featured">
              <Send />
            </IconChip>
            <IconChip tone="neutral" title="Neutral">
              <Search />
            </IconChip>
          </div>
        </SectionWrap>
      </Section>

      {/* 07 — BUTTONS */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="07 — Buttons"
            title="Compact, and flame leads"
            lede="42px with 18px padding — enough presence, no bulk. The main action on a screen is flame; ocean is the strong secondary."
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Card>
              <CardContent className="space-y-[18px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button>
                    <Plus />
                    New order
                  </Button>
                  <Button variant="ocean">View all orders</Button>
                  <Button variant="secondary">
                    <Download />
                    Export CSV
                  </Button>
                  <Button variant="ghost">Cancel</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button size="sm">Small · 36</Button>
                  <Button>Default · 42</Button>
                  <Button size="lg">Large · 48</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button variant="destructive">
                    <Trash2 />
                    Delete
                  </Button>
                  <Button disabled>Disabled</Button>
                  <span className="text-[14.5px] text-tx-muted">
                    Focus: 2px flame ring, 2px offset
                  </span>
                </div>
              </CardContent>
            </Card>
            <Panel className="overflow-hidden">
              <Spec k="Height" v="36 small · 42 default · 48 large" />
              <Spec k="Padding" v="14 / 18 / 22px horizontal. Buttons never stretch to fill a container." />
              <Spec k="Type" v="600 · 15px · no uppercase, no letterspacing" />
              <Spec k="Radius" v="10px" />
              <Spec k="Primary" v="Flame #D24417, white text — the main action, one per view" />
              <Spec k="Ocean" v="Strong secondary — navigation-style actions" />
              <Spec k="Secondary" v="White, 1px #D3DCE7, ocean hover" />
              <Spec k="Icon" v="17px at 1.75 stroke, 8px gap, leading side" />
              <Spec k="Hover" v="Darken one step only. No lift, no shadow — buttons carry none." />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 08 — FORM FIELDS */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="08 — Form fields"
            title="The part people actually use"
            lede="46px tall, 14px padding, a border that is always visible at rest, and error copy that says what to do next."
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Card>
              <CardContent>
                <FieldGroup>
                  <Field label="Passenger name" htmlFor="sg-name" required>
                    <Input id="sg-name" placeholder="As printed on the passport" />
                  </Field>
                  <Field
                    label="Route"
                    htmlFor="sg-route"
                    hint="Airport codes, or the city if you’re not sure."
                  >
                    <Input
                      id="sg-route"
                      leadingIcon={<Search />}
                      placeholder="LHR → DXB"
                    />
                  </Field>
                  <Field label="Cabin" htmlFor="sg-cabin">
                    <NativeSelect id="sg-cabin" defaultValue="economy">
                      <option value="economy">Economy</option>
                      <option value="premium">Premium economy</option>
                      <option value="business">Business</option>
                    </NativeSelect>
                  </Field>
                  <Field
                    label="Travel date"
                    htmlFor="sg-date"
                    error="Add a date so we can check the fare."
                  >
                    <Input id="sg-date" aria-invalid placeholder="dd / mm / yyyy" />
                  </Field>
                  <Field label="Notes" htmlFor="sg-notes">
                    <Textarea id="sg-notes" placeholder="Anything the airline should know" />
                  </Field>
                  <Field label="Fare type">
                    <div className="space-y-2.5">
                      <ChoiceCard
                        type="radio"
                        name="sg-fare"
                        defaultChecked
                        title="Direct flight"
                        description="One leg, no connection."
                      />
                      <ChoiceCard
                        type="radio"
                        name="sg-fare"
                        title="Connecting flight"
                        description="Usually cheaper, always longer."
                      />
                    </div>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
            <Panel className="overflow-hidden">
              <Spec k="Height" v="46px form · 36px compact (filter bars only). Two heights, and only two." />
              <Spec k="Padding" v="14px horizontal · textarea 13px vertical" />
              <Spec k="Text" v="15.5px / 400 / #3A4A5C — held at 16px below 640px so iOS doesn’t zoom" />
              <Spec k="Radius" v="10px" />
              <Spec k="Border" v="1px #D3DCE7 at rest — always visible, never borderless" />
              <Spec k="Focus" v="Border → ocean, plus a 3px ocean ring at 13%" />
              <Spec k="Error" v="aria-invalid → ruby border + 3px ruby ring at 10%, message 7px below" />
              <Spec k="Label" v="600 · 13.5px · #0C3355 · sentence case. Required marked with a flame asterisk." />
              <Spec k="Rhythm" v="Label → input 7px · field → field 20px" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 09 — BADGES */}
      <Section tone="canvas">
        <SectionWrap>
          <SectionHead
            eyebrow="09 — Badges"
            title="Squared, not pills"
            lede="7px radius, 12.5px at 600, a 1px border a step darker than the fill. The hue is the meaning, on every screen."
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  <Badge variant="sky">New</Badge>
                  <Badge variant="gold" dot>
                    In progress
                  </Badge>
                  <Badge variant="jade">Completed</Badge>
                  <Badge variant="violet">Awaiting reply</Badge>
                  <Badge variant="ruby">Cancelled</Badge>
                  <Badge variant="flame">Featured</Badge>
                  <Badge variant="neutral">Draft</Badge>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="solid">12</Badge>
                </div>
              </CardContent>
            </Card>
            <Panel className="overflow-hidden">
              <Spec k="Radius" v="7px — squared like a printed label. Never a pill." />
              <Spec k="Type" v="12.5px · 600 · tracking −.002em" />
              <Spec k="Padding" v="5px 11px · 6px gap" />
              <Spec k="Border" v="1px in a darker tint of the same hue" />
              <Spec k="Dot" v="6px, in the badge’s own hue, only where a live state matters" />
              <Spec k="Meaning" v="sky new · gold in progress · violet awaiting · jade completed · ruby cancelled · flame featured" />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 10 — CARDS & SECTIONS */}
      <Section tone="sky">
        <SectionWrap>
          <SectionHead
            eyebrow="10 — Cards, panels, sections"
            title="Built from the same parts"
            lede="A card is white on a 1px line at 14px radius. A panel is the same surface without the scaffolding. A section changes by background, never by decoration."
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Order #7343490</CardTitle>
                <CardDescription>
                  London Heathrow → Dubai · 2 passengers
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[14.5px] leading-[1.68] text-tx-body">
                The card is the default surface: white, 1px #E5EBF3, 14px radius,
                lift-1. Padding is 24/22 on desktop and 18 on mobile.
              </CardContent>
              <CardFooter>
                <Badge variant="gold" dot>
                  In progress
                </Badge>
                <Button variant="secondary" size="sm" className="ml-auto">
                  Open
                  <ArrowRight />
                </Button>
              </CardFooter>
            </Card>
            <Panel className="overflow-hidden">
              <Spec k="Card" v="bg-surface · border-line · rounded-surface · shadow-lift" />
              <Spec k="Panel" v="The same surface, for tables and lists that manage their own padding" />
              <Spec k="Section" v="canvas → white → sky tint, alternating; an ocean-ink band once or twice per page" />
              <Spec k="White section" v="A card inside one keeps its border and drops its shadow" />
              <Spec k="Wrap" v="1160px max · 40px gutters desktop · 24px mobile" />
              <Spec k="Depth" v="lift-1 resting · lift-2 on hover (+2px rise). Cards rise; buttons never do." />
            </Panel>
          </div>
        </SectionWrap>
      </Section>

      {/* 11 — SHIP CHECKLIST */}
      <Section tone="white">
        <SectionWrap>
          <SectionHead
            eyebrow="11 — Ship checklist"
            title="Run every screen past this"
          />
          <div className="grid gap-[18px] md:grid-cols-2">
            <Checklist
              tone="fail"
              tag="FAIL"
              title="Reject the screen if"
              items={[
                <>
                  <b className="font-semibold text-tx-body">Any gradient appears</b>{" "}
                  — sidebar, card, button, panel or overlay.
                </>,
                <>
                  <b className="font-semibold text-tx-body">A scrollbar is visible</b>{" "}
                  anywhere except the browser’s own page scrollbar.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    An asymmetric or 16px-everywhere radius
                  </b>{" "}
                  is used.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    The screen has no flame on it
                  </b>{" "}
                  — the brand accent must appear at least once.
                </>,
                <>
                  <b className="font-semibold text-tx-body">Buttons stretch</b> to
                  fill their container outside an auth card.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    A stat card has a shadow
                  </b>{" "}
                  or a different padding from its neighbour.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    Status colours vary by screen
                  </b>{" "}
                  — money must be gold everywhere, pending violet everywhere.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    A table scrolls sideways
                  </b>{" "}
                  on mobile instead of stacking.
                </>,
              ]}
            />
            <Checklist
              tone="pass"
              tag="PASS"
              title="The screen is ready when"
              items={[
                <>
                  <b className="font-semibold text-tx-body">
                    Every fill is one flat colour
                  </b>
                  , and separation comes from 1px borders.
                </>,
                <>
                  <b className="font-semibold text-tx-body">Scrolling is silent</b>{" "}
                  at 1280px and 375px.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    Radii are 14 / 18 / 10 / 11 / 7
                  </b>{" "}
                  by element type, circles only for avatars.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    The primary action is flame
                  </b>{" "}
                  and there is exactly one per view.
                </>,
                <>
                  <b className="font-semibold text-tx-body">Every number</b> in a
                  metric, fare or column is tabular.
                </>,
                <>
                  <b className="font-semibold text-tx-body">
                    Icons are Lucide at 1.75
                  </b>
                  , in tinted chips that match the metric’s meaning.
                </>,
                <>
                  <b className="font-semibold text-tx-body">Type follows the scale</b>{" "}
                  and body sits at #3A4A5C, 1.68 line-height.
                </>,
                <>
                  <b className="font-semibold text-tx-body">Tables stack into cards</b>{" "}
                  below 768px with 44px tap targets.
                </>,
              ]}
            />
          </div>
        </SectionWrap>
      </Section>

      {/* FOOTER */}
      <footer className="bg-ocean-ink py-11 text-[14px] leading-[1.7] text-tx-invert-3">
        <SectionWrap>
          <b className="font-semibold text-tx-invert">
            Wicket Travel — Design System v2 · replaces v1
          </b>
          <p className="mt-2.5">
            Ocean #0F4C81 · Ocean ink #0A3355 ·{" "}
            <b className="font-semibold text-tx-invert">
              Flame #D24417 (primary action)
            </b>{" "}
            · Gold #C97A0C · Jade #0C7A6B · Violet #4A4FBF · Ruby #B32F44
            <br />
            Canvas #F5F8FC · Sky tint #EDF4FB · Lines #E5EBF3 / #D3DCE7 · Text
            #0C3355 / #3A4A5C / #6D7D8F / #96A4B4
            <br />
            Radius 14 cards · 18 large · 10 controls · 11 icon chips · 7 badges ·
            Hanken Grotesk + IBM Plex Mono · Lucide 1.75
            <br />
            <b className="font-semibold text-tx-invert">
              No gradients. No visible scrollbars. No asymmetric corners.
            </b>
          </p>
        </SectionWrap>
      </footer>
    </main>
  );
}
