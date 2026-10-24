---
name: Precision Editorial Finance
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#44474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777d'
  outline-variant: '#c4c6cc'
  surface-tint: '#525f71'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0f1c2c'
  on-primary-container: '#778598'
  inverse-primary: '#bac8dc'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#7ef6be'
  on-secondary-container: '#00714c'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#40000c'
  on-tertiary-container: '#f83256'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e4f9'
  primary-fixed-dim: '#bac8dc'
  on-primary-fixed: '#0f1c2c'
  on-primary-fixed-variant: '#3a4859'
  secondary-fixed: '#81f9c1'
  secondary-fixed-dim: '#63dca6'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  numeric-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  numeric-table:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-micro:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses quiet financial authority, seamless digital precision, and radical clarity. Engineered primarily for mobile-first personal wealth management and real-time spreadsheet synchronization, it blends modern fintech efficiency with the grounded permanence of high-end editorial banking.

The design movement combines **Minimalism** with **Tonal Layering and Crisp Micro-Structures**:
- Surfaces prioritize clean negative space and strict typographic rhythm over decorative noise.
- Visual weight leans on fine 1px structured borders, delicate tinted badges, and tactile interactive surfaces.
- The interface projects calm reliability: mathematical alignment, zero visual clutter, and instant legibility under high cognitive load.

## Colors

The palette establishes immediate semantic clarity around wealth tracking, capital growth, and outflow monitoring:

- **Primary (`#0D1B2A`) — Slate Navy:** Represents institutional stability, structural boundaries, typography, and default active elements.
- **Secondary (`#0F9F6E`) — Emerald Mint:** Designates assets, positive cash flow, inbound sync states, budget surplus, and wealth accumulation.
- **Tertiary (`#E11D48`) — Energetic Crimson/Coral:** Strictly reserved for debits, high spend warnings, negative balance variances, and critical friction moments.
- **Neutral (`#F8FAFC`) — Soft Canvas:** An ultra-soft, warm-slate foundation that eliminates eye fatigue caused by harsh blue or raw white surfaces.

### Semantic & Extended Tokens
- **Canvas Base:** `#F8FAFC`
- **Surface Level 1 (Card & Modular Widgets):** `#FFFFFF`
- **Surface Level 2 (Nested Items / Input Fields):** `#F1F5F9`
- **Border Subtle (Default Container Line):** `rgba(15, 23, 42, 0.08)`
- **Border Focus / Selected:** `#0D1B2A`
- **Sync Active Tint (Google Sheets Link):** `#107C41` (Deep Leaf) with a light tinted backing `#ECFDF5`
- **Text Primary:** `#0F172A`
- **Text Secondary:** `#475569`
- **Text Muted:** `#94A3B8`

## Typography

The typographic hierarchy employs a hybrid system engineered for data density, fiscal authority, and mobile scanning speed:

- **Display & Headings (Plus Jakarta Sans):** Offers balanced geometry and friendly humanist nuances without compromising structure. Sets balance totals, category overviews, and modal titles.
- **Body & Controls (Manrope):** Chosen for its exceptional horizontal legibility, open apertures, and neutral posture in dense transaction feeds.
- **Metrics & Technical Indicators (JetBrains Mono):** Reserved for synchronized timestamps, cell formulas, micro-badges, and transaction ledger rows. Monospaced tabular alignment ensures decimal points, currencies, and sync percentages stay aligned.

## Layout & Spacing

The interface runs on an 8-point harmonic spacing grid, optimized with 4px sub-steps (`space-xs`) for dense financial telemetry:

- **Grid Strategy:** A fluid 4-column layout on mobile devices transitioning to an 8-column layout on tablets and a 12-column layout on desktop dashboards.
- **Mobile Margins:** Standard canvas margin is `1rem` (16px), extending to `2rem` (32px) on tablet breakpoints to preserve ergonomic reach zones.
- **Rhythm & Grouping:** 
  - Related inputs and micro-labels bind tightly with `space-xs` (4px) to `space-sm` (8px).
  - Cards, transaction rows, and category tiles decouple using `space-md` (16px).
  - High-level metric sections and modular financial widgets separate using `space-xl` (32px).

