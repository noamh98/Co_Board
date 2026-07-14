# 02 — UX, Accessibility & Cross-Platform (Parts 17–19)

> Stage C output of the SaaS transformation plan (see `COBOARD_TASK.md`, Parts 17–19).
> Date: 2026-07-07 · Authors: UX Auditor (this document) + Architect (Part 18.D only).
> Source of truth: code. Grounded in `app/src/presentation/**`, `app/src/styles/**`,
> `app/src/presentation/ui/tokens.css`, `app/index.html`, `app/vite.config.ts`,
> `app/e2e/*.spec.ts`, `app/src/domain/scanning/`, `app/src/services/access/`.
> No app build/browser session was available in this environment — items that need a
> running instance are marked **[TBD visual verification]**.

---

## Part 17.1 – Heuristic Audit (Nielsen's 10)

| # | Heuristic | Score /5 | Evidence | Fix |
|---|---|---|---|---|
| 1 | Visibility of system status | 4 | `sync-status` chip (`styles/misc.css`), toast via `services/notify/notifyService.ts` + `app-shell.css` `toast-in`, `aria-live="polite"` on `SentenceBar.tsx` sentence text | Add a visible "מדבר…" state while hybrid TTS falls back from cache→cloud→browser (currently silent during the ~100–300ms cloud round-trip) |
| 2 | Match between system and real world | 5 | Fitzgerald key colour-coding (`domain/fitzgerald.ts`, protected in `presentation/ui/tokens.css` comment "אסור לגעת בהם כאן") is the AAC-standard convention; full Hebrew RTL (`index.html` `dir="rtl"`, `lang="he"`) | None major |
| 3 | User control and freedom | 4 | Undo/redo stack in `BuilderView.tsx` (Ctrl+Z/Y), `ConfirmDialog` (post-2.3) replaces `window.confirm` for destructive core-cell moves, `useFocusTrap` gives Escape-to-close on every modal | No 30-day "trash" surfaced in UI yet for deleted boards (see Part 15 of main audit) — dock for now |
| 4 | Consistency and standards | 3 | **Two live token files** with conflicting `--cl-primary`: `app/src/styles/tokens.css` defines green `#1F7A5C` ("Claude Design 2026") which is silently overridden by `app/src/presentation/ui/tokens.css` (coral `#E8694C`, imported after per HANDOFF §4 CSS-order invariant). No Storybook / no single source of design truth | Delete or clearly mark the green palette in `styles/tokens.css` as dead/deprecated; consolidate into one token file (see 17.3) |
| 5 | Error prevention | 4 | `ConfirmDialog` on core-cell move violations, `QuickStartWizard.tsx` blocks empty profile name (`nameError`, `role="alert"`), Firestore invite codes are transactional (`acceptInvite.ts`) | — |
| 6 | Recognition rather than recall | 4 | Icon+label cells (`CellButton.tsx`), toolbar shows built-sentence tokens live (`.board-toolbar__token`) | — |
| 7 | Flexibility and efficiency of use | 5 | Rich `AccessSettings` domain model (`domain/accessSettings.ts`): dwell time, scan mode/speed, double-tap prevention, activate-on-release, cell image scale, toolbar button scale, high-contrast toggle — all exposed in `AccessSettingsPanel.tsx` | — |
| 8 | Aesthetic and minimalist design | 4 [TBD visual] | Clean single-purpose grid, warm coral rebrand (F6) | Confirm visually — could not render the app in this session |
| 9 | Help users recognize/diagnose/recover from errors | 4 | `translateFirebaseError.ts` maps Firebase errors to Hebrew; wizard/auth forms use `role="alert"` | — |
| 10 | Help and documentation | 2 | No first-run tour, tooltip layer, or in-app help found under `presentation/` | Add a lightweight first-run overlay for parents/therapists (skip-able, not shown to the child play surface) |

---

## Part 17.2 – WCAG 2.2 AA Audit

| Criterion | Status | Evidence | Fix |
|---|---|---|---|
| 1.3.1 Info & Relationships | **Fail** | `BoardView.tsx:62-94` — container `role="grid"`, each cell `role="gridcell"`, **no `role="row"` wrapper** (cells are positioned via CSS `grid-area`, not DOM row order). Waived axe rules `aria-required-parent`/`aria-required-children` in `app/e2e/settings-a11y.spec.ts:16` | See concrete fix below |
| 1.4.3 Contrast (Minimum) | **Fail** | `--cl-primary: #E8694C` on white = **3.20:1** (need 4.5:1); `--cl-primary-dk: #CE5132` on white = **4.33:1** — also fails. Waived axe `color-contrast` (`settings-a11y.spec.ts:16`) | See concrete fix below |
| 1.4.11 Non-text Contrast | Partial **[TBD]** | Cell border uses `color-mix(in srgb, var(--cell-tint) 74%, #16243a 22%)` (`styles/board.css:29`) — likely ≥3:1 against background by construction, but not verified per-theme with a contrast checker | Run automated non-text-contrast check (axe `color-contrast-enhanced` / manual) across all 4 themes once dark/HC/sensory-calm exist |
| 2.1.1 Keyboard | Partial | Modals fully keyboard-operable (`useFocusTrap.ts`: Tab cycle, Escape, focus restore). Scanning mode gives 1-switch/keyboard access (`useScanning.ts`, Space/Enter). **But** default (non-scanning) board navigation has no roving-tabindex/arrow-key grid nav — every cell is its own Tab stop, so an 8×8 board = 64 sequential Tab stops to reach the last cell | Add optional arrow-key grid navigation (`role="grid"` semantics: Up/Down/Left/Right move focus, Tab exits the grid) as an alternative to full Tab traversal |
| 2.4.3 Focus Order | **[TBD verify]** | DOM order in `BoardView.tsx` follows `board.placements` array order, not guaranteed row-major visual order (cells are visually placed by explicit `gridColumn`/`gridRow` style, independent of array order) — Tab order may not match reading order for boards where placements were reordered by drag-drop history | Sort `rendered` by `(p.row, p.col)` before mapping, independent of `board.placements` insertion order |
| 2.4.7 Focus Visible | **Pass** | Global `:focus-visible { outline: 3px solid var(--cl-primary) }` (`styles/misc.css:24-26`), plus per-component overrides (`.cell:focus-visible`, `.tbtn:focus-visible`, `.choice:focus-visible`) | — |
| 2.5.5/2.5.8 Target Size | Partial | `--cell-min: 92px` desktop (**Pass**, exceeds AAA 44px and PRD's 60px target). At `max-width:600px` `.cell` drops to `--target-sm: 44px` (`styles/board.css:96`) — meets AA (24px) and just meets AAA (44px) but **misses the product's own ≥60pt AAC guidance** on the exact devices (cheap Android phones) where motor-impaired users are most likely to be. `.tbtn` (board-toolbar icon buttons: print/speak/delete/clear/home) base size is **36px** (`presentation/ui/tokens.css:144-146`) — passes AA, **fails AAA and fails the 60px AAC target** at default scale | Raise mobile `.cell` floor to ≥60px; raise `.tbtn` base to ≥44px (ideally 60px) or make the existing `buttonScale` setting default higher on touch devices |
| 2.3.3 Animation from Interactions | **Pass** | Global reduced-motion kill-switch already exists: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important } }` (`styles/misc.css:11-21`), plus explicit `.cell`/`.tbtn`/`.brandbar__menu`/`.modal--drawer` overrides | None — this is a genuine strength, call it out positively |
| 3.2.1/3.2.2 On Focus/On Input | **Pass** | No auto-submitting inputs found; `QuickStartWizard` requires explicit "הבא" click between steps | — |
| 3.3.1/3.3.2 Error ID & Labels | **Pass** | `QuickStartWizard.tsx:131-135` (`role="alert"`), all inputs have `<label htmlFor>` pairs (e.g. `profile-name`) | — |
| 3.3.3 Error Suggestion | Partial **[TBD]** | `translateFirebaseError.ts` gives Hebrew messages but not verified for actionable next-step guidance in every case | Audit each mapped message for "what to do next" phrasing |
| 4.1.2 Name, Role, Value | Partial | Buttons/inputs generally well-labelled (`aria-label` on every `CellButton`, `SentenceBar` button); one prior finding already fixed (BoardToolbar `aria-label` on a bare `div` → `role="group"`, per HANDOFF §7 row `3.1`). Remaining gap is the same grid/gridcell structure issue as 1.3.1 | Same fix as 1.3.1 |

### Concrete fixes for the two waived findings

**(a) `--cl-primary` contrast (1.4.3).** `#E8694C` on white = 3.20:1; even `--cl-primary-dk` (`#CE5132`) only reaches 4.33:1 — both fail 4.5:1. A darkened coral that preserves hue and passes AA:

