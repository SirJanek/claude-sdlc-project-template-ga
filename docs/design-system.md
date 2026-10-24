# DevMentor design system — agent brief

Read this file first when you build or change a screen. Source of truth: `packages/ui` (Storybook: `pnpm --filter @mentorhub/ui storybook`, port 6006). Every import comes from `@mentorhub/ui`. UI language: English.

## Character

DevMentor connects stuck developers with senior engineers for paid 25- or 50-minute text sessions (brief, R01). The UI is a dense, calm list like a GitHub PR list (R01.1) with one obvious action per screen (R01.5) and colour only for state (R01.3). Warm neutrals and a single accent on the main action (K2). Trust from public work, never ratings (N02, R08).
Character words: dense, calm, concrete, warm-neutral, one action. Not: marketplace, course, community, chat app, generic AI startup (A01–A05).

## Components

| Component | Import | When | When not |
|---|---|---|---|
| Button | `Button` | an action; one `default` per screen (R01.5) | navigation → `<a>` |
| Link / text action | `Button variant="link"`, `<a>` | navigation, quiet actions | main or destructive action |
| Input, Textarea | `Input`, `Textarea` in `FormField` | text values; the question (R05) | without a visible label |
| FormField | `FormField` | every form control: label, hint, error, Required/Optional | wrapping `Select` (not supported — wire `aria-labelledby`) |
| Checkbox | `Checkbox` | yes/no saved with the form | instant setting → Switch |
| RadioGroup | `RadioGroup`, `RadioGroupItem` | 2–7 visible options | long lists → Select |
| Select | `Select*` | 8+ options, filters | ≤ 5 options → RadioGroup |
| Switch | `Switch` | setting applied immediately | inside a form saved later |
| Card | `Card*` | bordered group, no shadow | card in card; lists (rows) |
| Badge | `Badge variant="success\|warning\|danger\|neutral"` | status with text (R01.3) | decoration, counters |
| Avatar | `Avatar` | photo next to printed name | initials (A01) |
| Alert | `Alert`, `AlertTitle`, `AlertDescription` | in-page message, failed action | "saved" → Toast |
| Dialog | `Dialog*` | short focused task | long forms → page |
| Confirm dialog | `AlertDialog*` | destructive/irreversible; verb on the button | reversible actions |
| Menu | `DropdownMenu*` | 3+ secondary row actions | one action |
| Popover | `Popover*` | optional detail | forms, required info |
| Tooltip | `Tooltip*` | icon-only button names | needed information |
| Tabs | `Tabs*` | views of the same object | main navigation (R02.6) |
| Skeleton | `Skeleton` | first load > 300 ms | action in progress |
| EmptyState | `EmptyState` | why empty + next step | errors |
| ErrorState | `ErrorState` | load failed + retry | field errors |
| Toast | `ToastProvider`, `useSavedToast` | "saved" only (decision 3) | any error |
| Table | `Table*` | admin data (E05) | people/bookings → rows |
| MentorCard | `MentorCard` | mentor in list: name, headline, technologies, price, earliest start, public work | ratings (N02) |
| SlotList | `SlotList` | choose session time, grouped by day | calendar grid |
| BookingRow | `BookingRow` | booking + status badge | colour-only status |
| PriceSummary | `PriceSummary` | before paying; states 12 h rule (R10) | showing commission |
| SessionEntry | `SessionEntry` | one session message, full width (R02.1–2) | bubbles, reactions (A05) |
| SessionComposer | `SessionComposer` | live session; Enter sends | outside sessions |
| PageHeader | `PageHeader` | top of every screen: one `h1`, optional description and actions | section titles (`h2 text-lg`) |
| FilterBar, FilterChip | `FilterBar`, `FilterChip`, `resultCount` | list filters, removable chips "Python ×", `role=status` count | single search field |
| RowAction | `RowAction` | one row action with "Removing…" and inline error + retry | 3+ actions → `DropdownMenu` |
| MentorCard variants | `MentorCard variant="compact"`, `hideNoSlotsBadge`, `unavailable` | saved mentors without price/slot; item gone from catalogue | — |
| LoadingMessage | **deprecated** | admin panel only | new screens → `Skeleton` / busy button |

