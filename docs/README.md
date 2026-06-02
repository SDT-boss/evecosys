# EVEcosys — Documentation Index

This folder holds design decisions, architecture records, and product direction notes. It is one of three parallel workstreams in this monorepo.

---

## The three workstreams

| Workstream | Root path | What lives here |
|---|---|---|
| **App** | `app/` + `components/` | Running Next.js application — pages, API routes, and role-specific UI components |
| **Design System** | `design-system/` | Shared visual language — design tokens, primitive components, and Storybook stories |
| **Docs** | `docs/` | This folder — ADRs, product decisions, and architecture notes |

These workstreams evolve in parallel. The app consumes the design system. Both are informed by decisions recorded here.

---

## Design system pipeline

```
Claude Design (visual exploration & prototyping)
        │
        ▼
  DESIGN.md  ←  canonical human record of every decision (lives at repo root)
        │
        ▼
  design-system/tokens/tokens.json  ←  machine-readable source (same values)
        │
        ▼  Style Dictionary  (runs on every merge to main via CI)
        ├── tokens/variables.css   →  imported by Storybook + Next.js app
        └── tokens/tokens.js       →  imported wherever JS needs token values
```

**Token naming:** all CSS custom properties use the `--ds-*` prefix (e.g. `--ds-color-brand-primary`). Nothing in the app may hardcode a colour, spacing, or radius value — only `var(--ds-*)` tokens are allowed.

**Component graduation rule:** when a UI pattern appears in two or more unrelated places in the app, it moves from `app/components/` into `design-system/components/`, gets a Storybook story, and the app imports it from `@evecosys/design-system`.

---

## What belongs here

- **Architecture Decision Records (ADRs)** — numbered documents capturing why a significant technical choice was made. Format: `adr/NNN-short-title.md`.
- **Product direction notes** — role definitions, feature scoping, access-model decisions that should outlive any single PR.
- **Design system rationale** — decisions not already captured in `DESIGN.md` (that file covers tokens and component rules; this folder covers deeper architectural reasoning).

## What does not belong here

- Setup / how-to guides → root `README.md`
- Test plans → alongside code in `test/` or `e2e/`
- Sprint backlogs or task lists → Linear

---

## Contents

| File | What it covers |
|---|---|
| `WEEK2_BACKLOG.md` | Early backlog notes from week 2 of the project |

Add new documents here and update this table as the folder grows.