```
--cl-primary-a11y: #BA543D;  /* measured 4.75:1 on #FFFFFF */
```
Apply this value (or `color-mix`-derive it from `--cl-primary`) specifically for **text/icon-on-primary contexts** (button labels on `--cl-primary` background need the *inverse* check — `--cl-on-primary: #FFFFFF` on `#E8694C` is exactly the 3.20:1 failure). Two compliant options: (1) darken the fill to `#BA543D` and keep white text, or (2) keep `#E8694C` as a decorative/background-only brand colour and require all *text* to render in `--cl-primary-dk` **only after also darkening it** to ≥4.5:1 (current `-dk` value still fails). Recommend option (1) — a single token change (`presentation/ui/tokens.css:28-29`) — since it's brand-safe (still visually "coral") and requires no per-component rework. Re-verify the dark-mode (`#F0825F` on `#2B221C` = 5.98:1, already passes) and high-contrast (`#FF7A57` on `#000` = 8.17:1, passes) variants unaffected.

**(b) Grid ARIA structure (1.3.1/4.1.2).** Two viable strategies, given the constraint noted in-code that cells are positioned via `grid-area`, not DOM order (`BoardView.tsx:84`):
- **Strategy 1 (keep grid semantics):** Wrap cells in per-row `<div role="row">` groups. Requires bucketing `rendered` by `p.row` before mapping (already have `p.row`/`p.col` on every placement) — the *visual* CSS Grid placement (`gridColumn`/`gridRow` inline styles) is unaffected by DOM nesting since CSS Grid placement of grandchildren still works if each `role="row"` wrapper itself is `display: contents` (removes it from the box layout while keeping it in the accessibility tree). This is the minimal-risk fix: `.board__row { display: contents; }`.
- **Strategy 2 (drop grid semantics):** Switch container to `role="group"` with `aria-label={board.name}` and each cell to a plain `aria-label`-carrying `<button>` (already has one) with no `role="gridcell"`. Simpler, but loses row/column announcement for screen-reader users navigating a large board (worse for VoiceOver rotor "table" navigation).
Recommend **Strategy 1** — `display:contents` row wrappers — since it fixes the axe finding without touching the CSS Grid placement logic that `moveCell`/`BuilderView` depend on.

### תקן ישראלי 5568 & EN 301 549 mapping

תקן 5568 formally adopts WCAG 2.0 (and by ministry guidance, practice now tracks WCAG 2.1/2.2) as Israel's binding digital accessibility standard under **תקנות שוויון זכויות לאנשים עם מוגבלות (שירות נגיש), תשע"ג-2013**. EN 301 549 (EU) additionally covers non-web software/hardware and procurement language — relevant only if/when Co_Board pursues EU institutional sales. An Israeli **הצהרת נגישות** (accessibility statement) must include, per the Ministry of Justice's Accessibility Regulations guidance:
1. Scope covered (which app/site, which version/date).
2. Conformance level claimed (should read: "Partially conforms to WCAG 2.2 AA" while the two waived findings remain open — do not claim full AA until 1.4.3/1.3.1 above are fixed).
3. Known accessibility gaps and their user-facing workarounds.
4. Name/role/contact of the **רכז נגישות** (accessibility coordinator) required by the regulations.
5. Date of last accessibility audit and testing method (manual + automated, list assistive tech used).
6. Complaint/feedback channel and legal escalation path (נציבות שוויון זכויות לאנשים עם מוגבלות).
7. Physical accessibility statement is N/A for a pure software product — state so explicitly to avoid ambiguity.

---

## Part 17.3 – Design System Proposal

### Token architecture — what exists today

