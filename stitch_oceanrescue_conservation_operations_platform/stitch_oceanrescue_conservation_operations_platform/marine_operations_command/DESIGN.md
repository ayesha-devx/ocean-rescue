---
name: Marine Operations Command
colors:
  surface: '#f3fbfb'
  surface-dim: '#d3dcdc'
  surface-bright: '#f3fbfb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf5f5'
  surface-container: '#e7efef'
  surface-container-high: '#e2eaea'
  surface-container-highest: '#dce4e4'
  on-surface: '#151d1d'
  on-surface-variant: '#3b4948'
  inverse-surface: '#2a3232'
  inverse-on-surface: '#eaf2f2'
  outline: '#6b7a78'
  outline-variant: '#bacac7'
  surface-tint: '#006a65'
  primary: '#006a65'
  on-primary: '#ffffff'
  primary-container: '#00c9c1'
  on-primary-container: '#004f4b'
  inverse-primary: '#36dcd4'
  secondary: '#006874'
  on-secondary: '#ffffff'
  secondary-container: '#93eefc'
  on-secondary-container: '#006d79'
  tertiary: '#416276'
  on-tertiary: '#ffffff'
  tertiary-container: '#97b9cf'
  on-tertiary-container: '#284a5c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#5ff9f0'
  primary-fixed-dim: '#36dcd4'
  on-primary-fixed: '#00201e'
  on-primary-fixed-variant: '#00504c'
  secondary-fixed: '#96f0ff'
  secondary-fixed-dim: '#79d4e2'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f57'
  tertiary-fixed: '#c4e7fe'
  tertiary-fixed-dim: '#a9cbe2'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#284b5d'
  background: '#f3fbfb'
  on-background: '#151d1d'
  surface-variant: '#dce4e4'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-dense: 0.75rem
  margin: 1.5rem
  margin-dock: 1rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
  space-2xl: 2.5rem
---

## Brand & Style

The design system establishes a focused, high-precision marine intelligence environment tailored for maritime scientists, field coordinators, and fleet directors. The visual tone balances mission-critical operational clarity with scientific sophistication: crisp, luminous, and legible under high-pressure decision-making environments.

### Design Movement
- **Modern Tactical Precision:** An intersection of clean functional ergonomics and data-dense GIS control software. Avoid speculative sci-fi neon, glowing vectors, or translucent frosted gimmicks.
- **Atmospheric Clarity:** Surfaces rely on pristine maritime whites and arctic pale hues, framed by calibrated low-contrast cyan-tinted borders and anchored by authoritative deep navy typography.
- **Direct Affordance:** Operational states, telemetry feeds, and alert vectors demand immediate recognition through distinct chromatic hierarchy and structured visual anchoring.

## Colors

The palette is engineered specifically for daytime optical clarity, high data density, and clear navigational paths. The light mode execution strictly enforces legibility without inducing visual fatigue.

### Core Swatches
- **Primary Canvas (`#F2FAFA` - Ice White):** Subtle foundational backplane across desktop canvases and recessed workspace regions.
- **Card & Workspace Surface (`#FFFFFF` - Pure White):** Layered above canvas for tables, inspector cards, dynamic flyouts, and modal panels.
- **Action & Indicator Primary (`#00C9C1` - Aqua):** High-priority interactives, focused nodes, telemetry metrics, and active states. Pair with dark navy text when used as a solid fill for accessibility.
- **Action & Structural Secondary (`#087E8B` - Ocean Teal):** Anchored brand states, navigation sidebar highlights, sub-headers, and interactive icons.
- **Typography & Structural Contrast (`#173B4D` - Navy Text):** All primary editorial strings, analytical labels, numerical data, and structural boundaries.

### Border System
- **Structural Default Border (`#D8ECEC`):** Delineates data cards, persistent sidebars, table headers, and complex form fields.
- **Subtle Partition Border (`#E2EFEF`):** Used strictly for interior list dividers, row separators, and auxiliary toolbar item separations.

### Semantic Triage Tokens
- **Verified / Safe (`#10B981`):** Vessel checks cleared, sensor operational, target habitat secured.
- **Pending / In Route (`#3B82F6`):** Vessel underway, mission syncing, analysis queuing.
- **Warning / Degraded (`#F59E0B`):** Environmental anomaly, boundary proximity alert, sensor battery nominal-low.
- **Critical / Immediate Breach (`#EF4444`):** Illegal trawling detection, reef boundary violation, emergency transponder distress.

## Typography

The typographic hierarchy implements three specialized typefaces:
- **Display & Section Headers (`Space Grotesk`):** Delivers a crisp, modern scientific edge without veering into pastiche sci-fi.
- **Interface & Operational Prose (`Hanken Grotesk`):** Highly legible humanist-grotesque ensuring dense tabular screens and form fields maintain high readability across extended viewing periods.
- **Geospatial & Telemetry Telemetry (`JetBrains Mono`):** Applied to GPS coordinates, latitude/longitude matrices, timestamp tracking, maritime call signs, and system counters.

All primary copy renders in `#173B4D` to eliminate optical haze. Auxiliary meta labels apply 75% opacity of the navy base token (`#173B4D` at 75%), avoiding generic gray scaling.

## Layout & Spacing

### Ergonomics & Grid Architecture
The workspace is desktop-first, tailored for 1440x1000 operational stations and multi-display mission centers:
- **Global Frame:** Fixed sidebar navigation dock (`64px` collapsed or `240px` expanded), adjacent to an analytical stage or split-pane GIS canvas.
- **Layout Model:** High-density responsive column grid with `1.25rem` (`20px`) gutters for operational dashboards, scaling down to `0.75rem` (`12px`) dense mode for split GIS telemetry sidebars.
- **Outer Canvas Margins:** Maintained at `1.5rem` (`24px`) padding from viewport boundaries to internal cards.

