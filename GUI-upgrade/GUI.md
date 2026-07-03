# BackfireOS — GUI Documentation & Layout Architecture

Authoritative reference for every UI surface in BackfireOS: design tokens, shared chrome, per-route layout specs, responsive behavior, and auth gates. Wireframe diagrams live in [`svg/`](svg/).

---

## 1. Introduction

BackfireOS is a **Next.js App Router** application with **13 UI routes**, one root layout ([`app/layout.tsx`](../app/layout.tsx)), and **two layout families**:

| Family | Wrapper | Routes |
|--------|---------|--------|
| **Standard** | `PageShell` + `SiteHeader` | `/`, `/runs/[id]`, `/history`, `/heatmap`, `/branches`, `/boardroom`, `/post-mortem`, `/login`, `/signup`, `/brands`, gated `/docs`, `/docs/admin` |
| **Custom** | `DocsExperience` (no SiteHeader) | `/docs` when access allowed |
| **Bare** | None | `/brand-preview` |

**How to read this doc**

- Each route section lists source files, grid/flex layout, key components, and state variants (loading, empty, error, auth gate).
- Layout diagrams are wireframes (structure only, not pixel mocks) at 1440×900 desktop.
- Class names and CSS variables match the live codebase.

![Shared chrome anatomy](svg/00-shared-chrome.svg)

---

## 2. Global Design System

Source: [`app/globals.css`](../app/globals.css), [`app/layout.tsx`](../app/layout.tsx)

### 2.1 Theme

Dark-only coral aesthetic inspired by Linear / Vercel / Raycast. `color-scheme: dark` — no light mode toggle.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0a0809` | Page background |
| `--bg-elev-1` | `#110e10` | Cards, header/footer |
| `--bg-elev-2` | `#181418` | Nested surfaces |
| `--bg-elev-3` | `#211b21` | Progress tracks, rings |
| `--fg` | `#fafafa` | Primary text |
| `--fg-muted` | `#a7a4ac` | Body secondary |
| `--fg-subtle` | `#6b6770` | Labels, meta |
| `--fg-faint` | `#44414a` | Tertiary |
| `--border` | `rgba(255,255,255,0.06)` | Default borders |
| `--border-strong` | `rgba(255,255,255,0.12)` | Card outlines |
| `--accent` | `#ff4d57` | Primary CTA, eyebrows |
| `--accent-400` | `#ff7a82` | Hover, gradients |
| `--accent-soft` | `rgba(255,77,87,0.08)` | Badges, active nav |
| `--success` | `#34d399` | Low risk, live badge |
| `--warning` | `#fbbf24` | Medium risk, demo notice |
| `--danger` | `#f87171` | High risk, delete |
| `--info` | `#60a5fa` | Info banners (boardroom) |

### 2.2 Typography

Loaded via `next/font/google` in root layout:

| Role | Font | CSS var | Tailwind |
|------|------|---------|----------|
| Body | DM Sans | `--font-dm-sans` | default sans |
| Display | Syne | `--font-syne` | `.font-display` |
| Mono | JetBrains Mono | `--font-jetbrains-mono` | `.font-mono` |

**Hierarchy**

| Element | Classes / size |
|---------|----------------|
| Page title (hero) | `.font-display` · `text-4xl`–`text-6xl` · `font-semibold` · `tracking-tight` |
| Section title | `.font-display` · `text-3xl`–`text-4xl` |
| Eyebrow | `.font-mono` · `text-[11px]` · `uppercase` · `tracking-[0.18–0.22em]` · `text-[var(--accent)]` + accent line |
| Body | `text-[15–17px]` · `leading-relaxed` · `text-[var(--fg-muted)]` |
| Meta / timestamps | `.font-mono` · `text-[11–12px]` · `text-[var(--fg-subtle)]` |

**Gradient text utilities:** `.text-gradient`, `.text-gradient-accent` (used on marketing headlines).

### 2.3 Radii & shadows

| Token | Value |
|-------|-------|
| `--radius-xs` … `--radius-2xl` | `0.375rem` … `1.5rem` |
| `--shadow-sm` … `--shadow-xl` | Layered dark shadows + 1px highlight ring |
| `--shadow-glow` | Accent radial glow |

Common component radii: cards `rounded-2xl` / `rounded-3xl`, buttons `rounded-lg` / `rounded-full`, inputs `rounded-lg`.

