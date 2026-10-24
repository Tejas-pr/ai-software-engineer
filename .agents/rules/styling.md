---
trigger: always_on
---

# Theme and styling rules

Applies to every component in `apps/web` and `packages/ui`. The theme lives
in `packages/ui/src/styles/globals.css`; full reference in `kb/frontend.md`.

## 1. Typography

- **JetBrains Mono is the app font** (`--font-sans` and `--font-mono` are
  both JetBrains Mono). Body, UI, buttons, inputs, labels and code inherit
  it — don't set a family on them.
- **Instrument Serif (`font-serif`) is for display headings only**: page
  titles, section titles, the landing hero, auth titles. Use it with
  `font-normal` (single weight) and slight negative tracking
  (`tracking-[-0.01em]`); accents are an italic `<em>` (amber via
  `text-[color-mix(...)]`/`text-primary` on dark, or `text-muted-foreground`).
- A small uppercase eyebrow above a serif title stays mono:
  `text-2xs font-medium tracking-[0.12em] uppercase text-muted-foreground`.
- Never add another font family.

## 2. Colors

- Semantic tokens only: `bg-background`, `bg-card`, `bg-muted`,
  `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-primary` + `text-primary-foreground` (amber), `bg-highlight` +
  `text-highlight-foreground` (ink), `bg-brand-soft`, `text-link`.
- Amber as **text** on light backgrounds is `text-link`, never
  `text-primary` (too little contrast).
- Run states: `run-pending`, `run-running`, `run-awaiting`,
  `run-completed`, `run-failed` (`text-run-failed`, `bg-run-completed/10`, …).
- No raw hex, `bg-black`, `bg-zinc-*` in components. A new color is a new
  token in `globals.css` with both light and dark values.

## 3. Components and motion

- Use `components/molecules/application/*` (`ApplicationButton`,
  `ApplicationBadge`, `ApplicationInput`, …) and `@workspace/ui`
  primitives before building anything new.
- Animate with `motion/react`; every animation checks
  `useReducedMotion()`. Easing `[0.22, 1, 0.36, 1]`.
- Buttons, links and `role="button"` keep the pointer cursor (set globally).

## 4. Layout

- Works at 390 px wide with no horizontal scroll; grid tracks as
  `minmax(0, …)` so long content can't widen a column.
- Tailwind only sees literal class strings — map variants through objects
  of full class names, never template strings.
