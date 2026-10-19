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

Content uses precise action verbs: Create rule, Save draft, Run replay, Inspect event, Start demo monitoring. Prices show USD/bbl. Historical counts never imply profitability. Synthetic mode is persistent across all views. Motion is limited to short feedback and an optional loading spinner; reduced motion stops animations.

## Do's and Don'ts

- Do preserve chart context when creating a rule or inspecting an event.
- Do expose timestamps, fields, calculation definitions and unknown data.
- Don't claim a sample quote is a real-time ICE feed.
- Don't make profit, execution or production-readiness claims for this browser demo.