### 2.4 Background effects

Applied globally on `body`:

- **Aurora** — `body::before` radial coral gradient, blurred
- **Film grain** — `body::after` noise overlay

Page-level utilities:

- `.bg-grid` — faded grid overlay (hero sections)
- `.glass` / `.surface` / `.card-glow` / `.lift` — glassmorphism cards
- `.fade-up`, `.fade-in`, `.slide-in-right` — entrance animations
- `.shimmer` — loading skeleton pulse
- `.marquee` — infinite horizontal scroll (agent trust strip)
- `.pulse-dot` — live indicator animation

All motion respects `prefers-reduced-motion`.

### 2.5 Z-index scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-sticky` | 40 | SiteHeader, docs toolbar |
| `--z-dropdown` | 70 | Select portal, dropdown menus |
| `--z-modal` | 90 | Modals |
| `--z-toast` | 100 | Toasts |

### 2.6 UI component library

Hand-rolled, shadcn-inspired — **not** shadcn/ui. Located in [`components/ui/`](../components/ui/):

| Component | File | Variants |
|-----------|------|----------|
| Button | `button.tsx` | primary, secondary, outline, ghost, danger · sm/md/lg/xl |
| Card | `card.tsx` | Card, CardHeader, SectionHeader |
| Input | `input.tsx` | Input, Textarea, FileInput |
| Badge | `badge.tsx` | accent, outline, live, demo, success, warning, danger · RiskBadge, Kbd |
| Select | `select.tsx` | Portal-based custom select |
| DropdownMenu | `dropdown-menu.tsx` | Used by AuthButton |

Utility: [`lib/utils.ts`](../lib/utils.ts) — `cn()` for conditional classes.

Icons: inline SVGs in components (no icon package).

---

## 3. Shared Chrome

Sources: [`components/page-shell.tsx`](../components/page-shell.tsx), [`components/site-header.tsx`](../components/site-header.tsx)

### 3.1 PageShell

```
┌─────────────────────────────────────────┐
│ SiteHeader (sticky)                     │
├─────────────────────────────────────────┤
│ main                                    │
│   px-5 py-10                            │
│   md:px-8 md:py-16                      │
│   lg:px-12                              │
│   {children}                            │
├─────────────────────────────────────────┤
│ SiteFooter (optional, default true)     │
└─────────────────────────────────────────┘
```

| Prop | Default | Effect |
|------|---------|--------|
| `footer` | `true` | Renders 4-column footer + copyright |
| `bare` | `false` | Removes main padding (full-bleed) |
| `wide` | — | Deprecated no-op |

Most app pages pass `footer={false}`.

### 3.2 SiteHeader

| Region | Spec |
|--------|------|
| Container | `sticky top-0 z-40` · scroll → `bg-[var(--bg)]/75 backdrop-blur-xl border-b` |
| Padding | `px-5 md:px-8 py-3.5` |
| Logo | `LogoBadge sm` + green pulse dot + "Backfire OS" wordmark (hidden tagline below sm) |
| Desktop nav | `hidden lg:flex` pill: `rounded-full border bg-[var(--bg-elev-1)]/60 p-1` |
| Nav items | Simulate (`/`) · Heat map · Branches · Boardroom · Pre-mortem |
| Active indicator | Sliding white/6% pill measured via `getBoundingClientRect` |
| Language | EN/BN toggle · `hidden sm:flex` |
| Auth | `AuthButton` dropdown |
| Mobile | Hamburger `lg:hidden` → drawer with nav + History + auth block |

**Run-aware navigation:** When on `/runs/[id]` or run-aware paths with `?runId=`, nav links append/preserve run context so "Simulate" stays on the run and mode links carry `runId`.

History appears only in the **mobile drawer**, not desktop pill nav.

### 3.3 SiteFooter

| Column | Links |
|--------|-------|
| Brand (1.5fr) | Logo sm + tagline |
| Product | Run simulation, History, Heat map, Branches |
| Modes | Boardroom, Pre-mortem, Docs & deck |
| Account | Sign in, Create account |

Copyright bar: `© {year} Backfire OS · v0.1 prototype`

### 3.4 PageHero

Reusable hero block from `page-shell.tsx`:

- Optional eyebrow with accent line
- `h1` display title (`text-4xl md:text-5xl lg:text-6xl`)
- Optional description (`max-w-2xl`, 17px muted)
- `align`: `left` (default) or `center`

