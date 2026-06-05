# EVEcosys Design System — Pipeline & Token Reference

> **Full design system documentation** — components, utilisation rules, security protocols, and test coverage — lives in [`docs/DESIGN.md`](docs/DESIGN.md).
>
> This file documents the token pipeline and serves as a quick-reference for all current token values.

This file and `design-system/tokens/tokens.json` must always be updated together in the same commit. `tokens.json` is the machine-readable source; this file is the human record. CI regenerates `variables.css` and `tokens.js` automatically on every merge to main.

---

## Pipeline overview

```
Claude Design (explore & prototype)
        │
        ▼
  DESIGN.md  ◄── you are here (human-readable canonical record)
        │
        ▼
 design-system/tokens/tokens.json  (machine-readable source — same values as above)
        │
        ▼  Style Dictionary  ─── run locally: make tokens
        ├── dist/tokens/variables.css   ← CSS custom properties  ──► Storybook + Next.js app
        └── dist/tokens/tokens.js       ← ES6 token constants   ──► anywhere JS needs token values
```

**Token drift check**: Every PR runs a CI job (`Design tokens`) that rebuilds the token output and checks `git diff`. If `tokens.json` was edited without committing the generated CSS/JS output, the PR fails. Always run `make tokens` and commit the result in the same commit as any `tokens.json` change.

**The contract**: The Next.js app is only allowed to use `var(--ds-*)` tokens and components from `/design-system/components`. No inline `style={{ color: '#333' }}`. No hardcoded Tailwind hex values. If a new UI pattern appears more than once in the app, it graduates into the design system — gets a story in Storybook, and the app imports it from there.

---

## Viewing the token reference

A visual, browser-ready reference of every token lives at:

```
public/design-tokens.html
```

Open it locally with:

```bash
open public/design-tokens.html
```

Or, when the dev server is running, navigate to:

```
http://localhost:3000/design-tokens.html
```

The page renders all 55 tokens with live swatches, spacing bars, type scale samples, radius previews, shadow cards, and animated motion examples — all driven directly by the `dist/tokens/variables.css` custom properties. No build step is needed to view it; regenerate the underlying tokens with `npm run build:tokens` whenever `tokens.json` changes.

---

## Storybook — component stories

Storybook is the interactive catalogue for every design-system component and product composition. It runs `dist/tokens/variables.css` automatically so all `--ds-*` tokens resolve exactly as they do in the app.

```bash
npm run storybook   # opens http://localhost:6006
```

### Story structure

Stories live in `design-system/stories/`. They are grouped into three Storybook sections:

**Foundations** — token-level documentation (no component dependency)

| Story | Covers |
|---|---|
| `Typography` | Font families, size scale (xs → 3xl), weight scale, line-height scale, real-world page hierarchy |

**Primitives** — atomic shadcn/ui base components seeded with `--ds-*` tokens

| Story | Covers |
|---|---|
| `Button` | All 6 variants (default/secondary/outline/ghost/destructive/link), 4 sizes, with-icon, loading, disabled, icon-only |
| `Input` | Default, filled, disabled, error (`aria-invalid`), with FormField, all input types |
| `Card` | Sub-component anatomy, vehicle summary card, content-only, 3-column grid |
| `Badge` | All 5 variants, vehicle-status semantic mapping, inline-with-text usage |

**Compositions** — EVEcosys-specific molecules and organisms built from primitives

| Story | Covers |
|---|---|
| `StatCard` | All 3 trend directions, with/without icon, 4-column dashboard KPI grid |
| `OnboardingCard` | Manager 3-step flow, completion state, without step indicator, minimal |
| `DashboardShell` | Manager overview (full shell mock), sidebar nav isolation, empty/first-run state |

### Graduation rule — when to add a story

A component gets a story when it meets any of these criteria:

1. It is used in 2+ unrelated places in the app (graduation candidate)
2. It needs visual sign-off before shipping a new variant or state
3. It encodes a reusable product pattern (e.g. DashboardShell, OnboardingCard) that designers and engineers should be able to review without running the full app

### Story conventions

- Use **CSF3 format** (`Meta<typeof Component>` + named `StoryObj` exports)
- Tag with `"autodocs"` for auto-generated docs pages
- One story per distinct state or use-case
- Name stories after what the user sees (`"Error state"`, `"With leading icon"`), not the prop value (`"aria-invalid-true"`)
- Compositions that require auth or routing: create a static mock annotated with a doc comment explaining the production difference

---

## Colour

### Brand palette

| Token | Value | Name | Use |
|---|---|---|---|
| `--ds-color-brand-primary` | `#008684` | Cyber Jade | Navigation, links, focus rings — the structural anchor of the product |
| `--ds-color-brand-primary-strong` | `#007069` | Cyber Jade Strong | Solid fills with white labels (WCAG AA ≈ 5.9:1) |
| `--ds-color-brand-secondary` | `#96D02C` | Volt Green | Primary CTA, success states — always with ink (`#0B0F0E`) labels (contrast ≈ 10.9:1) |
| `--ds-color-brand-secondary-strong` | `#557A12` | Volt Green Strong | CTA hover state; Volt Green as foreground text on light surfaces (WCAG AA) |
| `--ds-color-brand-tertiary` | `#7C3AED` | Grid Violet | Secondary interactive states, data-viz third series (WCAG AA ≈ 5.7:1) |
| `--ds-color-brand-tertiary-strong` | `#5B21B6` | Grid Violet Strong | Violet foreground text on light surfaces (WCAG AAA ≈ 9.0:1) |

