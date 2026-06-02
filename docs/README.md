# EVEcosys — Documentation Index

This folder holds design decisions, architecture records, and product direction notes. It is one of three parallel workstreams in this monorepo.

---

## The three workstreams

| Workstream | Root path | What lives here |
|---|---|---|
| **App** | `app/` + `components/` | Running Next.js application — pages, API routes, and role-specific UI components |
| **Design System** | `design-system/` | Shared visual language — design tokens, primitive components, and Storybook stories |
| **Docs** | `docs/` | This folder — ADRs, product decisions, and architecture notes |

These workstreams are designed to evolve in parallel. The app consumes the design system; both are informed by docs decisions.

---

## What belongs here

- **Architecture Decision Records (ADRs)** — numbered documents capturing why a significant technical choice was made (not just what was chosen). Use the format `adr/NNN-short-title.md`.
- **Product direction notes** — role definitions, feature scoping, and access-model decisions that should outlive any single PR.
- **Design system spec** — token rationale, component API contracts, and accessibility guidelines before they are encoded in code.

## What does not belong here

- Runbook / how-to setup guides → those live in the root `README.md`
- Test plans → those live alongside the code in `test/` or `e2e/`
- Sprint backlogs or task lists → those live in Linear

---

## Contents

| File | What it covers |
|---|---|
| `DESIGN.md` | All notes for the project's design system |

Add new documents here and update this table as the folder grows.