Used on: `/history`, `/brands`, and similar list pages.

---

## 4. Layout Families

### 4.1 PageShell (standard)

Default for all authenticated/product routes. Global aurora + grain visible through transparent header until scroll.

### 4.2 DocsExperience (custom)

[`components/docs/docs-experience.tsx`](../components/docs/docs-experience.tsx) — **replaces** SiteHeader entirely.

```
┌─────────────────────────────────────────┐
│ Docs toolbar (sticky)                   │
├─────────────────────────────────────────┤
│ [Preview banner] (optional)             │
├──────────┬──────────────────────────────┤
│ Sidebar  │ Main content                 │
│ 230px    │ max-w-7xl grid               │
│ sticky   │ DocsHero → sections → footer │
│ lg+ only │ Mobile: section Select       │
└──────────┴──────────────────────────────┘
```

Print styles in `globals.css` hide `.no-print` elements (toolbar, sidebar).

### 4.3 Bare (no shell)

`/brand-preview` — raw `div` with inline styles, logo matrix only.

---

## 5. Route Catalog

### 5.1 `/` — Home (dual mode)

**Source:** [`app/page.tsx`](../app/page.tsx)

| Condition | Renders | Footer |
|-----------|---------|--------|
| Auth configured + logged out | `LandingPage` | yes |
| Logged in OR auth disabled | `HomeApp` | yes |

![Landing (logged out)](svg/01-home-landing.svg)  
![App home (logged in)](svg/02-home-app.svg)

#### LandingPage (marketing)

Vertical centered sections inside PageShell:

1. **Hero** — aurora + `.bg-grid` · Preview badge · gradient H1 · CTA pair (signup primary, login secondary)
2. **Product preview** — faux browser chrome wrapping live `ScoreRadar` sample
3. **Trust strip** — full-bleed `-mx-5` · marquee of 6 agent avatars
4. **Agents** — eyebrow + 2-col card grid (6 agents, severity weight bars)
5. **How it works** — centered H2 · 3-col step cards with connecting line
6. **Modes** — 2-col link cards (Heatmap, Branches live; Boardroom, Pre-mortem preview)
7. **Capabilities** — 2-col editorial list with numbered rows
8. **Localization** — 2-col callout (copy + Banglish sample cards)
9. **Final CTA** — centered card with signup/login

#### HomeApp (simulation)

1. **Hero grid** — `lg:grid-cols-[1.15fr_440px] xl:[1.15fr_480px]`
   - Left: v0.1 badge · H1 · description · status badges · CTAs · ⌘K hint
   - Right: `#simulate` sticky `UploadForm` (`lg:sticky lg:top-24`)
2. **Trust strip** — same marquee as landing
3. **How it works** — 3-col steps
4. **Metrics preview** — `lg:grid-cols-[1fr_1.2fr]` · copy + 2×3 score grid mock
5. **Modes** — 2-col cards
6. **Final CTA** — centered text + buttons

**UploadForm** ([`components/upload-form.tsx`](../components/upload-form.tsx)):

- Card with header icon + Live/Demo badge
- Fields: brand select → slogan → brand values → optional divider → brief → image
- Full-width submit · streams SSE verdicts inline · redirects to `/runs/[id]`
- Progress bar on top edge while loading

---

### 5.2 `/runs/[id]` — Run results

**Source:** [`app/runs/[id]/page.tsx`](../app/runs/[id]/page.tsx) → [`components/run-page-client.tsx`](../components/run-page-client.tsx)

![Run results](svg/03-run-results.svg)

`footer={false}` · vertical stack `mb-12` / `mb-16` between sections:

| # | Section | Layout | Components |
|---|---------|--------|------------|
| 1 | Hero summary | `md:grid-cols-[1.4fr_1fr]` rounded-3xl card | Badge, slogan, values, action buttons · 64px Backfire score + verdict badge |
| 2 | Dashboard | SectionHeader + full width | `ScoreRadar` then `ScoreDashboard` (6 metric cards) |
| 3 | Verdicts | Stacked list | Optional demo warning banner · `AgentVerdictCard` × 6 (expandable) |
| 4 | Polarization | Full width | `PolarizationGraph` network |
| 5 | Stress map | Header row + compact map | `CulturalHeatmap compact` · link to `/heatmap?runId=` |
| 6 | Memes | Full width | `MemeGrid` |

