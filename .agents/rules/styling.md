---
trigger: always_on
---

# Theme and Styling Rules for AI Software Engineer Workspace

All new and modified components in the `ai-software-engineer` repository must strictly adhere to the project's custom theme preset (`b1a1OfGoC`).

## 1. Typography (JetBrains Mono)
*   Do NOT hardcode specific font families or use `font-serif` / `font-sans` classes unless you want to intentionally deviate.
*   The default font family for the entire workspace is configured as `JetBrains Mono` globally. All text, headings, buttons, and input fields should inherit this typography from the document body.

## 2. Colors and Theming (Olive & Yellow)
*   Always use Tailwind utility classes mapping to design tokens/CSS variables:
    *   **Page Background**: `bg-background`
    *   **Text Colors**: `text-foreground`, `text-muted-foreground`
    *   **Cards / Containers**: `bg-card`, `text-card-foreground`, `border-border`
    *   **Primary Action Buttons**: `bg-primary`, `text-primary-foreground`
    *   **Secondary Action Buttons**: `bg-secondary`, `text-secondary-foreground`, `bg-muted`
*   Do NOT use hardcoded colors such as `bg-black`, `bg-zinc-900`, or arbitrary custom hex values. Let the theme dynamically resolve light and dark modes using the tokens.

## 3. Interactive Elements (Pointer Cursor)
*   Ensure buttons, anchors, and elements with `role="button"` are styled to have a pointer cursor. This is handled globally via the baseline CSS selector, but do not override it.

```
bunx --bun shadcn@latest init --preset b1a1OfGoC --template vite --monorepo --pointer
```
