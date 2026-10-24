# Frontend (`apps/web` + `packages/ui`)

React 19 + Vite + TypeScript, Tailwind CSS 4, Base UI primitives,
`motion` for animation, React Router 7 data router. Path alias `@/` →
`apps/web/src`; shared primitives import as `@workspace/ui/...`.

The structure follows the atomic layout of the SmartGrow frontend
(`cronlabs/smartgrow/frontend-sg/apps/web`), whose application components and
theme mechanics were ported here and restyled.

## Source layout (`apps/web/src`)

```
main.tsx                 console signature; ThemeProvider → AuthProvider → App
App.tsx                  <RouterProvider router={router} />
router.ts                every route; pages are lazy chunks; handle.title → breadcrumb
api/                     axios client + one module per backend area
  api.ts                 apiClient (withCredentials), 401 → refresh → AUTH_EXPIRED_EVENT
  endpoints.ts           every backend path, in one object
  auth.api.ts user.api.ts account.api.ts organizations.api.ts
  projects.api.ts agent.api.ts settings.api.ts
lib/
  common/paths.ts        every app route — link with these, never literals
  common/attribution.ts  author + repo URLs (the "Built by" stamp)
  common/local-storage.ts  the only place web storage is touched (try/catch)
  common/api-error.ts    describeError(err, fallback) → the API's detail
  common/dates.ts        parseApiDate (API sends UTC without a zone), timeAgo
  common/status.ts       run / project / index status → badge + label
  common/app-nav.ts      the sidebar rail sections, sectionFor(pathname)
  common/runs.ts user-display.ts
  auth/auth-redirect.ts  "where to land after sign-in" (state.from / sessionStorage)
providers/
  auth/                  who is signed in (retries non-401 /me failures)
  theme/                 light/dark/system, caret switch animation
  organization/          the user's organizations + the selected one
hooks/
  auth/use-auth.ts  common/use-theme.ts  common/use-debounce.ts
  organization/use-organization.ts
  organization/use-org-data.ts   useOrgProjects / useOrgRuns + ORG_DATA_CHANGED_EVENT
layouts/                 root, public, auth, onboarding, app (sidebar shell)
components/
  atoms/                 brand-logo, built-by, github-icon, org-avatar, text-link
  molecules/
    application/         the design-system components (below)
    common/              page-header, view-toggle, code-block, theme-toggle,
                         user-menu (public header), nav-user (sidebar),
                         brand-link, github-auth-button, section-heading,
                         route-transition, navigation-progress
    organization/        org-switcher, create-organization-popup
    onboarding/          onboarding-stepper
    auth/ skeletons/
  organisms/
    common/              app-sidebar (sidebar-09), app-topbar, site-header, site-footer
    dashboard/           usage-card, attention-card
    projects/            project-list (list/grid + actions), connect-repository-popup
    agents/              agent-catalog (pipeline + agent cards, from /agent/catalog)
    settings/            api-key-manager (onboarding + settings)
    onboarding/          organization-step, model-step, repository-step
    auth/ landing/
pages/
  common/                landing, agents, setup, not-found
  auth/                  signin, signup, auth-callback, signout
  onboarding/            onboarding-page
  dashboard/             dashboard-page, dashboard-agents-page
  projects/              projects-page (manage), project-detail-page (runs)
  runs/                  runs-page
  settings/              organization-settings, members, api-keys
  account/               account-page (profile)
```

Naming: kebab-case files, named exports (`export function X`), one
component per file (no non-component exports from component files — put
helpers in `lib/`), `data-slot="..."` on component roots.

## Routes

| Path | Layout | Page | Notes |
|------|--------|------|-------|
| `/` | Public | Landing | Hero, how it works, features, models, self-host, CTA |
| `/agents` | Public | Agents | The six agents + approval step, from `GET /agent/catalog` |
| `/setup` | Public | Self-host guide | Clone, OAuth app, env, Ollama, run; troubleshooting |
| `*` | Public | Not found | |
| `/login` | Auth | Sign in | Redirects away if already signed in; `?error=github`, "continue to …" notices |
| `/signup` | Auth | Sign up | Same GitHub flow; the first sign-in creates the account |
| `/login/callback` | Auth | Callback | Fixed path — the API redirects here. Waits for `/me`, then `takeRedirect() ?? /dashboard` |
| `/logout` | Auth | Sign out | Calls `signOut()` once on arrival, then shows the result |
| `/onboarding` | Onboarding | Onboarding | Organization → model access (key or local Ollama) → first repo |
| `/dashboard` | App | Overview | Usage (30 days), alerts, repositories (list/grid), Add new |
| `/dashboard/agents` | App | Agents | The catalog inside the shell |
| `/projects` | App | Repositories | Search, list/grid, connect (`?connect=1` opens the dialog), re-index, retry, disconnect |
| `/projects/:projectId` | App | Repository | Task, model picker, run, live node boxes, approval, retry/stop, history; `?run=<id>` opens a run, a live run is reattached |
| `/runs` | App | Runs | Every run in the organization (table, search, status filter) |
| `/settings` | App | Organization | Rename, details, delete / leave |
| `/settings/members` | App | Members | Add by GitHub username, roles, remove |
| `/settings/api-keys` | App | API keys | The user's own keys + local model status |
| `/account` | App | Profile | Display name, GitHub, log out |

