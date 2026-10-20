---
version: alpha
name: Algo Triggers
description: A daylight research desk for Brent market signals, with quiet charts and precise evidence.
colors:
  primary: "#6251d8"
  ink: "#192a35"
  muted: "#5b6b77"
  rail: "#172b35"
  canvas: "#f4f6f8"
  surface: "#ffffff"
  border: "#e1e6eb"
  up: "#087d68"
  down: "#b64b56"
typography:
  sans:
    fontFamily: "Segoe UI, Arial, sans-serif"
  display:
    fontFamily: "Segoe UI, Arial, sans-serif"
  mono:
    fontFamily: "Consolas, monospace"
rounded:
  DEFAULT: "8px"
  control: "6px"
spacing:
  unit: "4px"
  panel: "24px"
components:
  button: { height: "36px" }
  panel: { rounded: "8px" }
---

# Algo Triggers design system

## Overview

The North Star is an analyst's daylight research desk: an expansive paper-like chart, a dark instrument rail, and compact annotation cards. Market-literate users create and inspect signals. This is a product workspace, not a promotional trading website. English interface; international Brent research audience. No Japan-market or local regulatory claims are implied.

The signature is the context handoff: a purple rule threshold and event marker on the market chart carries into a readable rule and its diagnostic evidence. The chart earns the most space; supporting controls stay quiet. Avoid neon terminals, decorative gradients, giant marketing headlines, profit badges and walls of disconnected cards.

Runtime CSS variables in `src/styles.css` are canonical. Frontmatter mirrors their accepted values; `scripts/check-tokens.mjs` checks color drift. All screens consume shared variables. The demo has one light content theme and a dark navigation rail; forced colors remain system-operated.

## Colors

Primary violet marks rule creation, selection, focus and event annotations. Teal and rose represent upward/downward prices and always include signs or labels. White panels rest on a cool gray canvas; ink is blue-slate. Muted text is for secondary metadata, never a substitute for a disabled control. A soft violet background distinguishes rule context from market direction.

## Typography

Segoe UI provides readable Windows-native UI without font-loading layout shifts. Display headings use lighter weight and wider measure than compact semibold control labels. Consolas is reserved for prices, timestamps, formula operands and table values. Use tabular numerals. No uppercase paragraph text; small uppercase eyebrows identify context only.

## Layout

At 1280px and wider, the 208px rail anchors an expansive content area with a market chart and a compact rule handoff card. Below 1100px secondary cards stack; below 720px navigation becomes a horizontal bar. The document owns vertical scrolling; table wrappers own horizontal overflow. No shared page height cap. Normal panel padding is 24px, compact tables use 12–16px cells, and spacing derives from the 4px rhythm.

## Elevation & Depth

Panels use borders, not heavy shadows. Modal dialogs use a restrained shadow and an inert dimmed background. Charts remain flat. Sticky table headers must not cover focus.

## Shapes

Eight-pixel panels and six-pixel controls convey a tool, with small pill badges reserved for mode and status. Icons are lucide-react at 16–20px, consistent stroke width, accompanied by text for important actions.

## Components

Shared styles own buttons, native select/input fields, badges, panel headers, table wrappers and search clearing. Native select popups and native date calendars are intentionally platform-owned in this demo. Semantic buttons expose hover, focus-visible, pressed, disabled and busy states. Purple is the primary action; destructive actions remain outlined and separated.

The shared `Modal` owns dialog focus, Escape and restoration. One status region owns feedback. Charts have data alternatives and keyboard zoom controls. Native buttons with `aria-pressed` switch local chart modes; route links use `aria-current`. The demo provides no full custom ARIA tab widget.

Content uses precise action verbs: Create rule, Save rule, Test rule, Run test, Inspect event, Start demo monitoring. Futures prices show USD/bbl; Yahoo oil fund options show USD/share. Historical counts never imply profitability. An explicit source selector distinguishes Yahoo snapshots from synthetic samples; rule tests and monitoring remain synthetic. Motion is limited to short feedback and an optional loading spinner; reduced motion stops animations.

## Do's and Don'ts

- Do preserve chart context when creating a rule or inspecting an event.
- Do expose timestamps, fields, calculation definitions and unknown data.
- Don't claim a sample quote is a real-time ICE feed.
- Don't make profit, execution or production-readiness claims for this browser demo.

## Workflow simplicity

The primary rule journey uses three templates: price level, percentage move and moving-average crossover. Contract, essential condition fields and a readable summary are visible. The summary always exposes timeframe, calculation field, frequency and cooldown. Describe your idea is an optional disclosure that fills the same reviewable form. Advanced settings hold timeframe, alert policy and adding conditions; existing additional conditions remain visible and survive template changes.

Market indicator settings use a native disclosure, with the active method and periods in its summary. Saved rules keep Test rule and monitoring controls on the primary action line, with quieter Edit and Duplicate buttons always available below. The action layout stays stable without expanding disclosures. Test results lead with the alert count; evaluation statistics and exact condition values are available on demand.

Options Lab shows one task at a time: premiums, strategy construction or volatility. Switching these views retains the current strategy edits. Greeks are optional in both the chain and inspected quote. Source labels identify observed Yahoo snapshots, explicit demo samples, loading or unavailable states; no source rights or exchange equivalence are implied by this UI.

## Market data provenance

`DataSourceNotice` owns source, provider observation time, fetch time, age and unverified delay across market views. A successful HTTP response or healthy local server never proves market connectivity. Yahoo mode never substitutes synthetic bars or quotes. Missing inputs remain unavailable, with a retry action; the separate Demo samples mode is deliberate and persistent. Quote age describes the supplied observation time, not a promise of market freshness or exchange-open status.

Option views identify BNO/USO as fund options, with USD/share units and per-expiry requests. Yahoo Greeks are unavailable until a verified pricing model exists. The observed-IV view shows only the selected expiry's supplied IV; the illustrative multi-expiry mesh remains demo-only. Rule tests, monitoring and event evidence always name their synthetic dataset regardless of the market display source.