| Layer | File(s) | State |
|---|---|---|
| Base palette + spacing/typography/radius/shadow/z-index/safe-area | `app/src/styles/tokens.css` | Defines a **green** `--cl-primary` (`#1F7A5C`) — dead code, overridden (see 17.1 #4) |
| Brand remap (coral) + dark + high-contrast themes | `app/src/presentation/ui/tokens.css` | Live source of truth; imported last per HANDOFF CSS-order invariant; already ships `.dark-mode`/`prefers-color-scheme:dark` and `.high-contrast` classes |
| Motion | Split across `styles/misc.css` (global reduced-motion kill-switch) + per-component transitions | Solid reduced-motion coverage already; no named motion-duration tokens (durations are hardcoded per rule: `0.12s`, `0.15s`, `0.28s`, etc.) |
| Utility classes | `presentation/ui/tokens.css:117-227` | Ad hoc (`.flex-col`, `.row`, `.gap-*`) — fine as a start, not a full utility system |
| Component CSS | 14 files under `app/src/styles/` | Solid organization (post-refactor 2.2), but no component-scoped CSS Modules — global class names |

### Proposed full token set

```
Color (semantic, 4 themes: light / dark / high-contrast / sensory-calm):
  --cl-bg, --cl-surface, --cl-surface-alt, --cl-ink, --cl-muted, --cl-border
  --cl-primary, --cl-primary-dk (≥4.5:1 fixed per 17.2a), --cl-primary-tint, --cl-on-primary
  --cl-error, --cl-error-bg, --cl-success, --cl-success-bg, --cl-warn, --cl-warn-bg
  --cl-accent (scan ring), --cl-focus-ring
  --cat-{people,actions,food,feelings,places,objects}-{bg,bd}  (existing Fitzgerald tints — keep as-is, do not merge into generic scale)

Spacing (4pt grid — already correct): --sp-1..--sp-12 (keep)

Radius: --r-xs/sm/md/lg/full (keep; consolidate the --co-r-* duplicate scale in presentation/ui/tokens.css into the same names)

Typography:
  --font-body: 'Assistant', 'Heebo', 'Rubik', system-ui, sans-serif   [Assumption: Heebo/Rubik as fallbacks]
  --font-dyslexic: 'OpenDyslexic', 'Heebo', system-ui, sans-serif      [Assumption — see below]
  --tx-xs..--tx-2xl, --tx-cell, --tx-cell-lbl  (keep existing fluid clamp() scale — already good practice)

Motion (new — name the currently-hardcoded durations):
  --dur-fast: 0.08s   --dur-base: 0.15s   --dur-slow: 0.28s
  --ease-standard: cubic-bezier(0.2,0.7,0.3,1)
  All bound by the existing global prefers-reduced-motion override (no change needed there)

Touch targets:
  --target-min: 48px (WCAG AA reference)  --target-aac: 60px (product floor)  --target-motor: 88px (motor-impairment mode)
```

### Component library (~25 components) with a11y notes

| Component | Current file | A11y note |
|---|---|---|
| Button (icon `.tbtn`, action `.wizard__btn`, etc.) | scattered | Consolidate into one `<Button>` with `size="sm|md|lg|motor"` mapping to the touch-target tokens above; enforce ≥44px at `sm` |
| Cell (AAC tile) | `CellButton.tsx` | Already solid: `aria-label`, decorative `alt=""`, focus ring. Add roving-tabindex mode for `role="grid"` navigation |
| Grid / Board | `BoardView.tsx` | Needs the row-wrapper fix (17.2) |
| SentenceBar | `SentenceBar.tsx` | Already has `aria-live="polite"`; add `aria-atomic="true"` so screen readers read the full sentence, not just the diff |
| Modal | `presentation/ui/Modal.tsx` + `useFocusTrap.ts` | Solid — reuse as the base for every dialog below |
| ConfirmDialog | `presentation/ui/ConfirmDialog.tsx` | Built on Modal — good |
| Toast | `app-shell.css` `.toast`, `notifyService.ts` | Verify `role="status"`/`aria-live` is set on the toast container **[TBD code check]** |
| Tabs | not found as a distinct component | New — needed for Settings panel sections if they grow |
| PinPad (adult lock) | referenced via lock/unlock e2e (`lock-unlock.spec.ts`) | Verify large touch targets + no auto-advance that traps low-vision users **[TBD]** |
| RecordButton (voice) | **does not exist** | New — see Part 17.4 flow 4 |
| WaveformTrimmer | **does not exist** | New — see Part 21 of main audit; pair with keyboard-operable trim handles |
| Wizard steps (progress) | `QuickStartWizard.tsx` `.wizard__progress` | Has `role="progressbar"` — confirm `aria-valuetext` in Hebrew, not just numeric |
| EmptyState | `.sentence__text:empty::before` (CSS content only) | Promote to a real component so empty-state copy is in the DOM (CSS `content` is invisible to screen readers) — currently a real a11y gap |
| Toggle | `presentation/ui/Toggle.tsx` | Confirm `role="switch"` + `aria-checked` **[TBD code check]** |
| Slider | `presentation/ui/Slider.tsx` (used for dwell time, scan speed) | Confirm native `<input type="range">` (gets keyboard for free) vs custom widget **[TBD code check]** |
| Select/Dropdown | native `<select>` in `AccessSettingsPanel.tsx`, `ShareInvitePanel.tsx` | Good — native controls are the right call for AAC users (built-in a11y) |
| GridSizePicker | `builder/GridSizePicker.tsx` | New pattern — verify label/value pairing |
| SymbolPicker | `builder/SymbolPicker.tsx` | Search input needs `aria-label`; result grid needs same grid-nav treatment as BoardView |
| CellEditor | `builder/CellEditor.tsx` | Complex form — verify field grouping with `fieldset`/`legend` |
| SceneEditor | `builder/SceneEditor.tsx` | [TBD] |
| BoardToolbar | `components/BoardToolbar.tsx` | Already fixed to `role="group"` |
| NewBoardChooser | `wizard/NewBoardChooser.tsx` | 3-card chooser, `.choice:focus-visible` present — good |
| SmartCreatePanel | `wizard/SmartCreatePanel.tsx` | AI board generation — needs live-region status for loading/error/success (`.smart-create__state--*` classes exist but verify `aria-live`) **[TBD]** |
| UsageDashboard | `analytics/UsageDashboard.tsx` | Charts need text-equivalent summaries, not just visual |
| ShareInvitePanel / AcceptInviteScreen | `portal/*.tsx` | See Part 17.4 flow 5 for redesign |
| AdminApprovalPanel | `auth/AdminApprovalPanel.tsx` | Internal-only; low priority for a11y polish |
| PendingApprovalScreen / RejectedScreen | `auth/*.tsx` | Ensure status is announced (`role="status"`), not just visually styled |

**Storybook recommendation:** adopt Storybook 8 (Vite builder — already on Vite 7, low integration cost) scoped to `presentation/ui/*` first, then `components/*`. Add the `@storybook/addon-a11y` (axe-core in Storybook) so every component gets a contrast/ARIA check pre-merge, closing the gap where today only two Playwright specs run axe on full pages.

### Themes

| Theme | Direction | Status |
|---|---|---|
| Light | Warm coral/sand (current default) | Exists (`presentation/ui/tokens.css:16-55`) |
| Dark | Warm coral-dark, auto via `prefers-color-scheme` or `.dark-mode` | Exists (lines 57-97) |
| High-contrast | Black/white + strong coral accent | Exists (lines 99-109), exposed in settings (`highContrast` toggle, `AccessSettingsPanel.tsx:148-150`) |
| Sensory-calm | **New** — desaturated, low-chroma pastel (muted sage/sand, no coral saturation spikes), same contrast ratios as light theme, slower/absent hover transforms | Does not exist — propose `--cl-*` overrides under a `.sensory-calm` class, reusing the light theme's contrast-verified text colours but replacing `--co-brand`/category tints with lower-saturation equivalents. Toggle placement: `AccessSettingsPanel` next to `highContrast`. |

### Dyslexia-friendly font & type scale

**[Assumption]** Bundle **OpenDyslexic** (OFL-licensed, works offline) as an opt-in font, toggled alongside the existing Assistant/system-ui stack — do **not** replace Assistant by default, since OpenDyslexic's letterforms are contested outside the dyslexia community and the app already ships a clean humanist sans (Assistant) which is itself reasonably legible. Keep the existing fluid `clamp()` type scale (`styles/tokens.css:56-65`) — it's already good responsive practice; dyslexia mode should mainly widen `line-height` (≥1.5) and `letter-spacing` (≥0.12em on cell labels), which OpenDyslexic pairs well with.

### Touch targets — current vs proposed

| Element | Current | ≥60×60pt (product floor) | ≥88×88pt (motor mode) |
|---|---|---|---|
| `.cell` desktop | 92px (`--cell-min`) | ✅ | ❌ (needs explicit motor-mode scale-up) |
| `.cell` mobile (`≤600px`) | 44px (`--target-sm`) | ❌ **fails product's own floor** | ❌ |
| `.tbtn` (toolbar icons) | 36px base | ❌ | ❌ |
| `.sentence__btn` / `.sentence__speak` | 60px | ✅ | ❌ |
| `.choice` (NewBoardChooser cards) | large (padding-driven, no fixed height) [TBD measure] | likely ✅ | [TBD] |

Recommendation: raise the mobile `.cell` floor to 60px and make `--target-motor: 88px` selectable via the existing `cellImageScale`-style mechanism, driven by a new "מצב מוטורי" (motor mode) toggle that also raises `.tbtn` to match.

---

## Part 17.4 – Key Flow Redesigns

### 1. Onboarding (family / therapist / school)
**Current:** Single email/password registration (`RegisterPanel.tsx`) → **every** account, regardless of type, sits in `PendingApprovalScreen.tsx` until a human admin calls `approveUser` (`functions/src/approveUser.ts`). No branching by role at signup.
**Problems:** Does not scale past a handful of beta families (manual bottleneck, noted as a gap in `docs/00-discovery.md §7.3`); no differentiation between a parent self-serving vs. a clinic onboarding 20 families vs. a school.
**Redesigned flow:**
1. Signup asks "מי אתה?" — הורה/משפחה · קלינאי(ת) תקשורת · צוות בית ספר.
2. **Family tier:** self-serve, instant access after email verification (no admin gate) — lowest risk, matches COPPA-style parent-consent-only model already implicit in the child-scoped data model.
3. **Therapist tier:** email verification + license-number field (soft-verified now, hard-verified later via HMO/Ministry integration) — auto-approved with a "pending verification" badge, full access from minute one but flagged for async admin review within 48h.
4. **School tier:** requires an institutional invite code from an already-approved school admin (bootstraps trust chain) — falls back to today's manual admin approval only for the *first* school admin per institution.
**Success metric:** time-to-first-board-created for a new family drops from "hours/days waiting for approval" to <5 minutes.

### 2. Board builder
**Current:** Drag-drop cell placement with undo/redo exists (`BuilderView.tsx`), grid size picker, AI board generation (`AiBoardPanel.tsx`), template library (`domain/boardTemplates.ts`).
**Problems:** No templates *gallery* UI evidence beyond `NewBoardChooser`'s 3-card entry point; no camera "quick add" (photograph an object → auto-symbol); ARASAAC search exists (`SymbolPicker.tsx`) but bulk multi-select add not confirmed **[TBD code check]**.
**Redesigned flow:**
1. Entry unchanged (NewBoardChooser: blank / template / AI).
2. Template gallery becomes a full-screen searchable grid (category filter: Core/Fringe/Routines/Feelings), not just 3 hero cards.
3. Add "📷 הוסף מהמצלמה" as a 4th NewBoardChooser option — opens device camera, crops, and offers ARASAAC symbol suggestions ranked by label similarity before falling back to the raw photo.
4. SymbolPicker gains multi-select ("הוסף 5 סמלים") to batch-populate an empty grid instead of one cell at a time.
**Success metric:** median time to build a 20-cell board for a new profile.

### 3. Play mode
**Current:** Board render (`BoardView.tsx`) is always full-viewport (no distinct "play mode" chrome toggle found); adult lock/PIN exists (`lock-unlock.spec.ts`, long-press unlock).
**Problems:** No explicit "lock to child" fullscreen mode with iOS Guided Access hint; no visible affordance nudging a parent to enable Guided Access before handing the device to a child.
**Redesigned flow:**
1. "מצב ילד" button enters `requestFullscreen()` + activates the existing PIN lock.
2. On iOS Safari (detected via UA/standalone check), show a one-time coach-mark: "כדי לנעול את המכשיר על האפליקציה: הגדרות ← נגישות ← Guided Access, ואז שלוש לחיצות על כפתור הצד" — text only, since no web API can trigger Guided Access itself.
3. Android: offer "Pin app" hint using the equivalent Screen Pinning instructions.
**Success metric:** reduction in accidental device exits during child play sessions (proxy: support tickets/parent-reported "child left the app").

### 4. Family member capture flow — NEW (does not exist)
**Current:** No `MediaRecorder` usage found anywhere under `app/src/presentation/` — confirmed absent, not just unfinished.
**Redesigned flow:**
1. From Builder or a dedicated "בני משפחה" panel: תמונה (camera or gallery) → auto-crop face guide (reuse existing client-side crop/WebP pipeline noted in `docs/00-discovery.md` stack table).
2. שם + קרבה (dropdown: אמא/אבא/סבתא/סבא/אח/אחות/other free text).
3. Voice recording: tap-and-hold to record (`RecordButton`, new), waveform preview + trim (`WaveformTrimmer`, new), re-record option.
4. Consent checkpoint: whoever is being recorded (or their guardian, if a minor) must confirm consent inline before save — ties into Part 21 voice-safeguards from the main audit.
5. Auto-creates a cell with photo + name label + recorded playback replacing TTS for that cell.
**Success metric:** % of family-relevant cells (אמא/אבא/etc.) using a real recorded voice vs. synthetic TTS.

### 5. Sharing with therapist
**Current:** `ShareInvitePanel.tsx` — role dropdown (parent/clinician/staff), generates a fixed 6-digit code with hardcoded 48h TTL (`data/childRepo.ts` → `createShareInvite`), one-time redemption via `functions/src/acceptInvite.ts` (solid transactional implementation). **No UI to list active grants, no revoke, no custom expiry.**
**Redesigned flow:**
1. Keep the existing code-generation UX (good bones, transactional backend already correct).
2. Add expiry selector (1h / 24h / 48h / 7 days) instead of hardcoded 48h.
3. Add a "גישות פעילות" list per child, reading `childAccess/{childId}/members` — show name/role/granted date, with a **revoke** action (new Cloud Function `revokeAccess`, symmetric to `acceptInvite`).
4. Scope the share to specific boards, not automatically all boards of a child, for schools/staff-tier shares (least-privilege).
**Success metric:** parents can name every person with current access to their child's board at any time (auditability).

### 6. Progress / usage analytics for parents & therapists
**Current:** `analytics/UsageDashboard.tsx` exists, backed by an opt-in local `usage` IndexedDB store (per `docs/00-discovery.md §4.2`).
**Problems:** [TBD — could not fully read UsageDashboard.tsx in this pass] whether it distinguishes parent view (encouraging, simple) from therapist view (clinical, detailed: word diversity, MLU proxy, session frequency).
**Redesigned flow:**
1. Parent view: celebratory framing — "השבוע דני השתמש ב-14 מילים חדשות! 🎉" — trends, not raw tables.
2. Therapist view (only visible to accounts with `clinician` role in `childAccess`): session counts, part-of-speech distribution (ties to existing `morphology/` stub), core-vocabulary hit rate, exportable CSV for session notes.
3. Reinforce opt-in: no usage data collected until a parent explicitly enables it (already the model — keep it).
**Success metric:** therapist-reported usefulness of the dashboard in session planning (qualitative, closed-beta survey).

---

## Part 17.5 – Motion, Haptics & Copy Tone

**Motion:** Keep the existing global `prefers-reduced-motion` kill-switch (`styles/misc.css:11-21`) as the non-negotiable baseline — it is already correctly implemented. New motion should use the proposed `--dur-fast/base/slow` tokens (80/150/280ms, matching current hardcoded values) with `--ease-standard` (the existing `cubic-bezier(0.2,0.7,0.3,1)` from `modals.css`'s drawer animation). No animation should be load-bearing for comprehension (i.e., state changes must also be conveyed by a static visual/ARIA change, per 2.3.3 already-passing status).

**Haptics (mobile, tap-to-speak):** Trigger a short `navigator.vibrate(15)` pulse on cell activation where supported (Android Chrome; iOS Safari has no vibration API — rely on the existing `<100ms` visual feedback transition instead, per PRD §8.1 already referenced in `board.css:39`). Gate behind a settings toggle (some sensory-sensitive users find vibration aversive) — do not enable by default without an opt-in.

**Copy tone guide (עברית פשוטה):** Short sentences, second person, no jargon, warm but not childish for the adult-facing chrome; simple and concrete for child-facing states.

| Moment | Hebrew string |
|---|---|
| Empty sentence bar (exists) | "הקש על אריח כדי לבנות משפט…" (`sentence-nav.css:34`, keep as-is — good example) |
| Empty board toolbar (exists) | "הקש על אריח…" (`tokens.css:141`, keep) |
| Sync error (new) | "לא הצלחנו לשמור לענן כרגע. הלוח שלך בטוח במכשיר — ננסה שוב אוטומטית." |
| Offline banner (new) | "אין חיבור לאינטרנט — הכול ממשיך לעבוד כרגיל." |
| First recorded voice saved (new) | "הוקלט! עכשיו כשלוחצים על התא, ישמיעו את הקול שהקלטת." |
| Board created celebration (new) | "הלוח מוכן! אפשר להתחיל לתקשר." |
| Share code expired (new) | "קוד השיתוף פג תוקף. אפשר ליצור קוד חדש בכל רגע." |
| Admin-pending state (exists, verify tone) | current `PendingApprovalScreen.tsx` copy — **[TBD]** confirm it explains *why* and *how long*, not just "ממתין לאישור" |

---

## Part 18 – Cross-Platform Delivery

### 18.A Current PWA status

From `app/vite.config.ts` and `app/index.html`:
- **Installable:** ✅ `vite-plugin-pwa` with `registerType: 'autoUpdate'`, full manifest (name/short_name in Hebrew, `lang: 'he'`, `dir: 'rtl'`, icons incl. maskable 512×512).
- **Offline:** ✅ genuine — app shell precached (`globPatterns: ['**/*.{js,css,html,svg,png,woff2}']`), symbols deliberately excluded from precache and served `CacheFirst` at runtime (`globIgnores: ['**/symbols/**']`, avoids a multi-thousand-PNG precache blob) — pragmatic, correct tradeoff for an AAC app with a large symbol library.
- **Manifest/brand mismatch:** `theme_color: '#1F7A5C'` (green, matches the *dead* `styles/tokens.css` palette) — does not match the live coral brand (`#E8694C`) users actually see in-app chrome. `index.html` `<meta name="theme-color" content="#1F7A5C">` has the same stale value. Low-severity but visible (OS status bar / task switcher chrome will show the wrong brand colour).
- **Missing iOS install polish:** no `apple-touch-icon` link, no `apple-mobile-web-app-capable`/`apple-mobile-web-app-status-bar-style` meta tags in `index.html` — iOS Safari "Add to Home Screen" will use a screenshot-derived icon instead of a designed one, and will not hint standalone status-bar styling.
- **Font loading:** Assistant loaded from Google Fonts CDN with `preconnect` (`index.html:12-17`), graceful fallback to `system-ui` — correct offline-first pattern, but note the first-ever load (before SW installs) requires network for the branded font, and sends a request (with IP) to Google Fonts — worth a footnote in the eventual privacy policy.

**iOS PWA limitations (structural, not fixable from the web layer):**
- No native install prompt (`beforeinstallprompt` is Chrome/Android-only) — iOS requires the manual Share→Add to Home Screen path; needs an in-app instructional banner.
- Audio autoplay restrictions — every TTS utterance must originate from a user gesture; the app's "first tap always speaks" invariant (HANDOFF §4, A3) is actually the correct mitigation already in place.
- Storage eviction — Safari can evict IndexedDB/Cache Storage under storage pressure for web apps not added to the home screen; boards/media could be silently lost. No eviction-recovery UX currently found.
- No Guided Access API from the web — confirmed no way to programmatically lock iOS into single-app mode; must rely on user-facing instructions (Part 17.4 flow 3).

### 18.B Strategy comparison

| Strategy | Pros | Cons | Fit for Co_Board |
|---|---|---|---|
| PWA only | Ships today; 1 codebase; offline-first already real | iOS install friction, no Guided Access hook, storage eviction risk, no native voice-recording quality guarantees | **Current state — good for Phase 1/closed beta** |
| React Native + Web (Expo) | 1 codebase; native modules for camera/mic/vibration/Guided-Access-adjacent APIs (Screen Pinning bridge); Expo's a11y primitives map cleanly onto React Native's accessibility APIs (better VoiceOver/TalkBack fidelity than a web `<div>` grid) | Domain/services layers (already framework-agnostic per the 4-layer architecture) port cleanly, but all of `presentation/` needs a rewrite to RN primitives; CSS Grid board layout has no direct RN equivalent (need `FlatList`/custom grid) | **Recommended Phase 3** — the existing strict layering (`domain`/`services` pure TS, zero React) is exactly the shape that makes an RN port tractable without touching business logic |
| Flutter | Excellent performance, single codebase, strong Fitzgerald-style custom-render control | Full rewrite of everything including `domain`/`services` (Dart, not TS) — discards the biggest asset (16K LOC of tested, pure TS domain logic); iOS a11y historically behind RN/native | Not recommended — throws away the architecture's biggest strength |
| Native iOS + Native Android | Best possible a11y (full VoiceOver/TalkBack/Switch Control fidelity), true Guided Access integration on iOS | 3× ongoing cost, 2 more codebases to keep in sync with the web PWA | Only if institutional (HMO/MoE) contracts demand native-only distribution |

### 18.C Offline-first sync across platforms

**Conflict resolution (per-field merge priority):** Current sync is last-write-wins per *entity* on `updatedAt` (ADR-0004, deferred — per-field merge not implemented, per `docs/00-discovery.md §4.3/§7.3`). Recommended per-field priority once implemented: (1) `cell.imageUri`/`audioUri` — most-recent-wins is safe (media replacement is rarely concurrent); (2) `cell.label`/`nikud` — most-recent-wins with a "changed by X, keep your edit?" prompt if the local device also changed it within the same sync window (concurrent-therapist-and-parent-edit scenario flagged as a real risk in `docs/00-discovery.md §7.3`); (3) `board.placements` (layout) — this is the highest-risk field for silent conflict loss (a therapist reorganizing a board while a parent adds a cell offline) — recommend a three-way merge (base/local/remote) falling back to "keep both, flag for manual review" rather than LWW for this field specifically.

**Background media sync:** Photos/audio are already E2E-encrypted client-side before upload (AES-GCM, per discovery doc §5) — extend this pattern to a Background Sync API (`ServiceWorkerRegistration.sync`) on Chrome/Android so a recorded voice clip queued while offline uploads automatically on reconnect without requiring the app to be foregrounded; iOS Safari lacks Background Sync — fall back to a retry-on-app-open queue (the existing `outbox` IndexedDB store already models this pattern for other entities, per discovery doc §4.2, and should be reused rather than building a parallel media queue).

**Push notifications:** None exist today (confirmed in discovery doc §2, "External services NOT present"). Recommend FCM for Android/web-push, APNs (via FCM's iOS bridge) once native wrappers exist — primary use cases: therapist accepted a share invite, new usage-summary ready for a parent, admin approval decision. Must be opt-in and never used for a child-facing account.

**Deep links (board sharing):** No deep-link scheme found. Recommend `https://co-board.app/invite/{code}` universal links (iOS) / app links (Android) that open the PWA/native app directly to `AcceptInviteScreen.tsx` pre-filled with the code, falling back to the web flow that already exists for browsers without the app installed.

### 18.D Platform Decision (Architect)

**Decision: phased PWA → Expo (React Native + react-native-web), with native modules only where the web platform is structurally blocked. Flutter and dual-native are rejected.**

**Rationale (in order of weight):**
1. **The 4-layer architecture is the deciding asset.** `domain/` (~2.3K LOC) and `services/` (~2.7K LOC) are pure TS with zero React/DOM coupling, and `data/` isolates IndexedDB behind repos. An Expo port rewrites only `presentation/` and swaps the `data/` storage driver (IndexedDB → SQLite/expo-file-system behind the same repo interfaces). Flutter would discard ~5K LOC of tested business logic and 244 tests; that alone disqualifies it.
2. **iOS structural limits are real but not urgent.** The three blockers that web cannot solve — Guided Access integration, guaranteed storage persistence, native-quality voice capture — matter most for paid families and institutions (Phase 3+ customers), not for closed beta. So the PWA is not a compromise for Phases 1–2; it is the correct vehicle.
3. **Accessibility fidelity.** RN's accessibility props map 1:1 onto UIAccessibility/AccessibilityNodeInfo, giving materially better VoiceOver/TalkBack and Switch Control behavior than a web grid in a WebView or Safari. For an AAC product this is a first-class reason to go RN rather than wrap the PWA in Capacitor.

**Phasing and triggers:**
- **Phase 1–2 (now → UX overhaul): PWA only.** Harden it: `navigator.storage.persist()` (B-10), iOS install banner + apple-touch-icon (18.A), eviction-recovery UX backed by cloud sync default-on (B-11). Exit criterion: closed-beta families on Android/desktop use the PWA daily without storage-loss incidents.
- **Phase 3 (trigger = first paying cohort ≥ ~50 families or first clinic pilot, whichever comes first): Expo app for iOS + Android.** Monorepo: extract `domain/`+`services/`+sync into a shared package; `presentation/` rebuilt on RN primitives (board grid via custom layout component — CSS Grid has no RN equivalent; the `grid-area` placement model in `domain/layout` ports as coordinates, which is exactly what an RN absolute-layout grid needs). Web keeps shipping from the existing React codebase until RN-web parity is proven — do **not** big-bang the web onto react-native-web.
- **Native modules (inside Expo, via config plugins/dev clients), only these:** (a) audio capture (expo-av / native AVAudioSession for gain control and AAC/Opus encoding), (b) iOS Guided Access detection + Android Screen Pinning (lock-to-child mode), (c) keep-awake + volume caps, (d) FCM/APNs push. Everything else stays in JS.
- **Desktop:** remains the PWA (installable on Windows/macOS/ChromeOS — the classroom case). Electron/Tauri wrapper only if an institutional tender demands an MSI/managed install; treat as packaging, not a platform.

**Sync across platforms:** one sync engine (shared package) against the same Firestore schema; per-field merge (ADR-0004 / C-18) must land **before** the second platform ships, because two platforms per family doubles concurrent-edit exposure.

**Costs/risks accepted:** RN board-grid rendering performance on low-end Android must be validated with a spike (60fps scroll + tap-to-speech <150ms on a ₪600-class device) **before** committing to the full port — this spike is the Phase 3 go/no-go gate. Expo SDK upgrade cadence adds maintenance load (~1 upgrade/quarter). App-store review adds release latency (mitigate with Expo Updates for JS-only fixes).

---

## Part 19 – Accessibility Deep Dive (beyond WCAG)

### Screen reader support plan

| Screen | Key announcements (Hebrew examples) |
|---|---|
| Board (play mode) | Board name on entry (`aria-label={board.name}`, already present); each cell announces its label (`aria-label={cell.label}`, already present) — **gap:** no announcement of grid position ("שורה 2, עמודה 3") until the row-wrapper fix (17.2a) lands, since `role="gridcell"` without `role="row"` currently produces inconsistent VoiceOver/TalkBack table-navigation behavior |
| SentenceBar | Composed sentence read via `aria-live="polite"` on change (present) — verify VoiceOver reads the *whole* sentence, not just the appended word (needs `aria-atomic="true"`, currently absent — see component table in 17.3) |
| Builder | Cell editing dialog should announce "עריכת תא: [שם]" on open (via `useFocusTrap` moving focus into the dialog — mechanism exists, copy needs the explicit label) |
| Settings | Toggle state changes should be announced via the toggle's own `aria-checked` (verify `Toggle.tsx` sets `role="switch"` — **[TBD code check]**) |
| Sharing (ShareInvitePanel) | Generated code should be announced as digits ("קוד שיתוף: שתיים אפס שש שמונה שלוש תשע") — numeric strings read digit-by-digit by VoiceOver by default in Hebrew locale is inconsistent; consider `aria-label` with spelled-out digits for reliability |

### Switch access plan

The scanning engine is **already implemented and wired**, not a stub as characterized in `docs/00-discovery.md §7.2` ("scanning/, prediction/, morphology/ are stubs") — that characterization is stale for `scanning/` specifically:
- `domain/scanning/scanEngine.ts` — pure state machine, `linear` and `row-column` modes, fully unit-tested (`scanEngine.test.ts`).
- `services/access/useScanning.ts` — wires the engine to keyboard events (Space=advance/select depending on manual vs. auto mode, Enter=select), auto-tick interval for timed scanning, and an `onHighlight` auditory-scanning callback.
- `AccessSettingsPanel.tsx` exposes `scanMode` (linear/row-column) and `scanSpeedMs` to the end user — full end-to-end feature, not a stub.

**Gaps to close for a genuine 1-switch/2-switch product:**
1. Currently only keyboard `Space`/`Enter` drive the scanner — real hardware switches (via Bluetooth HID or a switch-to-keyboard adapter) already map to keyboard events, so this **should already work** with off-the-shelf switch interfaces, but has not been verified on real hardware **[TBD device test]**.
2. No distinct **2-switch step-scan** mode (one switch = advance, second switch = select) as a separate config from the existing single-switch auto/manual toggle (`speedMs <= 0` currently conflates "manual single-switch" with what should be a distinct two-switch mapping).
3. Row-column scanning (`mode: 'row-column'`) needs `gridCols` wired from the actual board's `grid.cols` at the call site — confirm this is passed correctly from wherever `useScanning` is invoked in `App.tsx` **[TBD code check]**.
4. No configurable scan-start-delay or "re-scan on error" timing options beyond `scanSpeedMs`.

### Dwell / eye-gaze

`services/access/dwellService.ts` is a mature, well-reasoned implementation: `useDwellActivation` (hover-to-activate with move-cancel threshold that tolerates hand tremor — `DWELL_MOVE_CANCEL_PX = 30`, resets only on deliberate exit, not on small jitter — a genuinely thoughtful AAC-specific design choice), `useActivateOnRelease` (pointer-up activation to prevent accidental drag-through activation), `useDoubleTapPrevention` (800ms debounce). All three are wired into `CellButton.tsx` and driven by `AccessSettings.dwellTimeMs`/`activateOnRelease`/`doubleTapPrevention`, exposed in `AccessSettingsPanel.tsx`.
**Roadmap extension:** dwell today only responds to pointer (mouse/touch) hover — head-tracking and true eye-gaze hardware (e.g., Tobii, PCEye) typically emulate mouse/pointer events on Windows/iPadOS, so the existing `onPointerEnter`/`onPointerMove`/`onPointerLeave` handlers **should** already be compatible **[Assumption — needs real-hardware validation]**. Add a dwell-progress visual indicator (radial fill on the cell during the dwell window) — currently the user gets no feedback that a dwell timer is running until activation fires, which is a usability gap for eye-gaze users who need to confirm they're on-target.

### Keyboard navigation full map

| Context | Key | Action |
|---|---|---|
| Board (play) | Tab | Move to next cell (DOM order — see 2.4.3 finding) |
| Board (play) | Enter/Space | Activate focused cell (speaks) |
| Board (scanning mode) | Space | Advance scan (manual) or Select (auto mode) |
| Board (scanning mode) | Enter | Select highlighted cell/row |
| Any modal | Tab / Shift+Tab | Cycle within modal (`useFocusTrap`) |
| Any modal | Escape | Close modal, focus returns to trigger element |
| Builder | Ctrl/Cmd+Z | Undo |
| Builder | Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z | Redo |
| Wizard (name step) | Enter | Advance to next step |
| **Proposed new** — Board (play) | Arrow keys | Move focus one cell in the pressed direction (grid nav, closes the 2.1.1 gap) |
| **Proposed new** — Board (play) | Home/End | Jump to first/last cell in current row |

### Volume caps + sensory considerations

No explicit TTS volume-cap setting found in `domain/accessSettings.ts` (only `ttsRate`/`ttsPitch` are exposed in `AccessSettingsPanel.tsx`) — recommend adding a `ttsVolume` (0–100%) setting with a sensible default cap (e.g., max 80% of device volume) to protect against startling loud output, especially relevant for auditory-sensitive users. Sensory-calm theme (17.3) addresses visual sensory load; pair with an option to disable the `.cell:hover { transform: translateY(-2px) }` lift/shadow micro-interactions independent of `prefers-reduced-motion` (some users want full app motion but find the hover lift specifically distracting) — currently these are only controllable via the OS-level reduced-motion setting, an all-or-nothing switch.

### Testing matrix

| Device class | Assistive tech to test | OS versions |
|---|---|---|
| Low-end Android (₪500–1000, e.g. Galaxy A0x/A1x class, 2-3GB RAM) | TalkBack, external Bluetooth switch, Switch Access (Android built-in) | Android 11–14 (fragmentation is real in this price band — test the oldest supported OS, not just latest) |
| iPad (any recent, since schools/clinics likely standardize on iPad) | VoiceOver, Switch Control, Guided Access (manual instruction flow) | iPadOS N and N-1 |
| iPhone SE (smallest/cheapest iOS form factor — stresses the 44px/60px target-size findings hardest) | VoiceOver, Switch Control | iOS N and N-1 |
| Mid-range Android tablet (classroom use) | TalkBack, external switch via USB-C | Android 12+ |
| Desktop (Windows/Mac, via browser) | NVDA (Windows, free — prioritize over JAWS for a non-profit/budget-conscious install base), VoiceOver (Mac) | Current browser versions |

### Accessibility statement template outline (per תקן 5568)

```
הצהרת נגישות — לוח תקשורת
1. כללי (מטרת ההצהרה, תאריך עדכון אחרון)
2. רמת הנגישות (תואם חלקית/מלא ל-WCAG 2.2 AA; פירוט הליקויים הידועים)
3. ליקויי נגישות ידועים (ניגודיות --cl-primary; מבנה grid בלוח — status: בטיפול)
4. דרכי פנייה (רכז/ת נגישות: שם, טלפון, אימייל)
5. הסדרי נגישות פיזיים — לא רלוונטי (מוצר תוכנה בלבד)
6. תהליך בדיקת הנגישות (בדיקות אוטומטיות axe-core + בדיקה ידנית; תאריך בדיקה אחרונה)
7. זכות לפנייה לנציבות שוויון זכויות לאנשים עם מוגבלות
```

---

## Findings Summary

| ID | Finding | Severity | Fix | Complexity | Owner |
|---|---|---|---|---|---|
| C-01 | `--cl-primary` (#E8694C) fails 4.5:1 contrast on white; `-dk` variant also fails (4.33:1) | High | Darken to `#BA543D` (4.75:1) or equivalent, per token | S | UX Auditor / Frontend dev |
| C-02 | `BoardView` grid has `role="gridcell"` without `role="row"` wrappers | High | `display:contents` row-wrapper strategy (17.2b, Strategy 1) | M | Frontend dev |
| C-03 | Mobile `.cell` shrinks to 44px, below product's own 60px AAC floor | Medium | Raise `--target-sm` floor for `.cell` specifically to 60px | S | Frontend dev |
| C-04 | `.tbtn` toolbar buttons default to 36px, below AAC and AAA target size | Medium | Raise base to 44–60px or default `buttonScale` higher on touch | S | Frontend dev |
| C-05 | Dual conflicting token files (`styles/tokens.css` green vs. `presentation/ui/tokens.css` coral) | Medium | Delete/merge dead palette; single token source | M | Frontend dev |
| C-06 | Manifest/`index.html` `theme-color` (#1F7A5C green) mismatches live coral brand | Low | Update to coral hex in both files | S | Frontend dev |
| C-07 | No `apple-touch-icon`/`apple-mobile-web-app-*` meta tags | Low | Add iOS PWA meta tags + icon asset | S | Frontend dev |
| C-08 | Board DOM order (Tab order) may not match visual row/col order | Medium | Sort `rendered` by `(row, col)` in `BoardView.tsx` | S | Frontend dev |
| C-09 | No arrow-key grid navigation — full-Tab traversal only for large boards | Medium | Add roving-tabindex + arrow-key nav to `BoardView` | M | Frontend dev |
| C-10 | No sensory-calm theme | Medium | New `.sensory-calm` token overrides, low-saturation palette | M | UX Auditor + Frontend dev |
| C-11 | No dyslexia-friendly font option | Low | Bundle OpenDyslexic opt-in, offline-safe | S | Frontend dev |
| C-12 | No TTS volume cap setting | Medium | Add `ttsVolume` to `AccessSettings` + UI slider | S | Frontend dev |
| C-13 | Empty-state copy (`::before { content }`) is CSS-only, invisible to screen readers | Medium | Move empty-state text into real DOM/JSX | S | Frontend dev |
| C-14 | Onboarding is 100% manual-admin-gated regardless of user type — does not scale | High | Tiered self-serve onboarding (Part 17.4 flow 1) | L | Architect + Frontend dev |
| C-15 | Family member capture flow (photo+name+relationship+voice) does not exist | High | New flow + `RecordButton`/`WaveformTrimmer` components (Part 17.4 flow 4) | L | Frontend dev + Architect (consent/safeguards) |
| C-16 | `ShareInvitePanel` has fixed 48h expiry, no revoke, no active-grants list | Medium | Add expiry selector, `revokeAccess` CF, grants list UI (Part 17.4 flow 5) | M | Frontend dev + Backend dev |
| C-17 | No push notifications / deep links for invite acceptance | Low | FCM + universal/app links (Part 18.C) | L | Architect + Frontend dev |
| C-18 | Per-field sync merge not implemented (LWW per-entity only) — silent concurrent-edit data loss risk | High | Three-way merge for `board.placements`, field-priority table (Part 18.C) | L | Architect |
| C-19 | No 2-switch step-scan mode distinct from manual single-switch | Medium | Split scan config: single-switch auto/manual vs. two-switch advance/select | M | Frontend dev |
| C-20 | No dwell-progress visual indicator during hover-activation window | Low | Add radial-fill progress affordance on `.cell` during dwell | S | Frontend dev |

**Positive findings worth preserving, not "fixing":** the global `prefers-reduced-motion` kill-switch (`styles/misc.css`) is exemplary and should be the model for any new motion; the dwell/scanning implementations in `services/access/` and `domain/scanning/` are mature, tested, and mischaracterized as "stubs" in the discovery doc — they need extension (C-19, C-20), not construction from scratch; `useFocusTrap.ts` is a correct, reusable modal-a11y primitive already used consistently.
