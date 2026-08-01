#!/usr/bin/env node
/**
 * WCAG contrast audit for the design-system token layer.
 *
 * Parses `:root` and `.dark` out of app/globals.css, resolves `var()`
 * chains, and asserts every pair the product actually renders against the
 * threshold that pair owes:
 *
 *   4.5:1  normal text (WCAG 1.4.3 AA)
 *   3:1    large text, and non-text UI components and graphics (1.4.11)
 *
 * Run it after ANY token change:  node scripts/contrast-audit.mjs
 *
 * It exists because eyeballing this does not work. The first run of the v4
 * palette had ten failures in it, every one of which looked fine.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

/* ── parse ─────────────────────────────────────────────────────────── */

function block(selector) {
  // The token blocks are top-level `:root {` / `.dark {` declarations.
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  let depth = 0;
  let i = css.indexOf("{", start);
  const from = i + 1;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) break;
  }
  const body = css.slice(from, i);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const light = block(":root");
const dark = { ...light, ...block(".dark") };

/** Resolve a token through any `var(--x)` indirection to a literal colour. */
function resolve(vars, name, seen = new Set()) {
  let v = vars[name];
  if (v == null) throw new Error(`unknown token ${name}`);
  let guard = 0;
  while (v.startsWith("var(")) {
    const ref = v.slice(4, v.indexOf(")")).trim();
    if (seen.has(ref) || guard++ > 20) throw new Error(`var cycle at ${name}`);
    seen.add(ref);
    v = vars[ref];
    if (v == null) throw new Error(`unknown token ${ref} (via ${name})`);
    v = v.trim();
  }
  return v;
}

/* ── colour maths (sRGB relative luminance, WCAG 2.1) ──────────────── */

function rgb(hex) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/* ── the pairs the product actually renders ────────────────────────── */

const T = 4.5; // text
const G = 3.0; // graphics / component boundaries / large text

const SURFACES = ["--canvas", "--surface", "--surface-2", "--surface-3", "--field"];
const TINTS = [
  "--marine-tint",
  "--coral-tint",
  "--gold-tint",
  "--jade-tint",
  "--violet-tint",
  "--ruby-tint",
];
const pairs = [];
const add = (fg, bg, min, note) => pairs.push({ fg, bg, min, note });

// Body copy and headings on every surface they can land on.
for (const bg of [...SURFACES, ...TINTS]) {
  add("--tx-head", bg, T, "heading");
  add("--tx-body", bg, T, "body");
  add("--tx-muted", bg, T, "label / caption / placeholder");
}

// White knocked out of every solid fill that carries a label.
for (const bg of [
  "--coral",
  "--coral-hover",
  "--coral-press",
  "--marine",
  "--marine-deep",
  "--ruby",
  "--rail",
  "--rail-deep",
]) {
  add("--tx-invert", bg, T, "white on fill");
}

// The `-ink` tokens are each hue used as TYPE. They must clear on the
// light surfaces and on their own tint and chip.
const INKS = [
  ["--marine-ink", "--marine-tint", "--marine-chip"],
  ["--coral-ink", "--coral-tint", "--coral-chip"],
  ["--gold-ink", "--gold-tint", "--gold-chip"],
  ["--jade-ink", "--jade-tint", "--jade-chip"],
  ["--violet-ink", "--violet-tint", "--violet-chip"],
  ["--ruby-ink", "--ruby-tint", "--ruby-chip"],
];
for (const [ink, tint, chip] of INKS) {
  add(ink, "--surface", T, "hue as type");
  add(ink, "--canvas", T, "hue as type");
  add(ink, tint, T, "hue as type on its tint");
  add(ink, chip, G, "icon glyph on its chip");
}

// The rail.
add("--tx-rail", "--rail", T, "rail type");
add("--tx-rail", "--rail-deep", T, "rail type");
add("--tx-rail-dim", "--rail", T, "rail secondary type");
add("--tx-rail-dim", "--rail-deep", T, "rail secondary type");
add("--coral-on-rail", "--rail", T, "coral as type on the rail");
add("--coral-on-rail", "--rail-deep", T, "coral as type on the rail");
add("--rail-accent", "--rail", G, "active-nav edge bar");

// Non-text: component boundaries, focus rings, status dots, chart marks.
for (const bg of ["--surface", "--canvas", "--field"]) {
  add("--field-border", bg, G, "field boundary (1.4.11)");
}
for (const bg of ["--surface", "--canvas", "--surface-2"]) {
  add("--ring", bg, G, "focus ring");
}
for (const hue of ["--marine", "--jade", "--violet", "--ruby", "--gold", "--coral-vivid"]) {
  add(hue, "--surface", G, "status dot / chart mark");
  add(hue, "--canvas", G, "status dot / chart mark");
}

/* ── run ───────────────────────────────────────────────────────────── */

let failed = 0;
let checked = 0;

for (const [theme, vars] of [
  ["light", light],
  ["dark", dark],
]) {
  const fails = [];
  for (const { fg, bg, min, note } of pairs) {
    const f = resolve(vars, fg);
    const b = resolve(vars, bg);
    const r = ratio(f, b);
    checked++;
    if (r < min) {
      fails.push(
        `  ${fg} (${f}) on ${bg} (${b})  ${r.toFixed(2)}:1  needs ${min}:1  — ${note}`
      );
    }
  }
  if (fails.length) {
    failed += fails.length;
    console.log(`\n${theme.toUpperCase()} — ${fails.length} FAILING`);
    for (const f of fails) console.log(f);
  } else {
    console.log(`${theme.toUpperCase()} — all ${pairs.length} pairs pass`);
  }
}

console.log(`\n${checked - failed}/${checked} checks pass across both themes.`);
process.exit(failed ? 1 : 0);
