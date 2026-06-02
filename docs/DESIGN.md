---
name: EVEcosys Design System
version: 1.0.0

colors:
  primary:
    name: Cyber Jade
    hex: "#008684"
    on: white
  primary-strong:
    name: Cyber Jade Strong
    hex: "#007069"
    on: white
    note: "Use for solid fills with white labels — passes WCAG AA (≈ 5.9:1)"
  secondary:
    name: Volt Green
    hex: "#96D02C"
    on: ink
    note: "Always paired with ink (#0B0F0E) labels on solid fills — contrast ≈ 10.9:1"
  secondary-strong:
    name: Volt Green Strong
    hex: "#557A12"
    on: white
    note: "Use when Volt Green must appear as foreground text on light surfaces — passes WCAG AA"
  tertiary:
    name: Grid Violet
    hex: "#7C3AED"
    on: white
    note: "Passes WCAG AA on white (≈ 5.7:1) — suitable for links, accents, and interactive elements"
  tertiary-strong:
    name: Grid Violet Strong
    hex: "#5B21B6"
    on: white
    note: "Passes WCAG AAA on white (≈ 9.0:1) — use for body-size foreground text on light surfaces"
  neutral:
    brand-black:
      hex: "#000000"
      use: Wordmark, max-weight iconography, high-contrast chrome
    ink:
      hex: "#0B0F0E"
      use: Body text, headings, primary content — near-black with a cool cast
    grey-80:
      hex: "#1C2120"
      use: Secondary headings, strong secondary text
    grey-60:
      hex: "#4A5250"
      use: Subdued body copy, captions, disabled labels
    grey-40:
      hex: "#8A9290"
      use: Placeholder text, decorative icon fills
    grey-20:
      hex: "#C4CBCA"
      use: Borders, dividers, inactive states
    grey-10:
      hex: "#E6EAEA"
      use: Subtle surface tints, hover backgrounds on white
    grey-05:
      hex: "#F3F5F5"
      use: Page backgrounds, card fills

typography:
  h1:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  h2:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h3:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  h4:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  body-sm:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"

spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "64px"

rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"

motion:
  duration-fast: "100ms"
  duration-base: "200ms"
  duration-slow: "400ms"
  easing-standard: "cubic-bezier(0.4, 0, 0.2, 1)"
---

## Overview

EVEcosys reads as premium energy infrastructure — confident enough to anchor a fleet manager's daily workflow, credible enough to earn trust from executives reviewing cross-fleet KPIs. The palette is high-voltage but restrained: Cyber Jade grounds the UI in structure and calm authority; Volt Green fires once per screen as the signature action signal. The system is built to age well — no gradients that trend, no motion that bounces, no surface effects that date. Bold geometry, generous white space, and tight semantic colour roles do the heavy lifting and stay coherent over a two-plus-year product lifecycle.

---

## Colors

### Brand anchor

- **Cyber Jade `#008684` (`primary`)** — the structural colour of the product. Used for primary navigation surfaces, active sidebar states, links, and focus rings. It reads as deep teal: premium, technological, and calm under pressure. Do not use for body text on white (use `primary-strong` for that).
- **Cyber Jade Strong `#007069` (`primary-strong`)** — a 15% deeper shade that passes WCAG AA (≈ 5.9:1) against white. Use this for any solid Jade fill that carries a white label — pill backgrounds, badge fills, active chip states.

### Signature accent

- **Volt Green `#96D02C` (`secondary`)** — the energy pop. High-voltage yellow-green that signals action, completion, and live data. Used for the primary CTA button, active/selected data-viz series, and success states. Always paired with ink (`#0B0F0E`) as the label colour — contrast ≈ 10.9:1. Use it sparingly: one dominant CTA per view, one accent bar in a chart. When it appears everywhere, it disappears.
- **Volt Green Strong `#557A12` (`secondary-strong`)** — the foreground-safe variant. Use only when Volt Green must appear as text itself on a light surface (e.g. a status label reading "Charging Active" in green). Passes WCAG AA on white.

### Accent depth

- **Grid Violet `#7C3AED` (`tertiary`)** — electric violet for secondary interactive states, data-visualisation third series, and in-body hyperlinks where Jade would compete with navigation chrome. Sits opposite Jade on the hue wheel (teal vs. violet) so the two never fight. Contrast ≈ 5.7:1 on white — passes WCAG AA for all text sizes. Does not overlap with amber (warning) or red (error), so it is safe as a semantic accent.
- **Grid Violet Strong `#5B21B6` (`tertiary-strong`)** — deeper violet for foreground text use on light surfaces. Contrast ≈ 9.0:1 on white — passes WCAG AAA. Use for status labels or inline text that must be violet.

### Neutrals

- **Brand Black `#000000`** — wordmark, maximum-weight iconography, and hard-ruled UI chrome. Not used for body text (too harsh at reading sizes).
- **Ink `#0B0F0E`** — near-black with a subtle cool cast. All body text, all headings in the product UI. The slight tint pulls the neutrals into the same temperature as Jade.
- **Grey ramp (80 → 05)** — a cool-grey scale for secondary text (`grey-60`), borders (`grey-20`), hover tints (`grey-10`), and page backgrounds (`grey-05`). The cool temperature keeps every surface in the same family as Jade and avoids the warm-beige drift common in neutral palettes.

### Rules

