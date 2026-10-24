# Frontend (`apps/web` + `packages/ui`)

React 19 + Vite + TypeScript, Tailwind CSS 4, Base UI primitives,
`motion` for animation, React Router 7 data router. Path alias `@/` →
`apps/web/src`; shared primitives import as `@workspace/ui/...`.

The structure follows the atomic layout of the SmartGrow frontend
(`cronlabs/smartgrow/frontend-sg/apps/web`), whose application components and
theme mechanics were ported here and restyled.

## Source layout (`apps/web/src`)

```
main.tsx                 ThemeProvider → AuthProvider → App (StrictMode)
App.tsx                  <RouterProvider router={router} />
router.ts                every route; pages are lazy chunks
api/                     axios client + one module per backend area
  api.ts                 apiClient (withCredentials), 401 → refresh → AUTH_EXPIRED_EVENT
  endpoints.ts           every backend path, in one object
  auth.api.ts user.api.ts projects.api.ts agent.api.ts settings.api.ts
lib/
  common/paths.ts        every app route — link with these, never literals
  common/local-storage.ts  the only place web storage is touched (try/catch)
  auth/auth-redirect.ts  "where to land after sign-in" (state.from / sessionStorage)
providers/
  auth/                  AuthContext + AuthProvider (who is signed in)
  theme/                 ThemeContext + ThemeProvider (light/dark/system, caret switch)
hooks/
  auth/use-auth.ts       useAuth()
  common/use-theme.ts    useTheme()
  common/use-debounce.ts used by the application components
layouts/                 root, public, auth, app (the guard)
components/
  atoms/                 brand-logo (BrandMark + wordmark), github-icon, text-link
  molecules/
    application/         the app's design-system components (below)
    common/              theme-toggle, user-menu, brand-link, github-auth-button,
                         route-transition, navigation-progress, section-heading
    auth/                auth-notice
    skeletons/           page / auth / landing fallbacks
  organisms/
    common/              site-header, site-footer, app-header
    auth/                auth-card, auth-showcase, route-error-boundary
    landing/             landing-hero, run-preview, how-it-works, landing-features,
                         landing-models, landing-cta
pages/
  common/                landing-page, not-found-page
  auth/                  signin, signup, auth-callback, signout
  projects/              projects-page (list/connect), project-detail-page (runs)
  settings/              settings-page (BYOK keys)
```

Naming: kebab-case files, named exports (`export function X`), one
component per file, `data-slot="..."` on component roots.

## Routes

| Path | Layout | Page | Notes |
|------|--------|------|-------|
| `/` | Public | Landing | Header shows Sign in / Get started, or Open app + user menu |
| `*` | Public | Not found | |
| `/login` | Auth | Sign in | Redirects away if already signed in (to `state.from` or `/projects`); shows `?error=github` and "continue to …" notices |
| `/signup` | Auth | Sign up | Same GitHub flow; the first sign-in creates the account |
| `/login/callback` | Auth | Callback | Fixed path — the API redirects here. Waits for `/me`, then `takeRedirect() ?? /projects`, or `/login?error=github` |
| `/logout` | Auth | Sign out | Calls `signOut()` once on arrival, then shows the result (and an honest notice if the server was unreachable) |
| `/projects` | App | Projects | Connected repos, connect a new one, retry failed clones |
| `/projects/:projectId` | App | Project detail | Issue/task, model picker, skip tests, run, live node boxes, approval panel, retry/stop, history |
| `/settings` | App | Settings | BYOK API keys |

`RootLayout` wraps everything in the toast provider, the top navigation
progress bar (shows while a lazy page loads) and `ScrollRestoration`. Every
route has `ErrorBoundary: RouteErrorBoundary` and the layouts have
`HydrateFallback` skeletons.

## Auth and session

- The session is httpOnly cookies — JS can't read a token. `AuthProvider`
  asks `GET /me` once on load: `status` is `pending` →
  `authenticated` | `unauthenticated`.
- `apiClient`'s response interceptor: on a 401 it calls `/refresh/` once and
  retries; if that fails it dispatches `AUTH_EXPIRED_EVENT` on `window`.
  AuthProvider listens and drops the user. It **does not** hard-redirect —
  that would bounce anonymous visitors off public pages.
- `AppLayout` is the only guard: pending → `PageSkeleton`; no user →
  `<Navigate to="/login" state={{from}} replace />`.
- Sign-in is a full-page redirect (`GithubAuthButton` →
  `githubLoginUrl()`), so the destination is kept in sessionStorage
  (`rememberRedirect`) and read once on the callback (`takeRedirect`). Only
  same-app paths are accepted (no `//host`, no `/login*`, `/logout*`).
- Signing out = navigating to `/logout` (the user menu does this).
  `signOut()` POSTs `/logout/` and clears the user even if that call fails.
  Back from there lands on `/login` via the guard, never on stale data.
- `refresh()` re-reads `/me` on demand.

## Theme and typography

Defined once in `packages/ui/src/styles/globals.css`; components use only
semantic tokens.

