# POSTEP — design system DevMentor (ćwiczenie 3, lekcja 06)

Prowadzony przez agenta. Przy nowej sesji: przeczytaj ten plik i kontynuuj od „Następny krok”.

## Materiały (wszystkie przeczytane 2026-10-20)
- Brief `.ai/specs/product-brief.md`, wywiady `.ai/specs/research/*.md`, backlog `.ai/specs/backlog.md` (E01–E06, #20–#40).
- Spec E01 `.ai/specs/2026-10-18-accounts-and-roles.md` tylko na gałęzi `origin/spec/accounts-and-roles` (PR #43). Specyfikacji E02–E05 jeszcze nie ma: ekrany tych epików wyprowadzone z briefu i tytułów historii, oznaczone jako propozycje.
- Referencje `lekcja-06/referencje.md`, tokeny `lekcja-06/tokeny.md`, audyt `lekcja-06/audyt-devmentor.md` (prompt mówi „brak”, ale plik istnieje; użyty).

## Stan repo (inwentaryzacja)
- pnpm 10.34.5, Node 26, Next 16.4.2 (App Router, React 19.3), Tailwind 4.3.3 przez `@tailwindcss/postcss`, Vitest 5, ESLint 10. Brak Storybooka.
- `packages/ui`: shadcn/ui new-york (`components.json`, `baseColor: neutral`, `iconLibrary: lucide`, ale `lucide-react` nie jest zainstalowany), `radix-ui` 1.8.1, `class-variance-authority`, `cn`. Prymitywy: button, card, badge, table. Warstwa panelowa: `backend/` (DataTable, CrudForm, EmptyState, ErrorMessage, LoadingMessage, apiCall). Tokeny: `src/styles/globals.css` (jasny + `.dark`, indygo). Testy 100% pokrycia wymagane (`packages/ui/AGENTS.md`).
- Strona główna `(marketing)/page.tsx` omija design system (plain Tailwind, 12 kolorów na sztywno) — poza zakresem zmian (zasada 11), wpis do „What is missing”.
- Wersje w rejestrze (2026-10-20): storybook 10.6.2, @storybook/nextjs-vite 10.6.2, @storybook/addon-a11y 10.6.2, @storybook/addon-vitest 10.6.2, msw-storybook-addon 3.0.3, remark-gfm 4.0.1.

## Etapy
- [x] Etap 0 — inwentaryzacja i plan: plan pokazany 2026-10-20, 5 pytań rozstrzygniętych, czeka na „dalej”.
- [x] Etap 1 — fundamenty (2026-10-20 01:30): Storybook 10.6.2 zbudowany, 7 stron Foundations sprawdzonych w przeglądarce, tokeny w kodzie, `lint:tokens`, lint + typecheck + testy jednostkowe zielone, aplikacja na :3000 działa z nowymi tokenami; czeka na „dalej”
- [x] Etap 2 — komponenty bazowe, 25 prymitywów: partia 1 (12:50) i 2 (13:22:36) z pełnymi bramkami; ==partie 3–4 (13:32:51) bez testów na prośbę Jana==, tylko typecheck. 2026-10-24
- [x] Etap 3 — komponenty produktu, wzorce, ekrany (2026-10-24 13:38) — ==bez testów na prośbę Jana==
- [x] Etap 4 — strony, które uczą + `docs/design-system.md` + odwołanie w AGENTS.md (2026-10-24 13:42) — ==bez testów na prośbę Jana==
- [x] Etap 5 — sprawdzenie (lekkie) i raport; opis ekranu do testu agentem (2026-10-24 13:45:27) — ==bez testów na prośbę Jana==

## Decyzje zatwierdzone przez Jana
- Z ćwiczenia 2 (referencje.md, tokeny.md): wszystkie wiersze „przyjęte”; tokeny zatwierdzone w całości 2026-10-20.
- Etap 0 (2026-10-20): (1) ikony: lucide-react; (2) Avatar tylko ze zdjęciem, bez fallbacku na inicjały (A01) — wymaga pola zdjęcia w profilu, którego backlog nie ma → wpis do „What is missing”; (3) Toast tylko dla „zapisano” (profil, ceny, sloty), nigdy dla błędów; (4) wybór slotu jako lista pogrupowana dniami (RadioGroup), bez kalendarza; (5) przełącznik motywu z samym jasnym, `.dark` nietknięty (L2).
- Plan techniczny i lista komponentów z etapu 0 przyjęte z tymi poprawkami: Primitives +Avatar (photo-only) +Toast = 25.

## Etap 1 — co powstało i co sprawdzono
- `src/styles/tokens.css` — 3 warstwy (`--dm-*` surowa; znaczeniowa z nazwami shadcn + nowe `--status-*`, `--border-strong`, `--primary-hover`, `--font-mono`, `--space-*`, `--radius-full`, `--shadow-card`, `--motion-fast`; komponentowa `--density-*`), źródło w komentarzu przy każdym tokenie. Wartości 1:1 z tokeny.md; kontrast policzony ponownie (najniższa para tekstu 4,95, UI 4,98), nic nie spadło. PROPOZYCJE oznaczone w pliku: interlinie 18/20/24/28/32, `--measure: 65ch`, `--layout-max: 64rem`.
- `src/styles/globals.css` — `@import './tokens.css'` na początku, `@theme inline` mapuje tokeny na klasy (`text-status-danger`, `border-border-strong`, `gap-inline`, `p-panel`, `py-section`, `text-sm` = 13 px …), `body` = `font-sans text-base`, `code/pre/kbd` = mono, `prefers-reduced-motion` globalnie. Blok `.dark` nietknięty (L2).
- `.storybook/`: `main.ts` (nextjs-vite, addon-docs + remark-gfm, a11y, vitest; telemetria, „what's new” i project.json wyłączone), `preview.tsx` (`a11y.test = 'error'`, MSW przez `mswLoader` z `msw-storybook-addon/csf3`, przełącznik motywu ustawia `data-theme` i klasę `dark` na `<html>`, tylko „Light”), `manager.ts` + `theme.ts` (tytuł „DevMentor”), `blocks/` (bloki dokumentacji, nieeksportowane z pakietu).
- `src/docs/foundations/*.mdx` — Colour (16 ról + 22 pary zmierzone na żywo z canvasa, 0 FAIL), Typography (8 ról), Spacing and layout (4 relacje + 2 gęstości + ramki 320/768/1440), Shape and depth, Motion, Icons (lucide, 3 rozmiary), Themes. Sprawdzone w zbudowanym Storybooku przez headless Chrome: tabele GFM renderują się jako `<table>` (0 surowych kresek), zrzuty w scratchpadzie sesji `sb-*/`.
- `scripts/lint-tokens.mjs` (`pnpm lint:tokens`, `make lint-tokens`): hex/rgb/hsl/oklch poza tokens.css, klasy palety Tailwinda, wartości w nawiasach kwadratowych; wyjątki: blok `.dark` w globals.css i kod inline w prozie MDX. ==Dziś 10 trafień== w prymitywach shadcn (button/badge `text-white`, `ring-[3px]`, card `grid-*-[…]`, table `translate-y-[2px]`, CrudForm `ring-[3px]`) — do naprawy w etapie 2, celowo niezamaskowane.
- `vitest.config.ts` — projekty `unit` (100% pokrycia; stories, docs i mdx poza mianownikiem) i `storybook` (browser mode, Playwright na zainstalowanym Chrome `channel: 'chrome'` z `--use-mock-keychain --mute-audio`); `pnpm test:storybook` startuje, 0 stories (jeszcze).
- Skrypty: ui `storybook`, `build-storybook`, `test:storybook`, `lint:tokens`; root `package.json` i `Makefile` (`storybook`, `build-storybook`, `test-storybook`, `lint-tokens`; NIE dodane do `make check` — decyzja Jana). ESLint ignoruje `storybook-static/` i `mockServiceWorker.js`; Prettier ignoruje `lekcja-06/` i worker. `tsconfig` ui obejmuje `.storybook`.
- Zielone: `pnpm lint` (eslint + prettier), `pnpm --filter @mentorhub/ui typecheck`, `pnpm --filter @mentorhub/ui test` (37 testów, 100%), `build-storybook`; aplikacja na :3000 po restarcie serwera 200 na `/`, `/admin`, `/admin/users` (Turbopack trzymał błąd z 3 minut, gdy tokens.css jeszcze nie istniał).
- Zależności dodane (wszystkie z planu): storybook, @storybook/{nextjs-vite,addon-docs,addon-a11y,addon-vitest}, @vitest/browser-playwright, playwright, msw, msw-storybook-addon, remark-gfm (dev); lucide-react (prod). Nic ponad plan; `package.json` sprawdzony.
- Incydent: jedno wywołanie zapisało pliki w katalogu głównym repo zamiast w `packages/ui` i utworzyło `/Users/jani/.gitignore` (pliki usunięte). Zostały puste foldery do skasowania przez Jana jednym poleceniem w katalogu głównym repo: `rmdir src/docs/foundations src/docs src/styles src scripts public .storybook/blocks .storybook`.

## Uzupełnienie lintera (2026-10-24 12:33, decyzja Jana „A”)
- `lint:tokens` pilnuje warstw: `var(--dm-*)` tylko w `tokens.css` i w bloku `@theme` w `globals.css`; zakaz przezroczystości `/NN` na kolorach akcji (`primary|secondary|destructive|accent`) — stany z własnych tokenów (`--primary-hover`).
- Test lintera na przynętach: `pnpm --filter @mentorhub/ui test:lint-tokens` (10/10); mutacja (wyłączona reguła palety) → 5 testów pada.
- Trafienia w repo: 10 → ==30== (20 nowych to przezroczystości w button, badge, ErrorMessage, CrudForm); 0 surowych `--dm-*` poza dozwolonymi miejscami. Wszystkie do naprawy w etapie 2.

## Etap 2 — różnice względem shadcn (zatwierdzone przez Jana 2026-10-24 „wszystko A”)
- Z decyzji: promień kontrolek `rounded-lg` = 6 px (`--radius`); bez cieni (R01.1); ramka pól i outline `--border-strong` (WCAG 1.4.11); hover primary `bg-primary-hover` (K2); destructive `text-destructive-foreground`; fokus pełnym `--ring` bez przezroczystości; przejścia tylko kolor/ramka, `--motion-fast`, wyłączone przy reduced motion; tekst w kontrolkach `text-base` 14 px (L1); warianty przycisku: primary (jeden na ekran, R01.5), secondary, outline, ghost, destructive, link.
- Luki rozstrzygnięte: (1) wysokość kontrolek 40 px = wiersz listy; (2) rozmiary przycisku `default` 40 + `sm` 32 + `icon`/`icon-sm`; (3) fokus: obrys 2 px `--ring`, odsunięty 2 px; (4) link w tekście zawsze podkreślony (WCAG 1.4.1); (5) checkbox 16 px, cel kliknięcia 24×24 (WCAG 2.5.8), promień 4 px.
- Gałąź robocza: `feat/design-system-storybook` (od 2026-10-24, bez commitów).

## Etap 2, partia 1 — co powstało i co sprawdzono (2026-10-24 12:50)
- CLI: `npx shadcn@latest add input textarea label checkbox` (Button już był, przerobiony w miejscu). Po komendzie `package.json` bez zmian (nic do usuwania).
- ==Zależność dodana poza listą z etapu 1:== `tailwindcss` + `@tailwindcss/postcss` ^4.3.3 (dev) w `packages/ui` — Storybook nie kompilował Tailwinda (strony Foundations miały style inline), więc komponenty wyglądałyby bez klas. Te same wersje co w `packages/app`, w lockfile nic nowego. Do zatwierdzenia przez Jana. Plik `postcss.config.mjs` + `.storybook/preview.css` (`@import 'tailwindcss'` + `globals.css`).
- Komponenty: `components/ui/button.tsx` (warianty default/secondary/outline/ghost/destructive/link, rozmiary default/sm/icon/icon-sm — usunięte xs/lg/icon-xs/icon-lg, nikt ich nie używał), `input.tsx` (eksportuje też `fieldClasses`), `textarea.tsx`, `label.tsx`, `checkbox.tsx`; `backend/forms/FormField.tsx` (etykieta, Required/Optional, podpowiedź, błąd; `aria-describedby` błąd→podpowiedź, `aria-invalid`, `required`). Klasy `dark:` usunięte. „Link i akcja tekstowa” to `Button variant="link"` (+ `asChild` z `<a href>`), bez nowego komponentu.
- Tokeny dopisane (bez zmiany istniejących): `--density-control-height` (= wiersz listy 40 px), `--density-control-height-sm` (32 px) w `tokens.css`; `--spacing-control`, `--spacing-control-sm` w `@theme` (klasy `h-control`, `size-control-sm`).
- Podgląd stanów: `.storybook/preview.css` przedefiniowuje warianty `hover`, `focus-visible`, `active` tak, by działały też dla `data-preview-state="hover|focus|active"` — tylko w Storybooku. Blok `.storybook/blocks/StateMatrix.tsx` (tabela stanów w przewijanym regionie + ramka 320 px).
- Dokumentacja: 6 stron MDX w `src/docs/primitives/` (Button, Link and text action, Input, Textarea, Label and form field, Checkbox), każda 13 sekcji (zmierzone w zbudowanym Storybooku: 13 nagłówków „N.” na każdej stronie, 6–8 `<table>`, 0 surowych kresek). 6 plików stories, 43 stories, z tego 9 z play function (klik, klawiatura, walidacja po opuszczeniu pola, obszar 24×24 przez `elementFromPoint`).
- Bramki: `lint:tokens` — 0 trafień w plikach partii; w repo 30 → ==19== (zostały: badge 11, card 2, table 2, CrudForm 2, ErrorMessage 2 — badge w partii 2, reszta później). `test:lint-tokens` 10/10. `test` 43/43, pokrycie 100% (152 instrukcje, 133 gałęzie). `test:storybook` 37/37 z a11y `error`, 0 naruszeń. `pnpm lint` zielony, `pnpm typecheck` (cały monorepo, w tym app) zielony, `build-storybook` zielony.
- Przeglądarka (headless Chrome, `--headless=new --use-mock-keychain --mute-audio`, profil i port na przebieg, zrzuty w scratchpadzie `sb2-124734/`, `sb2-124915/`): przycisk 40 px, promień 6 px, `box-shadow: none`, fokus `2px solid` offset 2 px w `--ring`, hover primary = accent-700; pole 40 px, ramka neutral-500, hover neutral-900; checkbox 16 px, promień 4 px, `::before` −5 px (cel 24 px). Wygląd wyraźnie inny niż domyślny shadcn (ciepły akcent, obrys fokusu zamiast poświaty, ciemniejsze ramki).
- Mutacje (wszystkie cofnięte, `diff` z kopią czysty): (1) `text-white` w destructive → `lint:tokens` 20 trafień z `button.tsx:27`; (2) checkbox `before:-inset-0.5` → pada „24 × 24 px hit area”; (3) zła nazwa w play → pada „click and keyboard”; (4) usunięty `aria-label` przycisku-ikony → pada „Sizes” na `button-name` (a11y naprawdę blokuje).
- Znane: strony dokumentacji (te i Foundations) przy 320/768 px mają szerokie tabele GFM (scrollWidth 952 px) — to styl dokumentacji Storybooka, nie komponentów; macierze stanów przewijają się w swoim regionie. Do etapu 5.

### Propozycje z partii 1 do decyzji Jana
1. Zależność dev `tailwindcss` + `@tailwindcss/postcss` w `packages/ui` (powód wyżej).
2. Disabled: tło `--muted` + tekst `--muted-foreground` zamiast przezroczystości 50% z shadcn (przyciski, pola, checkbox).
3. Pressed (`active`) = te same deklaracje co hover (brak osobnego tokenu).
4. Hover destructive = podkreślenie etykiety (brak `--destructive-hover`); alternatywa: nowy token, np. danger-800.
5. Hover pola i checkboxa: ramka `--foreground`.
6. Loading przycisku: disabled + `aria-busy` + etykieta „Paying…”, bez spinnera i bez nowego propsa.
7. FormField: `necessity="required" | "optional"` — tekst „Required”/„Optional” przy etykiecie zamiast gwiazdki; oznaczać mniejszość. Etykieta zawsze nad polem.
8. Hover secondary i ghost wygląda tak samo (tint `--accent`) — zostawić czy rozróżnić.
9. `TextLink` dla linków w prozie (dziś `buttonVariants({ variant: 'link' })` na `<a>`, `inline-flex`) → na stronę „What is missing”.
10. Etykieta przycisku do ok. 4 słów / 32 znaków; formularze w kolumnie `max-w-sm`; brak licznika znaków w Textarea, dopóki spec nie poda limitu.
11. `CrudForm` przenieść na `FormField`/`Input` (usunie 2 trafienia lintera) — osobna partia, bo to warstwa panelu admina.

## Decyzje partii 1 i pytania partii 2 — przyjęte domyślnie wg rekomendacji 2026-10-24, do weryfikacji przez Jana
Jan napisał „działaj dalej” bez odpowiedzi punkt po punkcie. Przyjęte zgodnie z rekomendacją agenta; każdą można cofnąć.
1. Zależność dev `tailwindcss` + `@tailwindcss/postcss` w `packages/ui` — zostaje.
2. Disabled = tło `--muted` + tekst `--muted-foreground` (bez przezroczystości).
3. Pressed = te same deklaracje co hover.
4. Hover destructive = ==nowy token `--destructive-hover`== → surowy `--dm-danger-800: oklch(0.42 0.16 28)` (krok ciemniej niż danger-700), kontrast z białym policzony: ==9,18 : 1== (danger-700: 7,18). Źródło: K2 przez analogię do `--primary-hover`. Wdrożone w `button.tsx` (zastąpiło podkreślenie), klasa `bg-destructive-hover` w `@theme`.
5. Hover pola i checkboxa (też radio, select): ramka `--foreground`.
6. Loading przycisku = disabled + `aria-busy` + etykieta „Paying…”, bez spinnera.
7. FormField: słowa „Required”/„Optional”, oznaczać mniejszość, etykieta nad polem.
8. Hover secondary i ghost taki sam — zostaje.
9. `TextLink` → strona „What is missing”.
10. Etykiety przycisków ≤ ok. 4 słów, kolumna formularza `max-w-sm`, bez licznika znaków.
11. Migracja `CrudForm` → `FormField` odłożona do etapu 3 (wzorzec „form”).
Partia 2 (pytania sprzed partii):
- Select: lista bez cienia, ramka `--border-strong` (R01.1).
- Wiersz slotu (lista pogrupowana dniami) = komponent PRODUKTU (etap 3), nie prymityw.
- Badge: warianty statusu `neutral`/`success`/`warning`/`danger` na tokenach `--status-*`, tekst zawsze obecny (R01.3), `--radius-full` tylko tu; stare nazwy działają jako aliasy (app kompiluje się bez zmian).
- Avatar: tylko zdjęcie; bez zdjęcia (lub gdy się nie wczyta) nic nie jest renderowane, a nazwa stoi sama (PROPOZYCJA); rozmiary 24/32/40, koło.

## Etap 2, partia 2 — co powstało i co sprawdzono (2026-10-24 13:22:36)
- CLI: `npx shadcn@latest add select radio-group switch avatar --yes` (Card i Badge już były, przerobione w miejscu). `package.json` po komendzie identyczny z kopią sprzed (diff pusty) — nic do usuwania, ==zero nowych zależności==.
- Komponenty (`src/components/ui/`): `select.tsx` (wyzwalacz = `fieldClasses` z Input, 40 px; lista `position="popper"` domyślnie, `--popover`, ramka `--border-strong`, bez cienia i bez animacji wejścia; opcje 40 px, podświetlenie `--accent`, zaznaczona = pogrubienie + ✓), `radio-group.tsx` (16 px, cel 24×24 przez `::before`, kropka `--primary`), `switch.tsx` (tor 32×18, kciuk 14 px bez cienia, wył. `--border-strong`, wł. `--primary`, cel 32×24; rozmiar `sm` usunięty — poniżej 24 px), `card.tsx` (6 px, ramka `--border`, bez cienia, `p-panel` 16 px, `gap-stack`; `CardTitle` to teraz nagłówek `h2` z `as`, 20 px; nagłówek z akcją przez token `--card-header-columns`), `badge.tsx` (13 px, pigułka, 4 warianty statusu + aliasy), `avatar.tsx` (tylko zdjęcie; usunięte `AvatarFallback`, `AvatarBadge` — kropka online to A05, `AvatarGroup`). Klasy `dark:` usunięte. Eksport w `src/index.ts`.
- Tokeny dopisane (istniejące bez zmian): `--dm-danger-800`, `--destructive-hover` (+ `--color-destructive-hover` w `@theme`), `--card-header-columns: 1fr auto` (warstwa komponentowa; zamiast arbitralnego `grid-cols-[1fr_auto]`).
- Badge w aplikacji (zero zmian w `packages/app`): `admin/layout.tsx:14` (`destructive` → wygląd danger), `admin/page.tsx:52` (`default`/`destructive` → neutral/danger — „Connected” jest teraz neutralny, nie zielony), `admin/users/page.tsx:26` (`default`/`secondary` → neutral). Aliasy `default`, `secondary`, `outline`, `ghost`, `link` → neutral, `destructive` → danger.
- Dokumentacja: 6 stron MDX w `src/docs/primitives/` (Select, Radio group, Switch, Card and panel, Badge, Avatar), każda 13 sekcji. Zdjęcia do Avatar: ilustracje-zaślepki `public/storybook-photos/{marta,tomasz}.svg` (nie prawdziwe osoby; poza `src`, więc poza lintem). Stories: 6 plików, ==36 stories, 9 z play function== (klawiatura w Select i RadioGroup, klik etykiety + Space w Switch, cel 24 px w RadioGroup i Switch, brak cienia i opcje 40 px w otwartej liście, karta bez cienia/16 px/brak zagnieżdżenia, badge 13 px + pigułka, avatar: zdjęcie 40 px, brak zdjęcia = nic).
- Bramki: `lint:tokens` — ==0 trafień w plikach partii; w pakiecie 19 → 6== (zostały: ErrorMessage 2, CrudForm 2, table 2). `test:lint-tokens` 10/10. `test` (unit) 49/49, pokrycie 100% (174 instrukcje, 140 gałęzi, 66 funkcji). `test:storybook` ==73/73== z a11y `error`, 0 naruszeń. `pnpm lint` (root) zielony, `pnpm typecheck` (cały monorepo, w tym app z Badge) zielony, `build-storybook` zielony. App na :3000: `/`, `/admin`, `/admin/users` → 200.
- Przeglądarka (headless Chrome `--headless=new --use-mock-keychain --mute-audio`, własny profil i port 9347, zbudowany Storybook na :6187; zrzuty `/private/tmp/claude-502/-Users-jani-Documents-super-brain-main/507bf7ed-835c-4a24-b918-4aea32bb076f/scratchpad/sb3-132119/`): każda z 6 stron ma 13 nagłówków „N.”, 7–9 `<table>`, 0 surowych kresek, brak ekranu błędu. Pomiary: wyzwalacz Select 40 px, 6 px, ramka neutral-500, bez cienia; otwarta lista w portalu: bez cienia, ramka neutral-500, opcja 40 px, `data-theme=light` na `<html>`; Switch 32×18, hover wył. = neutral-900; Radio 16 px, fokus `solid 2px` offset 2 px; Badge 13 px, promień 9999 px, kolory status-*; Card bez cienia, padding 16 px, 6 px; Avatar 24/32/40 po wczytaniu, przy błędzie `display: none`. Wąski ekran 320 i 768: `scrollWidth` = szerokość okna.
- Mutacje (wszystkie cofnięte z kopii, `diff -q` czysty, potem pełne bramki ponownie zielone): (1) `shadow-md` na liście Select → pada „open list, 40 px options, no shadow”; (2) usunięty `::before` w Switch → pada „24 px tall hit area”; (3) a11y: tekst success w Badge na `text-border` → 5 stories pada na `color-contrast`; (4) `text-white` w Badge → `lint:tokens` 7 trafień z `badge.tsx:17`.

### Propozycje z partii 2 do decyzji Jana
1. Koło w RadioGroup, Switch i Avatar jako wyjątek od „`--radius-full` tylko w odznakach” (R01.3) — konwencja kontrolki; alternatywa: Avatar `rounded-lg`.
2. Avatar bez zdjęcia: nic (nazwa sama) — przyjęte domyślnie; w trakcie wczytywania też ukryty (możliwe przesunięcie układu o 24–40 px).
3. Select: `position="popper"` (lista pod polem) zamiast `item-aligned` z shadcn.
4. Switch: kciuk przesuwa się w `--motion-fast` (ruch = drugi nośnik stanu obok koloru); wyłączany przy reduced motion.
5. Badge: usunąć aliasy (`default`, `secondary`, `outline`, `ghost`, `link`, `destructive`) po migracji 3 miejsc w app; wtedy „Connected” = `success`, rola = `neutral`, „Local only…” = `warning` (to zmiana w app — wymaga zgody, zasada 11).
6. Badge nie jako link (`asChild` zostaje dla zgodności); bez ikon w odznakach.
7. Card: cała karta nieklikalna (akcja to przycisk w środku); `CardTitle` jako `h2` z `as` (shadcn: `div`) — zmienia semantykę w panelu admina (nagłówki h2 w kartach).
8. Switch dla „Listed in the catalogue” w ustawieniach po publikacji (zapis natychmiastowy), checkbox w formularzu publikacji — czeka na spec E02-S04.
9. Wyłączona opcja w Select/RadioGroup mówi dlaczego w treści („— no slots yet”); zajęty slot znika z listy zamiast być wyłączony.
10. Do „What is missing”: `FormField` nie owija `Select` (klonuje jedyne dziecko, a korzeń Select nie jest polem) — dziś etykieta i opis podpinane ręcznie; pole z wyszukiwaniem (combobox) dla długich list; chipy/tagi; pole zdjęcia w profilu.

## Otwarte pytania
- Brak otwartych pytań z etapu 0 (wszystkie 5 rozstrzygnięte 2026-10-20).
- Czy `lint-tokens` wchodzi do `make check` (CI) już teraz, mimo 10 trafień w prymitywach shadcn, czy po etapie 2? Propozycja: po etapie 2.
- Propozycje z etapu 1 do przyjęcia: interlinie skali, `--measure` 65ch, `--layout-max` 64rem, rozmiary ikon 16/20/24.
- Tabs dla nawigacji mentora (Sessions / Profile / Payouts) kontra płaska nawigacja R02.6 — do rozstrzygnięcia przy E02 w etapie 3.

## Etap 2, partie 3–4 — co powstało (2026-10-24) — ETAP 2 ZAKOŃCZONY (25 prymitywów)
==Partie 3–4 bez testów na prośbę Jana (szybkość ćwiczenia)==: bez unit, bez `test:storybook`, bez headless, bez mutacji, bez `build-storybook`. Sprawdzone tylko `pnpm --filter @mentorhub/ui typecheck` (zielony).
- Komponenty (`src/components/ui/`), pisane ręcznie na `radix-ui` (wzór shadcn, bez CLI — zero nowych zależności, `package.json` bez zmian; sonner NIE dodany): `alert.tsx`, `dialog.tsx`, `alert-dialog.tsx` (Confirm dialog), `dropdown-menu.tsx` (Menu), `popover.tsx`, `tooltip.tsx`, `tabs.tsx`, `skeleton.tsx`, `toast.tsx` (Radix Toast + `ToastProvider`/`useSavedToast`, tylko „saved”).
- Empty state i Error state: użyte istniejące `backend/feedback/EmptyState.tsx` i `ErrorMessage.tsx` (eksport też jako `ErrorState`); ErrorMessage przeniesiony na `--status-danger*` (usunięte `destructive/30`, `destructive/5` → −2 trafienia lintera), przycisk 40 px.
- Różnice z sekcji „do zatwierdzenia przed partią 3” wdrożone jako przyjęte domyślnie (do weryfikacji): token `--overlay` (neutral-900 / 50 %, + `--color-overlay`), bez cieni, bez animacji wejścia, fokus 2 px `--ring` offset 2 px, Confirm: Cancel `outline` z lewej z fokusem, akcja `destructive` z czasownikiem, bez zamykania tłem; Menu bez podmenu/checkbox/radio; Tooltip bez strzałki, 500 ms, tylko nazwy ikon.
- Dokumentacja: 11 stron MDX (13 sekcji, skrótowo) + 11 plików stories w `src/docs/primitives/`; wszystko wyeksportowane w `src/index.ts`.

### Propozycje z partii 3–4 do decyzji Jana
1. Token `--overlay` = neutral-900 50 %.
2. Tabs: podkreślenie 2 px `--primary` + pogrubienie dla aktywnej; Tabs vs nawigacja mentora (R02.6) nadal otwarte.
3. Skeleton bez pulsowania (ruch tylko hover/fokus).
4. Toast na Radix Toast zamiast sonner; 4 s, prawy dół, tylko potwierdzenie zapisu.
5. Tooltip ma własny `TooltipProvider` w `Tooltip` (nie trzeba dekoratora w preview).
6. EmptyState/ErrorState zostają w `backend/feedback` (jedno źródło); ewentualnie przenieść do `components/ui` w etapie 3.
7. Dopisać testy/bramki partii 3–4 (play functions, a11y, pomiary) przed wejściem do `make check`.

## Etapy 3–5 — co powstało (2026-10-24, jednym przebiegiem, zgoda Jana) — ==bez testów na prośbę Jana==
Sprawdzone wyłącznie: `typecheck` (zielony), na końcu raz `build-storybook` (zielony, 46 stron docs, 150 stories) i `lint:tokens` (==4 trafienia, wszystkie stare==: `table.tsx:50`, `table.tsx:63` `translate-y-[2px]`; `CrudForm.tsx:29` `ring-[3px]`, `CrudForm.tsx:84` `bg-destructive/10`; 0 w nowych plikach). NIE sprawdzone: unit, `test:storybook`/a11y, przeglądarka 320/768/1440, klawiatura, nakładki, mutacje, `pnpm lint` (eslint/prettier) dla nowych plików. Pokrycie unit 100% w `packages/ui` prawdopodobnie spadnie (nowe `src/components/{booking,mentors,session}` bez testów).

### Etap 3
- Komponenty produktu (`src/components/<concept>/`, eksport w `src/index.ts`): `booking/SlotList.tsx` (lista dniami, jeden RadioGroup), `mentors/MentorCard.tsx` (bez ocen), `booking/BookingRow.tsx` (+ `bookingStatusMeta`, 8 statusów → Badge z tekstem), `booking/PriceSummary.tsx`, `session/SessionEntry.tsx` (autor + rola + czas + treść), `session/SessionComposer.tsx` (sticky na dole, Enter wysyła, Shift+Enter nowa linia, blokada podwójnego wysłania, stan „zamknięta”).
- Dane przykładowe: `src/docs/fixtures.ts`. Stories `src/docs/product/product.stories.tsx` (14, stany: ładowanie, pusto, błąd, częściowe, dużo, długie) + `product.mdx`.
- Wzorce `src/docs/patterns/patterns.stories.tsx` (21 stories) + `patterns.mdx`: formularz „Set your prices” (pusty, sukces, oczekiwanie, błąd pola, błąd serwera, brak sieci; fokus na pierwszym błędzie, walidacja przy blur i submit), lista z filtrami (wyniki, aktywny filtr, brak wyników + Clear filters, pusto, ładowanie, błąd, dużo), widok szczegółów (+ nie istnieje), potwierdzenie „Decline question”, „Book and pay”, status tekstem.
- Ekrany: `src/docs/screens/e01–e05.stories.tsx` + `e01–e06.mdx` (przepływ, mapa stanów → story, praca pozostała), `Shell.tsx` (rama tylko do dokumentacji, płaska nawigacja R02.6). Tytuły w menu: `Design system/Epics/E0x …`. E01 z speca; E02–E05 = PROPOZYCJE z briefu; E06 bez ekranów (parked).

### Etap 4
- `src/docs/guide/`: Start here (charakter, 5 kroków, tabela 30 komponentów), Components (katalog z podglądem i linkiem), How to choose (7 tabel), Usage and accessibility (+ reguły produktu pilnowane przez UI), Content, What to avoid (A01–A05, wygląd AI, błędy implementacji), What is missing (luki z POSTEP + pokrycie backlogu), Contributing.
- `docs/design-system.md` (root repo, dla agentów) + sekcja „Design system (read first for any UI work)” w root `AGENTS.md` (przed „Commands”).

### Etap 5 — liczby
- Strony docs: 46 (7 Foundations, 23 Primitives, 8 Design system, 6 epików, Product, Patterns). Komponenty: 25 prymitywów + Table + 6 produktu = 32. Stories: 150. Testy interakcji (play): 18 z partii 1–2, nowych 0.

### Test agentem — ekran (do nowej sesji)
- Ekran: ==„Favourite mentors” (Ulubieni mentorzy)== z `lekcja-06/test-agentem-gotowy-prompt.txt` — nie ma go w Storybooku ani w backlogu (nowa potrzeba mentee). Lista zapisanych mentorów z filtrem po technologii; przy każdym „Remove from favourites” i przejście do profilu; stany: ładowanie, pusto (nikogo nie zapisano), błąd ładowania, brak wyników dla filtra. Na karcie: imię, nagłówek, technologie; dane w story.
- Pliki: `packages/ui/src/components/favorites/FavoriteMentors.tsx` + `FavoriteMentors.stories.tsx`.
- ==Uwaga do promptu testu==: ścieżki tokenów w gotowym prompcie (`src/tokens.css`, `src/align-tokens.css`, `src/foundations.css`, `Guidelines.mdx`) NIE pasują do tego repo → podać `docs/design-system.md`, `packages/ui/src/styles/tokens.css`, `globals.css`, `src/docs/guide/*.mdx`, `src/docs/patterns/`.
- Spodziewane luki do obserwacji: potwierdzenie usunięcia z ulubionych (Confirm dialog czy akcja odwracalna?), brak combobox, MentorCard nie ma slotu na wiele akcji.

### Propozycje etapów 3–5 — przyjęte domyślnie, do weryfikacji przez Jana
1. Waluta USD i format `$45`, daty `en-GB` „Tue 27 Oct”, 24 h, strefa widza (brief nie podaje formatów).
2. Zajęte sloty ukryte w SlotList; dni jako `role="group"` z nazwą.
3. MentorCard jako wiersz listy (nie kafel), imię = link do profilu, awatar dekoracyjny; brak slotów → Badge „No slots yet”.
4. Statusy rezerwacji i etykiety (`Paid`, `Awaiting payment`, `Declined · refunded`, `Mentor no-show · refunded`, `Missed`, `Cancelled`, `Held`, `Refunded`) i ich kolory.
5. PriceSummary nie pokazuje prowizji mentee (R11 to reguła wypłat).
6. SessionEntry: tekst sesji 16 px (`text-lg`, L1), kod w `pre` z ramką; SessionComposer zastępowany zdaniem po zakończeniu / przed startem.
7. Wzorzec formularza: symulacja API funkcją async w story zamiast handlerów MSW.
8. Usuwanie filtra jako przycisk „Python ×” (ghost sm) zamiast chipa (chipy w „What is missing”).
9. Ekrany E02–E05 (edycja profilu, katalog, checkout, płatność odrzucona, moje sesje, sesje mentora, wypłaty, pokój sesji, miary admina) i ich teksty; trzymanie terminu 15 min przy weryfikacji e-maila i 10 min przy odrzuconej płatności.
10. Płaska nawigacja w ekranach (Sessions / Profile / Payouts) zamiast Tabs (R02.6) — rozstrzyga otwarte pytanie, do potwierdzenia.
11. Katalog Components: część pozycji (portale, Select, Dialog) pokazuje nazwę zamiast podglądu na żywo.
12. `docs/design-system.md` w root `docs/` + sekcja w root `AGENTS.md` (zmiana poza `packages/ui` dozwolona promptem).
13. Ekrany w menu pod `Design system/Epics/…` (strona epiku = docs + stories ekranów).

## Luki z testu agentem 1 — domknięte (2026-10-24)

Źródło: `lekcja-06/test-agentem-wynik-1.md`. Ekran testowy (`components/favorites/`) bez zmian. Bez testów (tempo ćwiczenia), tylko typecheck.
- Komponenty: `PageHeader` (`src/backend/layout/`), `FilterBar` + `FilterChip` + `resultCount` (`src/backend/filters/`), `RowAction` (`src/backend/feedback/`); `MentorCard`: `variant="compact"`, `hideNoSlotsBadge`, `unavailable`, `busy`. Eksport w `index.ts`; strona `Patterns/Screen building blocks` (`src/docs/layout/`, MDX 13 sekcji + stories).
- Stany: akcja w toku („Removing…”, `aria-busy`), błąd akcji inline + „Try again”, filtry przy ładowaniu (aktywne, licznik pusty) / błędzie i pustym (ukryte), mentor niedostępny.
- Zasady (DS + how-to-choose / usage / content / contributing): ekran bez `default`, akcje w wierszu na telefonie (`sm`, z prawej), EmptyState link vs przycisk, tokeny `--field-width-sm/md` → `w-field-sm/md` (zamiast `w-56` w Patterns, E05, Select), viewporty 320/768/1440 w `preview.tsx`, miejsca stories, etykiety akcji, licznik `role=status`.
- Sprzeczności: UK w tekstach UI / US w kodzie; colocate (app) vs `components/<concept>/` (packages/ui); `skeleton.tsx` → `rounded-lg`; `LoadingMessage` deprecated; reguły listy przeniesione do DS.
- ==Przyjęte domyślnie, do weryfikacji==: typografia h1, zero przycisków `default`, filtry aktywne przy ładowaniu, szerokości 14/20 rem, akcja w wierszu z prawej na telefonie, pisownia UK/US, EmptyState `asChild`.
- ==Decyzja Jana==: undo po usunięciu z ulubionych (Toast z „Undo” vs brak) — w „What is missing”.

## Następny krok
1. ==Test agentem — przebieg 2 w świeżej sesji== (ten sam ekran „Favourite mentors”), porównać liczbę ZGADUJĘ z przebiegiem 1 (14).

(poprzedni zapis:)
## Następny krok (przed testem 1)
1. ==Test agentem w nowej sesji== — ekran „Favourite mentors” (opis wyżej), poprawione ścieżki w prompcie; luki agenta → dokumentacja albo „What is missing”.
2. ==Wartości spoza tokenów w aplikacji== — `(marketing)/page.tsx` (12 kolorów), `table.tsx` ×2, `CrudForm` ×2 (migracja na `FormField`), aliasy Badge w app (wymaga zgody, zasada 11).
3. ==Joby CI== — `lint:tokens` i `test:storybook` (a11y error, oba motywy) do `make check`/GitHub Actions, po dopisaniu testów pominiętych w etapach 2–5 (play functions, a11y, przegląd 320/768/1440).
4. Decyzje Jana: propozycje partii 2 (1–10), 3–4 (1–7), etapów 3–5 (1–13).

(poprzedni zapis:)
Etap 3 — komponenty produktu, wzorce, ekrany. Krótki plan:
1. Komponenty produktu: wiersz slotu (lista dniami), karta mentora, wiersz rezerwacji ze statusem, podsumowanie ceny.
2. Wzorce: formularz (migracja `CrudForm` → `FormField`), lista z filtrami, potwierdzenie destrukcyjne, stany pusty/błąd/ładowanie.
3. Ekrany: katalog mentorów, profil + rezerwacja, moje rezerwacje, panel mentora (decyzja Tabs vs płaska nawigacja).
4. Przed etapem 3: decyzje Jana o propozycjach partii 2 (1–10) i 3–4 (1–7); dopisanie testów partii 3–4.

(poprzedni zapis:)
Czekam na „dalej” Jana (i ewentualne korekty decyzji przyjętych domyślnie oraz propozycji 1–10 z partii 2) → Etap 2, partia 3: Alert, Dialog, Confirm dialog, Menu, Popover, Tooltip (pozycje z zatwierdzonego planu 25 prymitywów; po partii 3 zostają: Tabs, Skeleton, Empty state, Error state, Toast).

Różnice względem shadcn do zatwierdzenia przed partią 3:
- Alert: bez cienia i bez ikony jako jedynego nośnika; warianty tylko `neutral` / `danger` / `warning` / `success` na `--status-*` (shadcn ma `default` + `destructive`); tytuł 14 px pogrubiony, treść „co się stało i co zrobić” (L3); ramka `--border` + tło `--status-*-bg`; rola `alert` tylko dla błędów po akcji, inaczej `status`. Błąd wymagający działania nigdy jako toast (prompt).
- Dialog: promień 6 px (shadcn `rounded-lg` = 8 px w ich skali), ==bez cienia== — oddzielenie ramką `--border-strong` + przyciemnienie tła; nakładka: shadcn `bg-black/50` łamie lint → nowy token `--overlay` (PROPOZYCJA: neutral-900 z przezroczystością w pliku tokenów); bez animacji wejścia (ruch tylko hover/fokus) — shadcn ma zoom/fade; przycisk zamknięcia 40 px z `aria-label`, padding `p-panel`, szerokość `max-w-md`.
- Confirm dialog (AlertDialog Radix): nazwa obiektu w pytaniu, „Cancel” jako `outline` z lewej i fokus początkowy na nim (rezygnacja łatwa), akcja `destructive` z czasownikiem („Decline question”, „Cancel booking”) — nie „OK”; brak zamykania kliknięciem w tło.
- Menu (DropdownMenu): jak lista Select — `--popover`, ramka `--border-strong`, bez cienia, pozycje 40 px, `--accent` przy podświetleniu; bez podmenu, checkboxów i radio w menu (shadcn je ma — usunąć jako spoza planu); pozycja destrukcyjna tekstem `--destructive`.
- Popover: ten sam wygląd powierzchni co menu, padding `p-panel`, bez strzałki; tylko dla treści dodatkowej, nie dla formularzy.
- Tooltip: shadcn ma ciemne tło `bg-foreground` + strzałkę + animację → propozycja: `--foreground` tło z `--background` tekstem (kontrast 16,25), 13 px, bez strzałki, opóźnienie 500 ms, tylko dla nazw ikon (informacja niezbędna nigdy w tooltipie — prompt); `TooltipProvider` w preview Storybooka.
- Wspólne: fokus 2 px `--ring` offset 2 px; portal dostaje motyw z `<html>` (zasada 9); `z-50` zostaje.

(poprzedni zapis:)
Czekam na „dalej” Jana i decyzje 1–11 z partii 1 → Etap 2, partia 2: Select, RadioGroup, Switch, Card/Panel, Badge (status), Avatar (tylko zdjęcie).

Różnice względem shadcn do zatwierdzenia przed partią 2:
- Select: wyzwalacz jak pole (40 px, `rounded-lg`, `--border-strong`, fokus 2 px `--ring`), lista w `--popover` z ramką `--border`, ==bez cienia== (R01.1) — pytanie: czy menu rozwijane bez cienia wystarczająco odcina się od tła? Propozycja: ramka `--border-strong`. Wysokość opcji 40 px (K1).
- RadioGroup: koło 16 px, cel 24×24 (WCAG 2.5.8), zaznaczenie `--primary`; wariant „lista slotów pogrupowana dniami” jako wiersze 40 px rozdzielone `--border` (Etap 0 decyzja 4, R01.1) — czy wiersz slotu jest częścią prymitywu, czy komponentem produktu (propozycja: produkt, etap 3).
- Switch: tor 32×18 zamiast 32×18.4 shadcn, kciuk bez cienia, włączony `--primary`, wyłączony `--border-strong`; zawsze z etykietą tekstową stanu? (propozycja: etykieta opisuje ustawienie, stan czyta czytnik).
- Card/Panel: `rounded-lg` 6 px (shadcn `rounded-xl`), bez cienia, ramka `--border`, padding `p-panel` 16 px (shadcn 24 px), bez `CardAction` w siatce z arbitralnymi wartościami (`grid-cols-[1fr_auto]` → flex); zakaz karty w karcie (A01).
- Badge: `rounded-full` tylko tutaj (R01.3), tekst 13 px, warianty statusu success / danger / warning / neutral (tokeny `--status-*`), ==zawsze z tekstem==; usunąć wariant `default` w kolorze `--primary` (akcent tylko na akcji głównej, K2) — dotyka `packages/app` (layout, admin/users używają `default`/`destructive`) → potrzebna decyzja: mapowanie `default`→`neutral`, `destructive`→`danger` z aliasem, żeby app się kompilował.
- Avatar: tylko zdjęcie, bez fallbacku z inicjałami (Etap 0 decyzja 2, A01); co pokazać, gdy zdjęcia brak — nic (sama nazwa obok) czy neutralny kształt? Rozmiary 24/32/40 px, okrągły czy `rounded-lg`?

(poprzedni zapis:)
Etap 2, partia 1 — różnice zatwierdzone (sekcja wyżej), można instalować i budować.

(poprzedni zapis:)
Czekam na „dalej” Jana → Etap 2, partia 1 (Button, Link/text action, Input, Textarea, Label + FormField, Checkbox): najpierw lista różnic względem domyślnego shadcn (wysokości, promień, obramowania, odstępy, fokus) z decyzją przy każdej; potem `npx shadcn@latest add` w `packages/ui`, dopasowanie do tokenów, 13-sekcyjne strony MDX, stories z macierzą stanów (`data-preview-state`), play functions, a11y bez naruszeń; po każdej komendzie CLI kontrola `package.json`.

## Test agentem — przebieg 2 (2026-10-24 ~14:20)
Świeży agent, ekran `components/favorites-run2/`, wynik `lekcja-06/test-agentem-wynik-2.md`. Na 42 decyzje: REGUŁA 28 / PRZYKŁAD 9 / ZGADUJĘ 5 (przebieg 1: 20 / 8 / 14). Wartości na sztywno: 0. Luk 18, w tym 5 sprzeczności przykład vs zasada (FilterBar przy błędzie, ręczny chip w Patterns, „czasownik + obiekt” vs RowAction „Remove”, undo, kształt szkieletu). Następny krok: domknąć luki przebiegu 2 albo uznać resztę za świadomie odłożoną (decyzja Jana).
- Decyzja Jana 2026-10-24 „B”: luki przebiegu 2 świadomie odłożone, wpisane w `src/docs/guide/what-is-missing.mdx` (sekcja „Deferred after agent test run 2”). Następny krok: prompt „Wartości spoza tokenów w aplikacji”.
- 2026-10-24 ~14:35 prompt „Wartości spoza tokenów w aplikacji” (zgoda Jana „tak”): `(marketing)/page.tsx` 15 trafień → 0 (gradient usunięty, A01; bez nowych tokenów), Badge w admin na `success`/`danger`/`warning`/`neutral` („Connected” znów zielony), aliasy Badge usunięte. `lint-tokens packages/app/src` OK, typecheck zielony, `/`, `/admin`, `/admin/users` 200. Treść strony startowej (MentorHub, wideo) sprzeczna z briefem — do przebudowy osobno.
- 2026-10-24 ~15:00 joby CI (decyzja Jana „A”): `tokens` (`make lint-tokens` = linter na `packages/ui/src` + `packages/app/src` + test lintera) i `storybook` (`make test-storybook`, Playwright Chrome) w `.github/workflows/ci.yml`; pozostałe joby nietknięte. Przed tym 4 ostatnie trafienia (CrudForm 2, table 2) poprawione → linter OK na obu katalogach. Joby zadziałają w PR; `storybook` może być czerwony, dopóki nie dopiszemy testów/sprawdzeń partii 3–4 i etapów 3–5 (tryb szybki). Nie są wymaganymi checkami `develop`. ==LEKCJA 06 ZAMKNIĘTA.==