### Scaling & Density Modes
- **Compact Telemetry Mode:** Spacing decreases using `space-xs` (`4px`) and `space-sm` (`8px`) for tight inspector matrices, satellite data columns, and vessel list entries.
- **Standard Console Mode:** Standard cards and overview dashboards leverage `space-md` (`12px`) and `space-lg` (`20px`) inner card padding.

## Elevation & Depth

Visual hierarchy uses crisp boundaries paired with targeted, atmospheric ambient shadows. Surfaces stay clear of blur-heavy glassmorphism or high-contrast drop-shadows.

### Structural Levels
- **Canvas Base (Level 0):** `#F2FAFA`. Recessed stage for geospatial maps, vessel plotting views, and macro background surfaces.
- **Surface Elevation (Level 1):** `#FFFFFF`. Primary containers, data tables, analytical readouts, and inspect cards. Bound with a 1px solid `#D8ECEC` border. Shadow: `0 1px 3px 0 rgba(23, 59, 77, 0.04), 0 1px 2px -1px rgba(23, 59, 77, 0.04)`.
- **Floating Inspector Panels & Modals (Level 2):** Overlay charts, flyout drawer inspectors, active geospatial popups. Bound with 1px solid `#D8ECEC`. Shadow: `0 8px 24px -4px rgba(23, 59, 77, 0.08), 0 2px 6px -2px rgba(23, 59, 77, 0.04)`.
- **Active Navigation / Focus Planes (Level 3):** Global search palette, telemetry alerts, and context dropdowns. Bound with 1px solid `#00C9C1`. Shadow: `0 14px 32px -6px rgba(23, 59, 77, 0.12)`.

## Shapes

The design system enforces disciplined, structured engineering contours using a controlled radius scale (`roundedness: 1`):
- **Base Surfaces & Cards:** `0.25rem` (`4px`) corner radius. Maintains a tight, instrument-grade form factor.
- **Interactive Controls (Buttons, Inputs, Selectors):** `0.25rem` (`4px`) corner radius to preserve architectural alignment with grid cells.
- **Geospatial Badges & Telemetry Chips:** `0.25rem` (`4px`) radius or flat pill (`9999px`) strictly when communicating real-time status pulses or maritime transponder state tags.

## Components

### Buttons
- **Primary Operational Button:** Solid Aqua (`#00C9C1`) background with `#173B4D` Navy text at font-weight 600. Border: 1px solid transparent. Hover state shifts background to `#00B5AE`. Active click scale: `0.99`.
- **Secondary Action Button:** Surface white (`#FFFFFF`) with 1px solid `#087E8B` border and Ocean Teal (`#087E8B`) text. Hover state initiates subtle tint `#F2FAFA`.
- **Destructive/Emergency Action:** Surface white with 1px solid `#EF4444` border and `#EF4444` text. Active hover converts to full `#EF4444` background with white text.

### Navigation & Sidebar Indicators
- **Sidebar Structure:** Background `#FFFFFF` or `#F2FAFA`, right edge bounded by 1px solid `#D8ECEC`.
- **Active Navigation Item:** Distinct 3px solid `#00C9C1` vertical accent bar pinned flush against the left boundary. Background fill `#F2FAFA`. Icon and text rendered in Ocean Teal (`#087E8B`) with font weight 600.

### Status Chips & Tag Tokens
- **Design:** Compact height (`22px`), `label-caps` typography, padding `2px 8px`, border radius `4px`.
- **Variants:**
  - *Critical:* Background `rgba(239, 68, 68, 0.08)`, border `1px solid rgba(239, 68, 68, 0.3)`, text `#EF4444`.
  - *Warning:* Background `rgba(245, 158, 11, 0.08)`, border `1px solid rgba(245, 158, 11, 0.3)`, text `#D97706`.
  - *Verified:* Background `rgba(16, 185, 129, 0.08)`, border `1px solid rgba(16, 185, 129, 0.3)`, text `#059669`.
  - *Pending:* Background `rgba(59, 130, 246, 0.08)`, border `1px solid rgba(59, 130, 246, 0.3)`, text `#2563EB`.

### Data Tables & Telemetry Lists
- **Header:** Height `36px`, background `#F2FAFA`, bottom border `1px solid `#D8ECEC`. Font: `label-caps` in `#173B4D` at 70% opacity.
- **Row:** Height `44px`, background `#FFFFFF`, bottom border `1px solid #E2EFEF`. Hover state fills with `rgba(0, 201, 193, 0.04)`.
- **Numeric & Coordinate Alignment:** Right-aligned numerical columns using `JetBrains Mono` with tabular numerals (`font-variant-numeric: tabular-nums`).

### Input Fields & Controls
- **Text Inputs:** Height `36px`, surface `#FFFFFF`, border `1px solid #D8ECEC`, typography `body-md` in `#173B4D`. Focus indicator: 1px border `#00C9C1` with a 2px offset glow ring `rgba(0, 201, 193, 0.2)`.
- **Checkboxes & Radios:** `16px` dimension, border `1.5px solid #087E8B`, corner radius `3px` (checkbox) or circular (radio). Active checked state uses `#00C9C1` fill with an inset `#173B4D` checkmark icon.

### GIS Inspector Cards & Flyouts
- **Header Section:** Compact horizontal flex row containing a live status chip, sector title in `Space Grotesk`, and latitude/longitude coordinates in `JetBrains Mono`.
- **Card Body:** Partitioned by horizontal dividers (`#E2EFEF`) isolating real-time vessel vectors, water temperature readouts, and active sensor charts.