## Elevation & Depth

To avoid murky, heavy shadows that obscure delicate monetary figures, visual depth is achieved through **Tonal Stacking and Crisp Low-Contrast Outlines**:

- **Ground (Level 0):** Canvas neutral (`#F8FAFC`), completely flat.
- **Card Tier (Level 1):** Solid white surface (`#FFFFFF`) with a 1px perimeter border (`rgba(15, 23, 42, 0.08)`), combined with an ultra-subtle ambient drop shadow: `0 1px 3px rgba(13, 27, 42, 0.03), 0 6px 16px rgba(13, 27, 42, 0.02)`.
- **Floating Controls & Modals (Level 2):** Pure white surface layered over a light backdrop blur (`backdrop-filter: blur(12px); background-color: rgba(255, 255, 255, 0.94)`), paired with a focused shadow: `0 4px 12px rgba(13, 27, 42, 0.06), 0 16px 32px rgba(13, 27, 42, 0.04)`.
- **Active State / Tapped:** Visual indentation achieved through slight border contrast stepping (`#0D1B2A`) rather than dramatic elevation shifting.

## Shapes

The design system implements a refined **Level 2 (Rounded)** shape taxonomy, establishing an approachable yet disciplined aesthetic:

- **Micro Badges & Pills:** `0.5rem` (8px) or complete capsule radius (`9999px`) for sync pills and status indicators.
- **Inputs & Secondary Buttons:** `0.5rem` (8px) corner radius for focused, functional clarity.
- **Standard Cards & Dashboard Blocks:** `1rem` (16px) corner radius, balancing friendly contours with structured screen margins.
- **Bottom Sheets & Modal Overlays:** `1.5rem` (24px) top-corner radius for ergonomic tactile sheets that slide into the thumb zone.

## Components

### Buttons
- **Primary Action (Sync / Commit):** Slate Navy solid fill (`#0D1B2A`), white label text, `0.5rem` corner radius, height 48px. Includes a subtle active state scale down (`0.98`) for haptic feedback.
- **Secondary (Export / Filter):** Transparent background with a 1px border (`rgba(15, 23, 42, 0.12)`), text in Primary Navy.
- **Destructive (Delete Entry):** Tinted coral ground (`rgba(225, 29, 72, 0.08)`), text in `#E11D48`.

### Financial Metric Widgets & Cards
- Container built on `#FFFFFF` with `1rem` radius and 1px border (`rgba(15, 23, 42, 0.08)`).
- Metric headers display a small category badge, a bold `numeric-hero` value, and an inline directional trend badge (`+4.8%` in `#0F9F6E` or `-2.1%` in `#E11D48`).

### Micro-Badges & Sync Status
- **Google Sheets Sync Live:** Pill shape with a soft mint background (`#ECFDF5`), 1px border (`rgba(16, 185, 129, 0.2)`), displaying a 6px pulsing emerald dot beside label text in `label-micro`.
- **Pending Sync / Offline:** Muted slate tint (`rgba(148, 163, 184, 0.15)`), warning dot in amber.

### Transaction Lists
- Divided by 1px hairline separators (`rgba(15, 23, 42, 0.05)`).
- Left: 40px rounded icon container with category-specific tinting.
- Center: Transaction name (`body-md`, semi-bold) stacked above sheet row ID or timestamp (`label-micro`, text-muted).
- Right: Monetary amount in `numeric-table`. Green with leading `+` for deposits, Slate Navy with leading `-` for expenditures.

### Form Inputs & Google Sheet Mapping Fields
- Height 44px, filled background `#F1F5F9`, border 1px transparent, `0.5rem` radius.
- On focus: Background turns white (`#FFFFFF`), border becomes Slate Navy (`#0D1B2A`) with a 2px outer tint ring (`rgba(13, 27, 42, 0.08)`).

### Checkboxes & Segmented Toggles
- Checkboxes: 20px rounded squares (`0.25rem` radius) with a 1.5px Slate Navy border. Active state fills with `#0F9F6E` displaying a crisp white micro checkmark.
- Segmented Control (Income / Expense switcher): Recessed track (`#F1F5F9`), sliding pill container in `#FFFFFF` with an ambient shadow.