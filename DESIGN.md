# EVEcosys Design System — Visual Source of Truth

This file is the canonical record of every design decision made in Claude Design. Anything committed here is the approved visual language for the product. When a decision changes, update this file and `design-system/tokens/tokens.json` together in the same commit.

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
        ▼  Style Dictionary (runs on every merge to main via CI)
        ├── dist/tokens/variables.css   ← CSS custom properties  ──► Storybook + Next.js app
        └── dist/tokens/tokens.js       ← ES6 token constants   ──► anywhere JS needs token values
```

**The contract**: The Next.js app is only allowed to use `var(--ds-*)` tokens and components from `/design-system/components`. No inline `style={{ color: '#333' }}`. No hardcoded Tailwind hex values. If a new UI pattern appears more than once in the app, it graduates into the design system — gets a story in Storybook, and the app imports it from there.

---

## Colour

### Brand palette

| Token | Value | Use |
|---|---|---|
| `--ds-color-brand-primary` | `#0F6FFF` | Primary actions, links, focus rings — the electric-blue that anchors the product |
| `--ds-color-brand-primary-hover` | `#0A5AD4` | Hover / active state for primary actions (~10% darker) |
| `--ds-color-brand-secondary` | `#10B981` | Confirmations, completed states, EV-positive indicators (battery full, trip complete) |
| `--ds-color-brand-secondary-hover` | `#059669` | Hover / active state for secondary actions |

**Decision:** Electric blue was chosen over green as the primary because green is already used semantically for positive/success states. Blue reads as "action" without competing with status colour.

### Neutral scale

| Token | Value | Use |
|---|---|---|
| `--ds-color-neutral-50` | `#F9FAFB` | Page backgrounds |
| `--ds-color-neutral-100` | `#F3F4F6` | Card and panel surfaces |
| `--ds-color-neutral-200` | `#E5E7EB` | Borders, dividers |
| `--ds-color-neutral-300` | `#D1D5DB` | Disabled borders |
| `--ds-color-neutral-400` | `#9CA3AF` | Placeholder text |
| `--ds-color-neutral-500` | `#6B7280` | Secondary text, captions |
| `--ds-color-neutral-600` | `#4B5563` | Body text on light backgrounds |
| `--ds-color-neutral-700` | `#374151` | Strong body text |
| `--ds-color-neutral-800` | `#1F2937` | Headings |
| `--ds-color-neutral-900` | `#111827` | Maximum contrast text |

### Status colours

| Token | Value | Use |
|---|---|---|
| `--ds-color-status-success` | `#10B981` | Battery healthy, trip complete, user active |
| `--ds-color-status-warning` | `#F59E0B` | Battery low, maintenance due |
| `--ds-color-status-error` | `#EF4444` | Geofence breach, vehicle offline, failed action |
| `--ds-color-status-info` | `#3B82F6` | Informational banners, help text |

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