1. Jade and Volt Green never appear as solid fills adjacent to each other — the combination is too loud and loses hierarchy.
2. No soft pastels, no tinted surface overlays, no colour-on-colour gradients. Colour is used in full-saturation accents against neutral grounds.
3. Status colours borrow from the palette: success = Volt Green, error = a reserved system red (token TBD), warning = amber, info = Grid Violet.

---

## Typography

**Geist** (primary, preferred) is a geometric grotesque with slightly rounded terminals — it reads as modern and technological without being cold. The geometry matches the EVEcosys wordmark energy. **Inter** is the functional fallback: near-identical metrics, available everywhere, and highly legible at small sizes on screen.

No serif faces. No display-only weights at body size. Monospaced text (data IDs, code snippets, vehicle plate numbers) uses the system monospace stack and is not part of the brand type ramp.

**Scale rationale:** h1 at 3rem (48px) is intentionally large — dashboard KPI callouts and marketing surfaces need room to breathe and command attention. h3 and h4 at 1.5rem / 1.25rem hold card and section titles without competing with page headings. body-md at 1rem / 1.6 line-height is optimised for dense table and form content. The label style adds tracked-out caps (`letter-spacing: 0.04em`) at 12px to keep it legible and organised — use it for form field labels, column headers, and badge text only.

Negative letter-spacing on headings (`-0.03em` down to `-0.01em`) tightens geometric letterforms at large sizes, giving headlines the set-tight quality of editorial design without requiring a separate display font.

---

## Spacing

Base unit is **8px**. All layout spacing is a multiple of 8: `sm` (8), `md` (16), `lg` (32), `xl` (64). This aligns with a 4-column / 8-column grid and produces harmonious rhythm across cards, section gaps, and page margins without needing arbitrary in-between values.

Use `sm` for tight intra-component gaps (icon-to-label, chip padding). Use `md` as the default component padding and the gap between related elements. Use `lg` between sections on a page. Use `xl` for hero areas and full-bleed page sections.

4px steps are available for micro-adjustments within components (icon padding, badge internal spacing) but should not appear in layout code — if you find yourself reaching for 4px in a layout, something in the component needs fixing.

---

## Components

### Button

Buttons come in four variants. Height is 40px for default, 32px for compact (table actions), 48px for large (page-level CTAs).

**Volt Green CTA (primary action)**
- Background: `secondary` (#96D02C), label: `ink` (#0B0F0E), weight: 600
- Border radius: `rounded-md` (8px)
- Hover: background shifts to `secondary-strong` (#557A12), label stays ink — the green darkens to confirm intent without flashing to a different hue
- Active/pressed: 2px inset shadow in `#3D5A0D`
- Focus ring: 2px offset, colour `primary` (#008684) — Jade focus ring on a green button keeps the focus signal in the brand palette without blending into the button itself
- Disabled: background `grey-10` (#E6EAEA), label `grey-40` (#8A9290), no hover effect, `cursor: not-allowed`
- Icon placement: icons sit left of the label with an 8px gap (`spacing-sm`). Icon-only buttons are square (40×40px) with a `title` attribute for accessibility. Never place an icon right of the label — it reads as navigation, not action.

**Jade secondary (structural actions — save, confirm, secondary CTA)**
- Background: `primary-strong` (#007069), label: white, weight: 600
- Hover: `primary` (#008684) — lightens slightly on hover (intentional reversal of the usual darken-on-hover so the lighter jade reads as "lifting")
- Focus, active, disabled: same rules as primary

**Ghost (tertiary / inline actions)**
- Background: transparent, label: `primary` (#008684), border: 1.5px solid `grey-20`
- Hover: background `grey-05`, border `grey-20` — low-noise, barely-there lift
- Focus ring: `primary` (#008684), same as all buttons
- Disabled: label `grey-40`, border `grey-10`

**Destructive (delete, revoke)**
- Reserved for irreversible actions only. Not styled with brand colours — uses a system red when that token is finalised. Follow the same border-radius, height, and focus-ring rules.

---

### Input

Height: 40px. Border radius: `rounded-md` (8px). Font: body-md (1rem / 1.6).

**Default state**
- Border: 1.5px solid `grey-20` (#C4CBCA)
- Background: white
- Label above the field, body-sm weight 500, colour `ink`
- Placeholder: `grey-40` (#8A9290)

**Focus state**
- Border: 1.5px solid `primary` (#008684) — Jade focus ring, consistent with the button focus colour
- Outer glow: `box-shadow: 0 0 0 3px rgba(0, 134, 132, 0.18)` — a soft Jade halo at 18% opacity. Visible and on-brand without being aggressive.
- Background: white (unchanged — do not shift to a tinted surface on focus)

**Filled / active state**
- Border: 1.5px solid `grey-60` (#4A5250) — slightly darker than default to signal content is present

**Disabled state**
- Border: 1.5px solid `grey-10`
- Background: `grey-05` (#F3F5F5)
- Label and value text: `grey-40`
- `cursor: not-allowed`

**Error state**
- Border: 1.5px solid system-error-red (token TBD)
- Error message: body-sm, system-error-red, sits 4px below the field with a warning icon (16px) left of the message text
- On focus within error state: outer glow uses error-red at 18% opacity instead of Jade — never show a Jade glow on an errored field

**Helper text**
- body-sm, `grey-60`, sits 4px below the field. Replaced by the error message when in error state — they never appear simultaneously.
