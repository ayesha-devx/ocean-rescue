---
name: Marine Tactical Command
colors:
  surface: '#061421'
  surface-dim: '#061421'
  surface-bright: '#2c3b49'
  surface-container-lowest: '#020f1c'
  surface-container-low: '#0e1d2a'
  surface-container: '#12212e'
  surface-container-high: '#1d2b39'
  surface-container-highest: '#283644'
  on-surface: '#d5e4f7'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#d5e4f7'
  inverse-on-surface: '#243240'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#50dbc8'
  on-secondary: '#003731'
  secondary-container: '#00b1a0'
  on-secondary-container: '#003d36'
  tertiary: '#ffe8e5'
  on-tertiary: '#690007'
  tertiary-container: '#ffc2bc'
  on-tertiary-container: '#a62b27'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#50dbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ac'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#8c1617'
  background: '#061421'
  on-background: '#d5e4f7'
  surface-variant: '#283644'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  telemetry-display:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes a high-precision marine geospatial operations platform dedicated to autonomous ALDFG (Abandoned, Lost or otherwise Discarded Fishing Gear / ghost net) detection, hydrodynamic drift vector modeling, and vessel retrieval coordination.

The design language synthesizes **tactical GIS telemetry** and **deep-sea command minimalism**. It evokes the atmosphere of an oceanic mission control bridge: high-contrast deep bathymetric navy substrates, crisp technical grids, luminous electric cyan signals, and precision data visualization. Every element communicates mission readiness, scientific rigor, and spatial immediacy.

## Colors

The palette is tuned specifically for low-light marine command environments, maximizing contrast and data legibility across geospatial layers.

- **Background & Structure:**
  - Base Canvas: `#061522` (Deep Oceanic Abyss)
  - Sidebar & Nav Rail: `#071D33` (Sub-surface Navy)
  - Cards & Geospatial Containers: `#0B2638` (Marine Panel Dark)
  - Elevated Surfaces & Active Cards: `#103B50` (Trench Blue)
  - Structural Grids & Dividers: `#16465A` (Sonar Line)
- **Primary Telemetry & Accents:**
  - Primary Beacon: `#00E5FF` (Electric Cyan) — Used for live tracks, primary focus points, selection reticles, and key metrics.
  - Secondary Stream: `#16B8A6` (Bio-Teal) — Used for mission corridors, secondary charts, and nominal sensor readings.
  - Telemetry Accent: `#75E6DA` (Soft Aqua) — Supporting typography, coordinate callouts, and secondary indicators.
  - Success / Nominal: `#00D6A3` (Signal Mint) — Clear channels, successful retrievals, sensor lock.
- **Risk & Alert Status Levels:**
  - High Hazard / Active Ghost Net Drift: `#FF6B61` (Critical Coral Red)
  - Medium Hazard / Drift Collision Risk: `#FFB547` (Amber Hazard)
  - Pending Analysis / Autonomous ML Queue: `#B8A4FF` (Spectral Lavender)
  - Informational / Bathymetric Datum: `#4C9AFF` (Hydro Blue)
- **Text & Readout Hierarchy:**
  - Primary Readout: `#EAF6FF` (Ice White) — 100% contrast against deep water surfaces.
  - Secondary Telemetry: `#91A9BB` (Slate Mist) — Metadata, coordinates, axis markers.
  - Inactive / Grid Markings: `#385A6E` (Submerged Slate).

## Typography

The typographic hierarchy balances instant spatial scanning with analytical legibility:

- **Display & Headings (Space Grotesk):** Provides a sharp, technical, geometric personality suitable for tactical titles, coordinates headers, and operation designations.
- **Interface & Operational Text (Inter):** Ensures maximum clarity for operational narratives, risk debriefs, and system forms without visual friction.
- **Telemetry & Metadata (JetBrains Mono):** Reserved for spatial telemetry (latitude/longitude, depth contours, drift velocity, ETA, ML confidence metrics, and timestamp logs). All numerical data tables and map HUD badges strictly employ monospaced tabular figures.

## Layout & Spacing

The layout is built upon an ultra-dense, multi-pane tactical GIS grid designed to maximize screen real estate for map layers and concurrent telemetry feeds:

- **Desktop Layout (≥ 1280px):**
  - **Left Rail (Compact Navigation):** Fixed width of 72px (collapsible to 240px wide tree view).
  - **Main Viewport (Geospatial Core):** Fluid 12-column sub-grid hosting bathymetric map canvases, vector drift overlays, and ROV video telemetry.
  - **Right Tactical Drawer (Telemetry & Action):** 360px to 420px fixed panel for target prioritization, sensor readings, and recovery mission checklists.
  - **Bottom Dock:** 240px fixed-height timeline for trajectory predictions, tide currents, and depth profile curves.