Homes for new code: primitive `packages/ui/src/components/ui/`; panel pattern `src/backend/<category>/`; domain component `src/components/<concept>/`; single-use: colocate with the page.
Colocate vs `components/<feature>/` (clarified after agent test 1): **in the app** a single-use screen part is colocated with its `page.tsx`; **in `packages/ui`** a screen or component built for the design system (e.g. an agent-test screen) lives in `src/components/<concept>/` because there is no `page.tsx` to colocate with. Concept folders use the code name (`favorites`).

## Semantic tokens (`packages/ui/src/styles/tokens.css`, mapped to Tailwind in `globals.css`)

| Token / class | Purpose |
|---|---|
| `background`, `foreground` | page surface and body text |
| `card`, `popover` (+ `-foreground`) | panels, menus, lists in portals |
| `muted`, `muted-foreground` | quiet surfaces, metadata, disabled |
| `border`, `border-strong`, `input` | row separators; field and control borders (WCAG 1.4.11) |
| `primary`, `primary-hover`, `primary-foreground` | the one main action (K2) |
| `secondary`, `accent` | secondary actions, hover tints |
| `destructive`, `destructive-hover` | destructive actions |
| `status-success/warning/danger` (+ `-bg`) | state only (R01.3) |
| `ring` | focus outline 2 px, offset 2 px |
| `overlay` | dialog backdrop |
| `gap-inline`, `gap-stack`, `p-panel`, `py-section` | spacing: inside a group, between groups, inside a panel, between sections |
| `px-list-row-x`, `py-list-row-y`, `h-control` | list density (K1), 40 px controls |
| `gap-thread-gap`, `gap-thread-author-gap` | conversation density (K1) |
| `text-sm/base/lg/xl/2xl`, `font-mono` | 13/14/16/… px; code always mono (R01.2) |
| `rounded-lg` (6 px), `rounded-full` | controls/panels; pills only in Badge |
| `max-w-content`, `--measure` | 64rem layout, 65 ch text (PROPOSAL) |
| `w-field-sm`, `w-field-md` (`--field-width-sm/md`) | 14 / 20 rem field widths: filter Select / e-mail, name (PROPOSAL, agent test 1) — never `w-56` |
| `duration-(--motion-fast)` | colour/border transitions only |

Never: raw `--dm-*`, hex/rgb/oklch, palette classes (`bg-zinc-900`, `text-white`), arbitrary values (`p-[13px]`), opacity on action colours (`bg-primary/50`), `dark:` classes. `pnpm --filter @mentorhub/ui lint:tokens` fails on them.

## If… then use…

- Main step → `Button`; other actions → `outline`/`ghost`; navigation → link; 3+ row actions → `DropdownMenu`.
- 2–7 options → `RadioGroup`; 8+ or filter → `Select`.
- Immediate setting → `Switch`; saved with form → `Checkbox`.
- Destructive → `AlertDialog` naming the object and the verb; short task → `Dialog`; long task → page; optional detail → `Popover`; icon name → `Tooltip`.
- Field wrong → `FormField error`; action failed → `Alert danger`/`ErrorState`; saved → Toast; **error needing action is never a toast**.
- First load → `Skeleton`; action running → button disabled + `aria-busy` + "Saving…".
- Admin data → `Table`; people/bookings → rows; never a grid of identical cards.
- Every list screen has: loading, empty (why + action), error (what + retry), no results for filters (Clear filters), many items, long text.

## Screen and list rules (agent test 1; PROPOSAL = przyjęte domyślnie, do weryfikacji)