**States:** shimmer skeleton while loading · centered error with "New simulation" CTA.

---

### 5.3 `/history` — Simulation archive

**Source:** [`app/history/page.tsx`](../app/history/page.tsx)

![History](svg/04-history.svg)

| Block | Spec |
|-------|------|
| Header | `PageHero` + primary "New simulation" button (flex wrap) |
| Stats | `sm:grid-cols-3` StatCards (total, avg backfire, high-risk) |
| Search | Full-width `Input` filter by slogan |
| List | `space-y-3` RunRow cards: score ring · metadata · badges · delete |
| Empty | Dashed border centered CTA |
| Loading | 4× shimmer rows |

---

### 5.4 `/heatmap` — Cultural stress map

**Source:** [`app/heatmap/page.tsx`](../app/heatmap/page.tsx)

![Heatmap](svg/05-heatmap.svg)

| State | Component |
|-------|-----------|
| Logged out (auth on) | `HeatmapAd` — animated self-playing map + sign-in CTAs |
| Logged in / no auth | `HeatmapPageClient` |

**Live layout** (`HeatmapPageClient`):

1. `SectionHeader` (i18n eyebrow + title)
2. Run `Select` picker (`max-w-lg`)
3. Loading shimmer OR empty state OR full `CulturalHeatmap`:
   - `WorldStressMap` SVG overlay
   - Macro region tabs (South Asia, MENA, SEA)
   - Market cards with severity rings, tripwire detail panel

Supports `?runId=` query param for deep links from run page.

---

### 5.5 `/branches` — Counterfactual branching

**Source:** [`app/branches/page.tsx`](../app/branches/page.tsx)

![Branches](svg/06-branches.svg)

| State | Component |
|-------|-----------|
| Logged out | `BranchesAd` — animated tree demo loop |
| Logged in | `CounterfactualBranches` in PageShell |

**Live layout** (`CounterfactualBranches`):

1. **Header** — campaign stats, selected branch scores vs parent
2. **CampaignPicker** — select campaign (when multiple)
3. **Main split** — `lg:grid-cols-[1.35fr_1fr]`
   - `TreeCanvas` — SVG node tree, top-down layout
   - `Inspector` — 3-col score grid, editable fields, fork/reset/delete, AI score panel
4. **Footer row** — `lg:grid-cols-[1fr_1.2fr]`
   - `DiffPanel` — parent vs branch diff
   - `ActivityLog` — commit-style event log

---

### 5.6 `/boardroom` — Multi-agent debate

**Source:** [`app/boardroom/page.tsx`](../app/boardroom/page.tsx)

![Boardroom](svg/07-boardroom.svg)

| State | Component |
|-------|-----------|
| Logged out | `BoardroomAd` |
| Logged in | `BoardroomMode` |

**Live layout** (`BoardroomMode`):

1. `SectionHeader`
2. Controls row: `RunPicker` · `SloganVariantPicker` (when branches exist) · "Convene" CTA
3. Empty state when no run selected
4. Debate grid: `lg:grid-cols-[17rem_1fr]` · `xl:grid-cols-[17rem_1fr_20rem]`
   - **Left** — `CampaignBriefPanel` (slogan on trial, values, image, cross-exam highlight)
   - **Center** — info banner · `PersonaRoster` · scrollable chat thread (left critics, right Brand Manager)
   - **Right (xl+)** — `DecisionPanel` (greenlight/revise/kill synthesis)

SSE streaming from `POST /api/boardroom` · 1100ms turn delay between personas.

---

### 5.7 `/post-mortem` — Regulatory pre-mortem

**Source:** [`app/post-mortem/page.tsx`](../app/post-mortem/page.tsx)

![Post-mortem](svg/08-post-mortem.svg)

`PlaceholderFeature` — `max-w-4xl` centered card:

- `md:grid-cols-[1.2fr_1fr]` — copy (coming soon badge, bullets, CTAs) + skeleton preview mock
- Status: **preview / coming soon** (not live)

---

### 5.8 `/login` & `/signup` — Authentication

**Sources:** [`app/login/page.tsx`](../app/login/page.tsx), [`app/signup/page.tsx`](../app/signup/page.tsx)

![Auth](svg/09-auth.svg)

Shared centered card pattern:

- `PageShell footer={false}`
- `max-w-md mx-auto min-h-[72vh] flex-col justify-center`
- Aurora blur behind card
- `rounded-3xl` glass card: `LogoBadge xl glow` → title → form
- Login: email + password + error + submit + signup link
- Signup: same + success message + redirect hint
- Footer terms note (login only)

---

### 5.9 `/brands` — Brand management

**Source:** [`app/brands/page.tsx`](../app/brands/page.tsx)

![Brands](svg/10-brands.svg)

1. Header: `PageHero` + "New simulation" + "Create brand" toggle
2. Inline create form (when open): name, description, stated values
3. Brand list rows: name, id snippet, description, values clamp, delete
4. Empty / loading / error states

Brands anchor the Brand Purist agent; values auto-fill in UploadForm.

---

### 5.10 `/docs` — Documentation & pitch deck

**Source:** [`app/docs/page.tsx`](../app/docs/page.tsx)

| State | Layout |
|-------|--------|
| Access denied | PageShell + `NotAvailable` centered gate |
| Allowed | `DocsExperience` (custom chrome) |

![Docs experience](svg/11-docs-experience.svg)  
![Docs gated & admin](svg/12-docs-gated-admin.svg)

**NotAvailable gate:** Logo · 403 badge · reason-specific title · publishing window card with countdown · back/login CTAs

**DocsExperience sections** (scroll-spy sidebar):

- Pitch deck nav group
- Technical nav group
- Per-section: eyebrow, H2, description, `BlockRenderer` blocks
- Special embeds: `TeamGrid`, `FeatureMatrix`, `FlowDiagram` (architecture + dataflow Mermaid)

Toolbar actions: print/PDF, export Markdown, share link, admin link (if admin).

Preview mode shows yellow warning banner when accessed via token but not public.

---

### 5.11 `/docs/admin` — Docs control panel

**Source:** [`app/docs/admin/page.tsx`](../app/docs/admin/page.tsx)

| State | UI |
|-------|-----|
| Non-admin | Centered 403 · sign in + back to docs |
| Admin | PageShell header + `DocsAdminPanel` (visibility, schedule, team roster) |

---

### 5.12 `/brand-preview` — Logo dev matrix

**Source:** [`app/brand-preview/page.tsx`](../app/brand-preview/page.tsx)

![Brand preview](svg/13-brand-preview.svg)

No PageShell. Three inline-styled sections:

1. **Dark** — Logo sizes, LogoBadge grid, tile/ring variants, LogoMark monochrome
2. **Light** (`#fafafa`) — badge variants on light bg
3. **Favicon scale** — md vs 16×16 xs check

Internal dev/reference page only.

---

## 6. Component Cross-Reference

| Component | File | Used on |
|-----------|------|---------|
| `UploadForm` | `components/upload-form.tsx` | `/` (HomeApp) |
| `ScoreRadar` | `components/score-radar.tsx` | `/`, `/runs/[id]`, landing preview |
| `ScoreDashboard` | `components/score-dashboard.tsx` | `/runs/[id]` |
| `AgentVerdictCard` | `components/agent-verdict-card.tsx` | `/runs/[id]`, UploadForm stream |
| `PolarizationGraph` | `components/polarization-graph.tsx` | `/runs/[id]` |
| `CulturalHeatmap` | `components/cultural-heatmap.tsx` | `/runs/[id]` compact, `/heatmap` full |
| `WorldStressMap` | `components/world-stress-map.tsx` | Inside CulturalHeatmap |
| `MemeGrid` | `components/meme-grid.tsx` | `/runs/[id]` |
| `CounterfactualBranches` | `components/counterfactual-branches.tsx` | `/branches` |
| `BoardroomMode` | `components/boardroom-mode.tsx` | `/boardroom` |
| `PlaceholderFeature` | `components/placeholder-feature.tsx` | `/post-mortem` |
| `HeatmapAd` | `components/heatmap-ad.tsx` | `/heatmap` gate |
| `BranchesAd` | `components/branches-ad.tsx` | `/branches` gate |
| `BoardroomAd` | `components/boardroom-ad.tsx` | `/boardroom` gate |
| `DocsExperience` | `components/docs/docs-experience.tsx` | `/docs` |
| `NotAvailable` | `components/docs/not-available.tsx` | `/docs` gate |
| `DocsAdminPanel` | `components/docs/admin-panel.tsx` | `/docs/admin` |
| `Logo` / `LogoBadge` | `components/logo.tsx` | Header, auth, docs, brand-preview |
| `LanguageProvider` | `components/language-provider.tsx` | Global i18n EN/BN |