- **Tablet / Split View (768px - 1279px):**
  - Left navigation collapses to an icon bar. Right telemetry drawer shifts into an overlay sheet or collapsible split-screen partition.
- **Mobile Handheld (< 768px):**
  - Bottom navigation bar with primary mode toggles: `Map`, `Queue`, `Telemetry`, and `Fleet`. Critical status cards stack vertically with swipeable bottom cards over map viewports.
- **Rhythm:** An 8pt base grid system is strictly enforced. Internal widget margins use `space-md` (16px), while tight micro-telemetry readouts utilize `space-xs` (4px) and `space-sm` (8px).

## Elevation & Depth

Visual hierarchy does not use heavy drop shadows; instead, it relies on **structural tonal layering**, **glassmorphism**, and **tactical photon luminescence**:

1. **Substrate (Level 0):** Background canvas `#061522`. Deep, non-reflective bathymetric base.
2. **Structural Panels (Level 1):** `#0B2638` with crisp 1px borders of `rgba(22, 70, 90, 0.8)`. Flat surfaces housing static readouts.
3. **Elevated Geospatial Overlays (Level 2):** `#103B50` with backdrop-filter blur `12px` and `rgba(11, 38, 56, 0.75)` alpha blend. Used for floating map HUD elements, zoom controllers, and mini depth profiles.
4. **Active Flight / Sonar Lock (Level 3):** Outlines infused with directional cyan photon bleed (`box-shadow: 0 0 16px rgba(0, 229, 255, 0.25), inset 0 0 8px rgba(0, 229, 255, 0.1)`).
5. **Critical Alert Overlay:** Ambient pulsing glow in Critical Coral (`rgba(255, 107, 97, 0.3)`) to command immediate operator attention without obscuring live geospatial targets.

## Shapes

The interface employs a **moderately rounded (Level 2)** shape profile combined with technical chamfer accents to maintain high instrument precision without harsh brutalist severity:

- Standard Cards and HUD Panels: `0.5rem` (`rounded-md`, 8px).
- Status Pills, Sonar Targets, and Target Filters: Fully rounded pills or `1rem` (`rounded-lg`).
- Tactical Reticles, Crosshairs, and Sonar Bounding Boxes: `0px` with 2px corner brackets to reinforce naval targeting aesthetics.
- Buttons & Command Triggers: `0.5rem` corner radius with crisp 1px inner structural border highlights.

## Components

### Buttons & Mission Triggers
- **Primary Tactical Action:** Background `#00E5FF`, label in deep navy `#061522` (Space Grotesk, Bold, uppercase tracking). Hover states trigger a high-luminance cyan glow (`0 0 20px rgba(0, 229, 255, 0.5)`).
- **Secondary Action:** Transparent background with 1px border `#16465A`, text `#EAF6FF`. Hover transforms border to `#00E5FF` and surface to `rgba(0, 229, 255, 0.08)`.
- **Destructive / Abort Action:** Deep crimson surface `rgba(255, 107, 97, 0.15)` with `#FF6B61` border and text.

### Telemetry Badges & Chips
- Monospaced JetBrains Mono typography with uppercase lettering.
- Constructed as translucent pills with 1px borders and a leading 6px pulsing radar dot.
- High Risk / Urgent Net: Surface `rgba(255, 107, 97, 0.15)`, Border `#FF6B61`, Text `#FF6B61`.
- Nominal Track: Surface `rgba(0, 214, 163, 0.15)`, Border `#00D6A3`, Text `#00D6A3`.
- Machine Learning Drift In-Progress: Surface `rgba(184, 164, 255, 0.15)`, Border `#B8A4FF`, Text `#B8A4FF`.

### Lists & Priority Queues
- Compact row dividers using `1px solid #16465A`.
- Left-side risk accent bar (3px width) directly signaling threat severity.
- Hover transition triggers a surface shift from `#0B2638` to `#103B50` and micro-shifts target coordinates 2px rightward.

### Input Fields & Spatial Selectors
- Background `#071D33` with border `#16465A` and inner padding `0.5rem 0.75rem`.
- Monospaced coordinate input format with persistent unit suffix labels (`° N`, `knots`, `meters depth`).
- Focus state activates `#00E5FF` border with a subtle 2px blur halo.

### Geospatial Cards & Telemetry Panels
- Container `#0B2638` with 1px border `#16465A`.
- Header bar features an integrated coordinate tag (`JetBrains Mono, 10px, uppercase, #91A9BB`) along with an active mission state icon.
- Mini-charts (bathymetry curves, drift vectors) embed seamless vector SVG curves with luminous gradient fills fading into transparent bases.

### Tactical Overlay Indicators
- Crosshair targets with active tracking rings (`#00E5FF` dashed borders with 360-degree rotation animation for ML inference passes).
- Real-time vehicle telemetry chips pinned to live coordinate markers displaying speed, depth, and battery reserve.