### Neutral scale

| Token | Value | Use |
|---|---|---|
| `--ds-color-neutral-black` | `#000000` | Brand Black — wordmark, max-weight iconography only |
| `--ds-color-neutral-ink` | `#0B0F0E` | All body text and headings (near-black with cool cast) |
| `--ds-color-neutral-grey-80` | `#1C2120` | Secondary headings, strong secondary text |
| `--ds-color-neutral-grey-60` | `#4A5250` | Subdued body copy, captions, disabled labels |
| `--ds-color-neutral-grey-40` | `#8A9290` | Placeholder text, decorative icon fills |
| `--ds-color-neutral-grey-20` | `#C4CBCA` | Borders, dividers, inactive states |
| `--ds-color-neutral-grey-10` | `#E6EAEA` | Hover backgrounds, disabled fills |
| `--ds-color-neutral-grey-05` | `#F3F5F5` | Page backgrounds, card fills |

### Status colours

| Token | Value | Use |
|---|---|---|
| `--ds-color-status-success` | `#96D02C` | Battery healthy, trip complete, user active — matches Volt Green |
| `--ds-color-status-warning` | `#F59E0B` | Battery low, maintenance due |
| `--ds-color-status-error` | `#EF4444` | Geofence breach, vehicle offline, failed action |
| `--ds-color-status-info` | `#7C3AED` | Informational banners, help text — matches Grid Violet |

---

## Spacing

A base-4 scale. All spacing in the app must use these tokens.

| Token | Value | Common use |
|---|---|---|
| `--ds-space-none` | `0px` | Reset / explicit zero |
| `--ds-space-xs` | `4px` | Icon padding, tight inline gaps |
| `--ds-space-sm` | `8px` | Between label and input, between related items |
| `--ds-space-md` | `16px` | Card padding, section gaps (default spacing unit) |
| `--ds-space-lg` | `24px` | Between cards, larger section padding |
| `--ds-space-xl` | `32px` | Between major sections |
| `--ds-space-2xl` | `48px` | Page-level vertical rhythm |
| `--ds-space-3xl` | `64px` | Hero and full-bleed section spacing |

---

## Typography

**Font family:** Inter (sans-serif) for all UI text. JetBrains Mono for code, IDs, and data values that benefit from fixed-width rendering.

| Token | Value |
|---|---|
| `--ds-font-family-sans` | `Inter, ui-sans-serif, system-ui, sans-serif` |
| `--ds-font-family-mono` | `'JetBrains Mono', ui-monospace, monospace` |

### Size scale

| Token | Value | Use |
|---|---|---|
| `--ds-font-size-xs` | `0.75rem` | Labels, badges, timestamps |
| `--ds-font-size-sm` | `0.875rem` | Secondary body, table cells |
| `--ds-font-size-base` | `1rem` | Primary body text |
| `--ds-font-size-lg` | `1.125rem` | Subheadings, card titles |
| `--ds-font-size-xl` | `1.25rem` | Section headings |
| `--ds-font-size-2xl` | `1.5rem` | Page headings |
| `--ds-font-size-3xl` | `1.875rem` | Dashboard KPI figures |

### Weight and line-height

| Token | Value |
|---|---|
| `--ds-font-weight-normal` | `400` |
| `--ds-font-weight-medium` | `500` |
| `--ds-font-weight-semibold` | `600` |
| `--ds-font-weight-bold` | `700` |
| `--ds-font-line-height-tight` | `1.25` |
| `--ds-font-line-height-snug` | `1.375` |
| `--ds-font-line-height-normal` | `1.5` |
| `--ds-font-line-height-relaxed` | `1.625` |

---

## Border radius

| Token | Value | Use |
|---|---|---|
| `--ds-radius-none` | `0px` | Tables, full-bleed panels |
| `--ds-radius-sm` | `4px` | Badges, tags |
| `--ds-radius-md` | `8px` | Inputs, buttons |
| `--ds-radius-lg` | `16px` | Cards, modals, sheets |
| `--ds-radius-full` | `9999px` | Pills, avatar rings |

---

## Shadows

| Token | Value | Use |
|---|---|---|
| `--ds-shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle card lift |
| `--ds-shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Dropdowns, popovers |
| `--ds-shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Modals |

---

## Component graduation rule

Components live in `app/components/` until they qualify to move into `design-system/components/`. A component qualifies when:

1. It is used in two or more unrelated places in the app, **or**
2. It is part of the core visual language (button, input, badge, card) and needs a Storybook story for design review.

When a component graduates:
- Move it to `design-system/components/`
- Write a Storybook story covering all variants
- Update the app import path to `@evecosys/design-system`
- The app must only reference `var(--ds-*)` tokens inside it — no hardcoded values

---

## shadcn/ui seeding

When initialising a new shadcn/ui component, override its default CSS variables with the `--ds-*` tokens above before committing. Do not leave shadcn defaults in place — they create a second token layer that competes with this one.