---

## 7. Responsive Matrix

Tailwind breakpoints: `sm` 640px · `md` 768px · `lg` 1024px · `xl` 1280px

| Surface | Mobile (< lg) | Desktop (lg+) |
|---------|---------------|---------------|
| SiteHeader nav | Hamburger drawer | Pill nav + EN/BN |
| Home hero | Stacked copy then form | 2-col grid, sticky form |
| Run hero | Stacked score below copy | 1.4fr / 1fr side by side |
| ScoreDashboard | 2-col grid | 3-col grid |
| Branches | Stacked tree then inspector | 1.35fr / 1fr |
| Boardroom | 2-col (brief below chat) | 3-col with decision panel at xl |
| Docs sidebar | Hidden → section Select | 230px sticky sidebar |
| History stats | 1-col | 3-col |
| Landing agents | 1-col | 2-col |
| Landing steps | 1-col | 3-col with connector line |

**Page padding scales:** `px-5` → `md:px-8` → `lg:px-12`  
**Vertical section rhythm:** `mb-28 md:mb-36` on marketing sections

---

## 8. Auth & Gating Map

| Route | Gate condition | Logged-out behavior |
|-------|----------------|---------------------|
| `/` | None | Shows `LandingPage` instead of `HomeApp` when auth configured |
| `/heatmap` | Member surface | `HeatmapAd` sign-in wall |
| `/branches` | Member surface | `BranchesAd` sign-in wall |
| `/boardroom` | Member surface | `BoardroomAd` sign-in wall |
| `/docs` | Schedule + visibility config | `NotAvailable` or preview token |
| `/docs/admin` | Admin email list | 403 centered gate |
| `/history`, `/runs/[id]`, `/brands` | API-level (campaigns/brands) | May show empty/error if unauthenticated |
| `/login`, `/signup` | — | Always accessible |
| `/brand-preview` | — | Always accessible (dev) |

When Supabase auth is **not configured** (local demo), member surfaces remain open and `/` always shows `HomeApp`.

---

## 9. SVG Index

| File | Route / subject |
|------|-----------------|
| [`svg/00-shared-chrome.svg`](svg/00-shared-chrome.svg) | PageShell anatomy |
| [`svg/01-home-landing.svg`](svg/01-home-landing.svg) | `/` logged out |
| [`svg/02-home-app.svg`](svg/02-home-app.svg) | `/` logged in |
| [`svg/03-run-results.svg`](svg/03-run-results.svg) | `/runs/[id]` |
| [`svg/04-history.svg`](svg/04-history.svg) | `/history` |
| [`svg/05-heatmap.svg`](svg/05-heatmap.svg) | `/heatmap` live + ad |
| [`svg/06-branches.svg`](svg/06-branches.svg) | `/branches` live + ad |
| [`svg/07-boardroom.svg`](svg/07-boardroom.svg) | `/boardroom` live + ad |
| [`svg/08-post-mortem.svg`](svg/08-post-mortem.svg) | `/post-mortem` |
| [`svg/09-auth.svg`](svg/09-auth.svg) | `/login` & `/signup` |
| [`svg/10-brands.svg`](svg/10-brands.svg) | `/brands` |
| [`svg/11-docs-experience.svg`](svg/11-docs-experience.svg) | `/docs` allowed |
| [`svg/12-docs-gated-admin.svg`](svg/12-docs-gated-admin.svg) | `/docs` gated + `/docs/admin` |
| [`svg/13-brand-preview.svg`](svg/13-brand-preview.svg) | `/brand-preview` |

---

## Appendix: File map

```
GUI-upgrade/
├── GUI.md                 ← this document
└── svg/
    ├── 00-shared-chrome.svg
    ├── 01-home-landing.svg
    ├── 02-home-app.svg
    ├── 03-run-results.svg
    ├── 04-history.svg
    ├── 05-heatmap.svg
    ├── 06-branches.svg
    ├── 07-boardroom.svg
    ├── 08-post-mortem.svg
    ├── 09-auth.svg
    ├── 10-brands.svg
    ├── 11-docs-experience.svg
    ├── 12-docs-gated-admin.svg
    └── 13-brand-preview.svg
```

Source references: [`app/`](../app/), [`components/`](../components/), [`app/globals.css`](../app/globals.css)