`RootLayout` wraps everything in the toast provider, the top navigation
progress bar and `ScrollRestoration`. Every route has `ErrorBoundary:
RouteErrorBoundary`; layouts have `HydrateFallback` skeletons.

## Auth, onboarding and session

- The session is httpOnly cookies — JS can't read a token. `AuthProvider`
  asks `GET /me` once on load: `pending` → `authenticated` |
  `unauthenticated`. Only a **401** means signed out; other failures (429,
  5xx, network) are retried three times with backoff first.
- `apiClient`'s interceptor: on a 401 it calls `/refresh/` once and retries;
  if that fails it dispatches `AUTH_EXPIRED_EVENT` and AuthProvider drops
  the user. It never hard-redirects (public pages work signed out).
- `AppLayout` is the guard: pending → skeleton; no user → `/login` with
  `state.from`; `onboarded_at` null → `/onboarding`. `OnboardingLayout`
  does the reverse (onboarded → `/dashboard`).
- Onboarding (`pages/onboarding/onboarding-page.tsx`) resumes where the
  user left off (organization exists → step 2; a key saved → step 3) and
  finishes with `completeOnboarding(useLocalModels)` then `refresh()`.
- Sign-in is a full-page redirect (`GithubAuthButton`), so the destination
  is kept in sessionStorage (`rememberRedirect` / `takeRedirect`; only
  same-app paths).
- Signing out = navigating to `/logout` (both user menus do this).

## The app shell (sidebar-09)

`AppLayout` = `OrganizationProvider` → `TooltipProvider` →
`SidebarProvider` (`--sidebar-width: 21rem`) → `AppShell` (`AppSidebar` +
`SidebarInset` (`AppTopbar` + the routed page) + lazy-loaded `AppSearchDialog`).

`AppSidebar` follows shadcn's **sidebar-09** block (installed with `npx
shadcn add sidebar-09`): an **icon rail** (brand mark, the `APP_NAV`
sections with a sliding active marker, `NavUser` at the foot) and a
**section panel** (the org switcher on top; then a searchable repository
list, recent runs, the pipeline, or settings links depending on the
section; "Built by" at the foot). Cmd/Ctrl+B or the top-bar trigger
collapses it to the rail; on phones it's a sheet. `AppTopbar` shows the
organization, the route's `handle.title` as a breadcrumb, a `⌘K` global
search button, and the theme toggle.

### Global search (⌘K command palette)

`AppSearchDialog` provides a Spotlight-like frosted glass palette (`variant="glass"`)
triggered via `Cmd+K` / `Ctrl+K` (via `useKeyboardShortcuts`) or the topbar search button.
It searches:
- **Actions**: Dark/light/system theme, sidebar collapse/expand, connect repository, API keys, profile, sign out.
- **Pages**: Overview, Repositories, Runs, Agents pipeline, Organization settings, Members, API keys, Profile.
- **Records**: Active organization's repositories and agent runs (cached in memory via `useOrgProjects` / `useOrgRuns`).
- **Recents**: Last 5 picked items saved in `localStorage` under `ase:search_recents` (validated via Zod schema).
Lazy-loaded via dynamic import so `cmdk` is isolated in its own bundle chunk and never loaded until invoked.

## Organizations in the UI

- `useOrganization()` → `{organizations, current, switchTo, refresh}`.
  `current` is always set inside the app shell. Switching writes
  localStorage `ase:organization`.
- Lists are fetched per organization with `useOrgProjects(orgId)` /
  `useOrgRuns(orgId)`. After any change to projects or runs, call
  `notifyOrgDataChanged()` — every mounted list (the sidebar included)
  reloads; there is no global store.
- Owner-only controls are hidden for members (`current.role`), and the API
  enforces the same rules.

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
| `ApplicationPopup` | Modal with spring + blur in/out (`application-popup-motion.ts`); `primaryAction`/`secondaryAction` for confirm dialogs. |
| `ApplicationTabs` | Underline tabs with a sliding indicator. |
| `ApplicationTable` / `ApplicationPagination` | Data table with search, sort, selection, expandable rows (rows must be plain object types — use a mapped type like `Pick<T, keyof T>` for interfaces; see `runs-page.tsx`). |
| `ApplicationDatePicker` (+ single / range) | Dates and schedules (react-day-picker, date-fns). |

Not used by any page yet: card, tabs, pagination, date pickers.

Primitives in `packages/ui/src/components`: avatar, badge, breadcrumb,
button, calendar, card, checkbox, collapsible, command, dialog,
dropdown-menu, empty, field, input, input-group, label, popover, progress,
select, separator, sheet, sidebar, skeleton, spinner, switch, table,
textarea, toast, tooltip (shadcn on Base UI). Adding one with the shadcn
CLI: answer **no** to overwriting existing files, then replace its
`import { cn } from "cn"` with `@workspace/ui/lib/utils` and drop the `cn`
package it adds. Toasts:
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