- **Fonts — the rule:** JetBrains Mono for everything (body, UI, labels,
  code; `--font-sans` and `--font-mono` are both JetBrains Mono). **Instrument
  Serif** (`font-serif`) is for display headings only: page titles, section
  titles, the hero, auth titles. Serif headings use `font-normal` (it has
  one weight) with slight negative tracking, and an italic `<em>` accent in
  amber/muted. Small uppercase eyebrows above a title stay mono
  (`text-2xs tracking-[0.12em] uppercase text-muted-foreground`). Never
  introduce another family.
- **Palette:** warm paper / ink in light, warm charcoal in dark, one amber
  brand. Brand constants in `:root` (`--brand-amber`, `--brand-ink`,
  `--brand-paper`, …); semantic tokens for light under `:root, .light`,
  for dark under `.dark`. Use `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary` /
  `text-primary-foreground`, `text-link` (legible amber for text — never
  `text-primary` for text on light backgrounds), `bg-highlight` (ink solid),
  `bg-brand-soft`.
- **Run tones:** `run-pending`, `run-running`, `run-awaiting`,
  `run-completed`, `run-failed` (e.g. `text-run-failed`, `bg-run-completed/10`).
- **Utilities:** `bg-grid` (faded engineering-paper grid), `bg-grain`
  (noise), `glass`, `animate-caret` (terminal-caret blink), `text-2xs`,
  `text-3xs`, `no-scrollbar`. `cn()` knows `text-2xs`/`text-3xs` are sizes.
- **Forcing a theme on a section:** add `dark` or `light` to a wrapper (the
  auth showcase and the landing CTA are always ink with `dark`).
- **ThemeProvider:** `theme` (`light` | `dark` | `system`, stored in
  localStorage `theme`), `resolvedTheme`, `setTheme(t, origin?)`,
  `toggleTheme(origin?)`. A switch plays the caret animation: an amber caret
  pops up at `origin` (the toggle's centre), blinks, then the new theme
  sweeps across its line and fills the screen through a View Transition
  clip-path. Reduced motion → instant. Pressing `D` outside inputs toggles.
  `index.html` sets the class before first paint so dark never flashes.

## Motion conventions

- Library: `motion/react`. Shared easing `[0.22, 1, 0.36, 1]`.
- Every animated component checks `useReducedMotion()` and either skips
  (`initial={false}`) or uses a plain fade.
- Page enter: `RouteTransition` (fade + 8 px rise, 300 ms) keyed by the
  route id — layouts wrap `<Outlet />` in it. A route opts out with
  `handle: { transition: false }`.
- Scroll reveals: `whileInView` with `viewport={{ once: true }}`.
- Shared-element indicators use `layoutId` (app header nav pill,
  `ApplicationTabs` underline).
- Buttons: `ApplicationButton` springs (hover −1 px, press +1 px / 0.98).

## Component library (`components/molecules/application`)

Use these before reaching for raw primitives:

| Component | Use for |
|-----------|---------|
| `ApplicationButton` / `applicationButtonVariants()` | All buttons. Variants: `primary` (amber key-cap), `secondary`, `highlight` (ink), `cta` (amber gradient), `glass`, `outline`, `ghost`, `destructive`. Sizes `sm`, `default`, `lg`, `xl`, `icon`, `icon-sm`. Use the variants function on `<Link>`/`<a>`. |
| `ApplicationBadge` | Status pills. Run presets `pending` / `running` / `awaiting` / `completed` / `failed`; also `success`, `warning`, `destructive`, `info`, `neutral`, `brand`, `hero`, counts; `dot`, `pulseDot`. |
| `ApplicationInput` | Labelled input with icons, error shake, animated messages, unit dropdown addon. |
| `ApplicationSelection` / `ApplicationCombobox` | Select / searchable select with label, error, description. |
| `ApplicationCard` (+ `.Header`, `.Title`, …, `.Entity`) | Cards; `interactive` variant is keyboard-accessible. |
| `ApplicationPopup` | Modal with spring + blur in/out (`application-popup-motion.ts`). |
| `ApplicationTabs` | Underline tabs with a sliding indicator. |
| `ApplicationTable` / `ApplicationPagination` | Data table with search, sort, selection, expandable rows. |
| `ApplicationDatePicker` (+ single / range) | Dates and schedules (react-day-picker, date-fns). |

Table, date picker, tabs, card and popup are ported but not used by any
page yet — they're there for the dashboard work.

Primitives in `packages/ui/src/components`: avatar, badge, button,
calendar, card, checkbox, command, dialog, dropdown-menu, empty, field,
input, input-group, label, popover, progress, select, separator, skeleton,
spinner, table, textarea, toast, tooltip (shadcn on Base UI). Toasts:
`import { toast } from "@workspace/ui/components/toast"` →
`toast.add({ title, description, type })` (the Toaster is in RootLayout).

## Talking to the API

- Plain JSON: `apiClient` (axios, `baseURL = VITE_API_URL ||
  http://localhost:8000`, `withCredentials`).
- Streams: `fetch(..., { credentials: "include" })` and
  `readAgentStream(response)` — an async generator over SSE frames.
  `streamRun`, `approveRun`, `retryRun` all return such a response.
- Errors: show `err.response.data.detail` when present (see
  `describeError` in the pages).