- **Page title** → `PageHeader` (`h1 text-xl semibold`); sections `h2 text-lg` (PROPOSAL).
- **Zero `default` buttons is allowed** when the screen only shows or manages existing items and its next step lives elsewhere (e.g. saved mentors; the empty state links out). R01.5 caps it at one; it does not require one (PROPOSAL).
- **Row actions**: one → `RowAction` (ghost, size `sm`); 3+ → `DropdownMenu`. On phones the action stays on the right of the row, size `sm` (32 px ≥ 24 px, WCAG 2.5.8) (PROPOSAL). Accessible name includes the object: "Remove {name} from favourites" (WCAG 2.4.6).
- **Row action in progress** → button disabled + `aria-busy` + "Removing…", row `aria-busy` (same rule as forms).
- **Row action failed** → inline `role=alert` text under the button + "Try again"; never a toast (stage 0 decision 3).
- **Reversible removal** (favourites) → no confirm dialog (alert-dialog.mdx). Undo is an open product decision (What is missing).
- **Saved item no longer available** → `MentorCard unavailable`: name without link, "No longer available" badge, only the Remove action.
- **Filters during load** → controls stay enabled (filtering is local state; disabling without a reason is an anti-pattern), count empty. **On load error** → filter bar hidden, `ErrorState` with retry. **Empty** → bar hidden. This resolves the Patterns vs "disabled without a reason" contradiction (PROPOSAL).
- **Active filter** → `FilterChip` "Python ×", name "Remove filter Python" (Patterns › List with filters).
- **Result count** → `role=status` line on the right of the filter bar; copy `resultCount`: "3 mentors", "2 of 3 saved mentors"; empty while loading (patterns.mdx, WCAG 4.1.3).
- **EmptyState action**: goes to another page → `<Button variant="outline" asChild><a href>…</a></Button>` (looks like the next step, is a link semantically); acts on this page (Clear filters) → `<Button variant="outline">` (DS "navigation → link" + EmptyState "next step") (PROPOSAL).
- **Field width** → `w-field-sm` / `w-field-md`, not Tailwind sizes.
- **First load** → `Skeleton` (`rounded-lg`, no pulse). `LoadingMessage` (spinner + opacity) is deprecated.

## What to avoid

A01 generic AI look (gradients, glass/blur, glow, sparkles, emoji, "new" pills, three icon cards, initials avatars, `rounded-2xl`); A02 course/progress bars; A03 ratings, stars, tile grids; A04 community, streaks, subscriptions; A05 messenger (online dot, typing, bubbles, reactions, unread). Implementation: div as button, placeholder as label, colour-only status, disabled without a reason, toast for errors, essential info in tooltips, variants added on the way.

## Content

Short and concrete, no exclamation marks or emoji (L3). **Spelling: British English in UI copy** ("Favourite mentors", "colour"); **American in code** — identifiers, files, folders, routes (`favorites`, `color`) follow the codebase and AGENTS.md concept names (PROPOSAL, agent test 1). Buttons: verb + object ("Pay $45", "Decline question"). Errors: what happened + what to do. Dates `Tue 27 Oct`, time 24 h `18:00`, money `$45` (PROPOSAL formats).

## Storybook commands

| Task | Command |
|---|---|
| Run | `pnpm --filter @mentorhub/ui storybook` |
| Build | `pnpm --filter @mentorhub/ui build-storybook` |
| Story tests (a11y = error) | `pnpm --filter @mentorhub/ui test:storybook` |
| Token lint | `pnpm --filter @mentorhub/ui lint:tokens` |

Story locations: primitives `src/docs/primitives/`, product `src/docs/product/`, patterns `src/docs/patterns/` + `src/docs/layout/`, epic screens `src/docs/screens/` (menu `Design system/Epics/E0x`); a component's own screen story may sit next to it (`components/<concept>/*.stories.tsx`, title `Screens/<Name>`). Phone check: viewport toolbar Phone 320 / Tablet 768 / Desktop 1440, or `globals: { viewport: { value: 'mobile320' } }` in a story.

Storybook pages to read next: Design system / Start here, How to choose, What to avoid, Patterns, and the epic page for your screen.
