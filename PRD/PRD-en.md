# Product Requirements Document (PRD)
## Hebrew‑First AAC Communication App — "לוח תקשורת"

| | |
|---|---|
| **Version** | 1.0 (Development Draft) |
| **Date** | June 19, 2026 |
| **Status** | Merged, ready for engineering review |
| **Audience** | Product, Engineering, UX, advising SLPs, investors/partners |
| **Based on** | Merge of 4 research documents (GEMINI, ChatGPT, Opus, Researcher‑1) on the AAC market |
| **Language** | English (parallel Hebrew version: `PRD-he.md` — the primary version) |

> **Professional note:** This is a product/engineering baseline, not a substitute for clinical guidance. In a children's AAC app the most important decisions are not only technological but linguistic‑clinical (vocabulary, gradualness, modeling, consistency, accessibility). The product is therefore built around established AAC principles — not merely as a "board generator."

### Decisions Log

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Goal | Commercial product for development & launch | Includes business model, pricing, GTM |
| MVP platform | **Android + Web (PWA) first**, then iPad/iOS | Fills the market gap — no quality Hebrew AAC exists on Android today; iPad is the special‑ed standard and is added later as a differentiator |
| Document language | Bilingual (Hebrew primary + English) | Israeli team & Hebrew‑first product, while remaining open to international investors/devs |
| Format | Markdown in a git repo | Versionable, GitHub‑readable, dev‑ready |

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [User Personas](#2-user-personas)
3. [Key Use Cases](#3-key-use-cases)
4. [Feature Breakdown](#4-feature-breakdown)
5. [User Flows](#5-user-flows)
6. [UX & Accessibility](#6-ux--accessibility)
7. [Functional Requirements](#7-functional-requirements)
8. [Non‑Functional Requirements](#8-non-functional-requirements)
9. [Technical Considerations](#9-technical-considerations)
10. [Gap Analysis](#10-gap-analysis)
11. [MVP Definition](#11-mvp-definition)
12. [Roadmap](#12-roadmap)
- [Appendices: Glossary · Competitors · QA · Sources](#appendices)

---

## 1. Product Overview

### 1.1 Purpose
A **Hebrew‑first AAC (Augmentative and Alternative Communication)** app that lets children with communication difficulties (autism focus) express themselves via symbol boards converted to speech, and gives speech‑language pathologists (SLPs) and parents professional tools to build, personalize, and clinically track progress. Beyond an "expression tool," it is designed as a **language‑development system** grounded in research‑based AAC principles.

### 1.2 Problem
Many children with autism, apraxia, cerebral palsy, or complex language disorders are non‑verbal or struggle to speak. AAC is the evidence‑based solution, but the existing market has material gaps:
- **Platform barrier:** Quality tools (TouchChat, Grid, Proloquo2Go, LAMP) are almost all locked to iOS/iPad. **There is no quality Hebrew solution for Android** — a platform accessible to more families.
- **Price barrier:** One‑time ₪700–₪1,900 purchases or expensive subscriptions. An "empty desert in the middle" between expensive tools and weak free ones (Cboard, SymboTalk) — **especially in Hebrew**.
- **Partial Hebrew:** Even good tools offer basic Hebrew, no **automatic niqqud**, and shallow morphology (gender/number, verb inflection).
- **Cumbersome editing:** Recurring complaints about editing, dated UI, post‑update bugs, cell‑by‑cell editing without bulk editing.
- **Limited clinician tools:** Paid external analytics (Realize Language), partial remote editing, no built‑in clinical measurement.

### 1.3 Target Audience
| Audience | Description | Role |
|----------|-------------|------|
| **Child user** | Pre‑K to high school, autism focus; wide ability range | End user — daily communication |
| **SLP** | Assesses, builds boards, adapts level, coaches team/family, tracks progress | Primary power user |
| **Parent** | Daily operator, adds personal content, wants to understand progress | Secondary user, needs simplicity |
| **Educational staff** | Daily use in preschool/school, modeling | Limited‑permission user |

### 1.4 Value Proposition
> **"AAC built for Hebrew from the ground up, accessible on every platform, simple for the parent and powerful for the clinician — with language development at its core."**

Five differentiation pillars:
1. **Hebrew as a first‑class citizen** — full RTL, automatic niqqud with manual override, morphology (gender/number/inflection), quality Hebrew TTS for children and adults, and Israeli‑cultural content (holidays, foods, Israeli preschool, Shabbat).
2. **Cross‑platform access** — Android + Web first (market gap), iPad later; **user‑based licensing** (not device‑based).
3. **Two UX modes** — simple mode for parent/child vs. deep professional mode for the clinician, with no compromise on either.
4. **Modern building & editing** — drag‑and‑drop, undo/redo, preview, and **bulk editing** — a notable market gap.
5. **A language‑development system** — Core Vocabulary, position consistency (Motor Planning), modeling mode, gradualness (hide/reveal), and built‑in clinical measurement — not just a "board generator."

### 1.5 Guiding Principles
Based on clinical consensus (ASHA, Janice Light, AssistiveWare) appearing across all four research documents:
- **Core vocabulary first** — ~300–400 frequent words make up 80–85% of daily speech; they must be reachable from the home screen.
- **Position consistency (Motor Planning)** — a word never moves; expansion happens *around* the existing layout.
- **Modeling (Aided Language Stimulation)** — children learn from exposure; adults use the board in front of them.
- **Communication beyond requests** — requesting, refusing, commenting, questioning, sharing, protesting, expressing emotion.
- **No prerequisites** — any child can start AAC.
- **Multimodal** — AAC complements speech, gestures, and signs; it does not replace them.

---

## 2. User Personas

### 2.1 SLP — "Michal" (primary / power user)
- **Background:** SLP in a language preschool and private clinic; supports 15–25 children.
- **Goals:** assess level, build a tailored board quickly, coach parents/staff, and prove progress with data.
- **Frustrations:** slow cell‑by‑cell editing; no convenient remote editing; expensive/external analytics; must take the device from the child to edit.
- **Needs:** fast builder with bulk editing, rich symbol libraries, ready Hebrew templates, built‑in clinical measurement, modeling mode, and (later) a remote‑editing portal.
- **Tech comfort:** medium–high; works from a computer and tablet.

### 2.2 Child user — "Omer" (end user)
- **Background:** age 5, on the autism spectrum, non‑verbal, sensitive to sensory overload.
- **Goals:** to request, refuse, choose, express emotion, and be understood — fast and frustration‑free.
- **Frustrations:** visual overload; words that move; delay between tap and speech; accidental taps; unwanted exit from the app.
- **Needs:** simple, predictable screen, clear symbols (including real photos from his life), instant speech, absolute consistency, and a locked mode.
- **Tech comfort:** low; direct touch, sometimes limited fine motor skills.

### 2.3 Parent — "Dana" (secondary)
- **Background:** Omer's mother, no AAC background.
- **Goals:** operate easily at home, add personal words (grandma, a favorite toy/food), understand progress.
- **Frustrations:** professional apps feel intimidating; fear of "breaking" settings.
- **Needs:** friendly onboarding ("add child → pick level → start with 12 words"), add a photo/word in seconds, simple parent mode, non‑stressful reports.
- **Tech comfort:** low–medium; Android phone/tablet.

### 2.4 Educational staff — "Orit" (limited permissions)
- **Background:** aide/teacher in a communication preschool.
- **Goals:** daily situational board use (meal, yard, transition) and modeling.
- **Needs:** "use‑only" permissions (no destructive editing), environment boards, and a modeling/coaching mode.

---

## 3. Key Use Cases

| ID | Use Case | Primary Actor | Brief |
|----|----------|---------------|-------|
| UC‑1 | Create profile & assess level | SLP | Create child profile, assess (Communication Matrix / DAGG‑2 / TASP), pick starting level |
| UC‑2 | Build/duplicate tailored board | SLP | Duplicate a ready Hebrew template, choose grid size, adapt vocabulary |
| UC‑3 | Customize a specific cell | SLP/Parent | Add a word (text+niqqud), symbol/photo, Fitzgerald color, action |
| UC‑4 | Compose a sentence & speak | Child | Select symbols → sentence bar → "Speak" → fluent speech |
| UC‑5 | Real‑time modeling | Adult | Demonstrate a tap path ("I → want → ball") while talking |
| UC‑6 | Add personal content | Parent | Photograph a food/family member, turn into a button in seconds |
| UC‑7 | Gradual vocabulary expansion | SLP | Reveal hidden words in the same fixed positions |
| UC‑8 | Emergency/pain communication | Child | Instant access to a pain/help button from any board |
| UC‑9 | Track & report progress | SLP | Review usage log, MLU, communication functions; produce parent report |
| UC‑10 | Full offline use | Child/Parent | Communicate and speak with no internet, anywhere |
| UC‑11 | Remote editing (Phase 2) | SLP | Update the child's board from a browser, sync without touching the device |
| UC‑12 | Switch usage modes | Adult | Switch between locked "child mode" and code‑protected "clinician/edit mode" |

---

## 4. Feature Breakdown

For each feature: **Description · User Value · Edge cases**. Priorities: `[MVP]` / `[Phase 2]` / `[Phase 3]`.

### 4.1 Communication Boards (ready‑made + custom)
**Description.** The core of the product. A board = a grid of cells; each cell speaks a word/phrase, navigates to another board, or performs an action. Three content types:
- **Ready‑made Core Boards** `[MVP]` — research‑based Hebrew vocabulary organized on three axes:
  - **Level:** beginners (4/6/9/12 cells) · intermediate (15/20/30) · advanced (40/60+).
  - **Life environment:** home · preschool/school · food · play · emotions · pain/health · family · Israeli holidays & customs.
  - **Communication goal:** request · refuse · choose · respond · share · question · protest · express emotion.
- **Custom Boards** `[MVP]` — create from scratch or duplicate a ready board as a base; import/export.
- **Visual Scene Displays (VSD)** `[Phase 2]` — a realistic photo (kitchen, yard) with tappable "hotspots." Effective for very young children who respond to whole images.

**Required visual‑linguistic structure:** dynamic grid sizes (switch without rebuilding); Core vs Fringe (core words fixed on every page); Fitzgerald color coding (see §6.3); position consistency (Motor Planning); a fixed Speech Display Bar at the top.

**User Value.** The child communicates on day one (ready boards) and the clinician saves hours of building. Position consistency builds motor memory and speeds retrieval.

**Edge cases.** Resizing the grid must not move core words from their relative position (warn if it would); a board exceeding the screen uses controlled scroll/paging, never shrinking cells below the minimum touch target; duplicating an original core board never overwrites the source; RTL cell filling and navigation direction.

### 4.2 Symbol Management (camera & upload)
**Description.**
- **Professional symbol libraries** `[MVP]` — SymbolStix / PCS / Widgit (licensed), plus **ARASAAC** (free, open) as a base. All symbols tagged in Hebrew (and Arabic).
- **Hebrew‑cultural symbol set** `[differentiator]` — holidays, Israeli foods, Israeli preschool/school, Shabbat, clinic, grocery — an acute market gap.
- **Personal media** `[MVP]` — capture directly from the camera into a cell, or upload from the gallery, with **crop** and **automatic background removal** (on‑device) to reduce visual load. Transparent PNG support so the cell's (Fitzgerald) background color shows cleanly.
- **Multiple representations per word** `[MVP]` — a word can be a symbol, a real photo, or text‑only.
- **Hide without delete** `[MVP]` — a dimmed/hidden cell is preserved for gradual reveal.
- **Tagging & search** `[MVP]` — tags ("food," "emotion," "verbs") for fast retrieval.
- **Diversity** `[MVP]` — varied skin tones and cultural representation (a gap identified in TouchChat).
- **AI symbol generation** `[Phase 2]` — a Hebrew text description ("grandma making couscous") → a unique style‑matched symbol, with **human approval** before use.

**User Value.** Real photos from the child's environment outperform generic pictograms; adding in seconds empowers parents and clinicians.

**Edge cases.** Background removal fails on a complex image → manual edit / save without removal; heavy image → auto‑compress (WebP); licensed symbol → clearly indicate which libraries are in the current plan; inappropriate/incorrect AI output → blocked until adult approval, never shown automatically to the child.

### 4.3 Text‑to‑Speech (TTS) in Hebrew — including niqqud
**Description.** The core technological differentiator.
- **Quality Hebrew TTS** `[MVP]` — natural child/female/male voices (leading Hebrew vendor: Almagu; alternatives: Acapela, system voices). Hybrid architecture: a **local offline engine** as a base + premium online voices when networked.
- **Automatic niqqud (Auto‑Nikud)** `[core differentiator]` — integration with a niqqud service (e.g., Nakdan API) for accurate pronunciation, **+ manual niqqud override** for problem words. No existing AAC solves this automatically.
- **Hebrew morphology** `[MVP]` — gender/number, verb inflection and tense; homograph disambiguation, Israeli proper‑name pronunciation, and everyday slang.
- **Recorded messages** `[MVP]` — record a personal voice for a button.
- **Family Voice Banking** `[Phase 2]` — create a family member's voice (e.g., The Voice Keeper) so the child "sounds like" mom/dad.
- **Rate & Pitch control** `[Phase 2]` — intonation shaping, important for GLP children.
- **In‑sentence code‑switching** `[Phase 2]` — Hebrew/English/Arabic in one sentence.

**User Value.** Accurate, natural Hebrew (with niqqud) is the difference between "understood" and "not understood"; an age‑matched voice prevents alienation.

**Edge cases.** Ambiguous unvocalized word → context‑based guess + saved manual fix; no network → automatic fallback to the offline voice with no user error; latency targets in §8.1; mixed RTL/LTR with numbers/English in one sentence.

### 4.4 Navigation Between Boards
**Description.**
- **Page linking** `[MVP]` — a cell can jump to another board, open a category (folder), or go back.
- **Fixed buttons** `[MVP]` — "Home," "Back," "Delete word," "Clear all," "Speak," "More" — in a fixed geometric position on every screen.
- **Speech Display Bar** `[MVP]` — shows the composed utterance; tapping it speaks the full sentence fluently.
- **Auto‑return** `[MVP]` — option to return to the previous board after a selection.
- **Word Finder** `[Phase 2]` — search a word and show the tap path to it (dim + highlight).
- **Gestures** `[Phase 2]` — swipe for quick navigation.
- **Breadcrumb for the clinician** `[Phase 2]` — visible in edit mode only.

**User Value.** Fast, predictable navigation preserves conversational flow; fixed buttons prevent disorientation.

**Edge cases.** Prevent navigation loops/dead ends — always a path back "Home"; "Delete word" vs "Clear all" — gentle confirmation for "Clear all"; avoid the known TouchChat issue of "Back" reading the whole history.

### 4.5 User Profiles
**Description.** `[MVP]` Multiple child profiles on the same device, each with distinct settings: name, age, communication level, language(s), default voice, grid size, visual‑load level, preferred topics/symbols, active/hidden words, progress plan, and permissions.

**User Value.** A clinician with many clients and a preschool with several children manage everything on one device; each child gets a tailored experience.

**Edge cases.** Switching profiles is code‑locked; deleting a profile → confirm + backup (archive, not immediate delete); a profile with no active boards → guide to onboarding.

### 4.6 SLP Tools
**Description.**
- **Modern builder** `[MVP]` — drag‑and‑drop, undo/redo, child‑experience preview, board duplication, templates.
- **Bulk / Multi‑Select editing** `[differentiator]` — select a group of cells and change color/font/size together (e.g., apply Fitzgerald green to 10 verbs at once).
- **Data logging & analytics** `[MVP basic / Phase 2 advanced]` — a dashboard with communication initiations, unique words, **MLU**, communication functions (request/comment/protest/greet), used vs unused words, and mis‑taps. **Can be disabled for privacy.**
- **Goal setting & reports** `[Phase 2]` — attach therapy goals, weekly/monthly progress report for the parent.
- **Therapy mode vs daily mode** `[MVP]`.
- **Modeling/Coaching mode** `[Phase 2]` — the app suggests a demo path ("try: I → want → ball") and temporarily highlights buttons.
- **Permissions (RBAC)** `[MVP]` — clinician admin · parent viewer/editor · staff user.
- **Remote editing** `[Phase 2]` — browser portal; the clinician edits from a computer and pushes the update to the child's device.
- **AI assistant for the clinician** `[Phase 2/3]` — vocabulary suggestions by age/diagnosis/interest, situational board generation, and report drafts — privacy‑preserving and with human approval.
- **Assessment tools** `[Phase 2]` — alignment with Communication Matrix, DAGG‑2, TASP; tracking by Light's four competencies.

**User Value.** The clinician gets power and evidence‑based measurement (EBP) in one place, without paid external tools.

**Edge cases.** Automatic/AI board changes must respect position consistency — warn before moving core words; usage data is sensitive (children) → anonymized/local by default (§8); remote editing while the child is using → merge/versioning to prevent conflicts.

### 4.7 Accessibility & Personalization
**Description.** `[MVP unless noted]`
- **Grid & text size** — adapt to level and motor skills.
- **Motor access methods:** Dwell Time, Activate on Release, Double‑Tap Prevention, Hold Duration.
- **Design:** themes/colors, high contrast, Dark Mode, readable/dyslexia‑friendly font.
- **Lock mode ("Me Mode" / Guided Access)** — prevent unwanted exit to editing or other apps.
- **Advanced alternative access** `[Phase 3]` — Switch Scanning, eye/head tracking — for severe motor disability.

**User Value.** Precise adaptation prevents frustration and mis‑taps, and widens the user base.

**Edge cases.** Access settings must never lock the user out; extreme combinations (long Dwell + double‑tap) are tested for coherence.

### 4.8 Storage & Sync
**Description.**
- **Offline‑first** `[MVP]` — all communication, navigation, basic TTS, and symbols work fully locally.
- **Asynchronous cloud sync** `[MVP]` — silent two‑way background sync when networked.
- **Backup & version control** `[MVP]` — encrypted auto‑backup + local export; restore a previous version / accidentally deleted board, even offline.
- **User‑based licensing** `[MVP]` — not device‑based; the child profile moves between home and preschool devices.
- **Supervisor accounts** `[Phase 2]` — free access for the support team around the child's account.
- **Open Board Format (OBF) import/export** `[Phase 2]` — compatibility and board sharing.

**User Value.** The child communicates anywhere (even offline), and data is safe and portable across devices.

**Edge cases.** Sync conflict (parallel edits on two devices) → merge / "last‑wins" policy with restorable versions; local storage fills (photos/voices) → volume management and alert; restoring a version must not wipe collected usage data.

---

## 5. User Flows

### 5.1 Create a new board (SLP/Parent)
```
Home → enter clinician code → "Create/Duplicate board"
  → choose grid size (4×4 / 6×6 / 8×5 ...)
  → add cell:
        • choose symbol (library search / camera / upload) → crop / remove background
        • type text (+ niqqud: automatic or manual)
        • choose voice / record voice
        • set Fitzgerald color (by grammatical category)
        • set action (Speak / Navigate / Clear / Custom)
  → drag-and-drop to position + (bulk-edit multiple cells together)
  → test speech (Preview)
  → Save → assign to child profile → cloud sync (optional)
```

### 5.2 Adapt to a child (SLP)
```
Open child profile (or create)
  → assess language level (Communication Matrix / DAGG-2 / TASP)
  → choose core vocabulary + matching grid size (4×4 beginners → 8×8 advanced)
  → set Progressive Language: hide advanced words
  → add personal content (mom, dad, favorite toy, food)
  → set emergency buttons (pain / help)
  → choose voice (later: family Voice Banking)
  → coach the team (parents/teacher/aide) on modeling
  → save version
```

### 5.3 Daily use (child + adult)
```
Open in locked mode (Guided Access)
  → Home board (16–36 buttons, core words in fixed positions)
  → child taps "I" → enters the sentence bar (+ word spoken)
  → taps "want" → sentence updates
  → navigate to a category ("food") → choose "Bamba"
  → tap the sentence bar → "I want Bamba" spoken fluently
  → in parallel: adult does modeling (Aided Language Stimulation)
  → option: tilt device → show the sentence in giant font (silent communication)
```

### 5.4 Clinical session + tracking (SLP)
```
Therapy mode → choose goal (request / respond / emotion / two-word utterance)
  → choose tailored board → clinician modeling → child practices
  → automatic usage logging (words, initiations, utterances)
  → clinician notes → summary report to parent
```

---

## 6. UX & Accessibility

### 6.1 Design principles for children with autism (Neuro‑Adaptive Design)
- **Reduce sensory & cognitive load** — clean layouts, generous white space, **soft/muted** background colors (not saturated/bright) to prevent sensory overload.
- **Consistency & predictability** — central navigation buttons ("Home"/"Clear") in the exact same geometric position on every screen; words never move.
- **Forgiving UI** — accessible Undo, non‑anxiety‑inducing visual error messages, accidental‑tap prevention.
- **Concrete buttons** — every action has a clear icon + text; avoid abstraction.
- **Immediate feedback** — speech/highlight/sound the moment a selection is made.
- **Two UX modes** — a simple, locked *child mode* vs. an *adult mode* (parent/clinician) for editing.

### 6.2 Typography & RTL
- Readable **sans‑serif** font (with a dyslexia‑friendly option); no italics, no justified text.
- Adjustable font size (up to 200%+).
- **Right‑aligned** text in the Hebrew UI — a fixed starting point for the eye; full RTL across all screens and the keyboard.

### 6.3 Color — Modified Fitzgerald Key
Consistent color coding by grammatical category aids fast scanning and intuitive syntax acquisition. **The product adopts the Modified Fitzgerald Key by default** (the most common, research‑based scheme), with customization:

| Category | Color (Modified Fitzgerald) | Role |
|----------|------------------------------|------|
| People / pronouns | Yellow | "who does" |
| Verbs (actions) | Green | the sentence engine |
| Nouns (objects/places) | Orange | target/object |
| Adjectives | Blue | opinion/feeling/description |
| Prepositions & location | Pink/Purple | spatial understanding & syntax |
| Question words | Purple | encourage initiation & inquiry |
| Negation / emergency | Red | "no"/"stop"/help |
| Social words/greetings | Magenta/Dark pink | fast social connection |

### 6.4 Target size, contrast & feedback
Minimum button ~1.5 cm with enlarged surrounding touch zones; high contrast among symbol/text/background; visual + auditory feedback on every selection.

### 6.5 Transition to Literacy (T2L) `[Phase 2]`
A subtle animation that shifts attention from the symbol to the written word on tap, plus sight‑word reading support — preparing the child for free writing later.

### 6.6 Accessibility standards
Target **WCAG 2.1 AA** and the Israeli accessibility standard (IS 5568) where relevant; accessibility testing with end users and clinicians throughout development.

---

## 7. Functional Requirements
MoSCoW: **Must** (MVP) · **Should** · **Could** · **Won't‑now** (future phase).

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR‑001 | Create/manage multiple child profiles on a device | Must | MVP |
| FR‑002 | Library of ready Hebrew boards (level/environment/goal) | Must | MVP |
| FR‑003 | Create a new board + duplicate template | Must | MVP |
| FR‑004 | Edit cell: text+niqqud, symbol, color, voice, action | Must | MVP |
| FR‑005 | Capture photo into a cell + crop | Must | MVP |
| FR‑006 | Upload image from gallery | Must | MVP |
| FR‑007 | Automatic background removal | Should | MVP/2 |
| FR‑008 | Hebrew speech on tap (offline TTS) | Must | MVP |
| FR‑009 | Automatic niqqud + manual override | Must | MVP |
| FR‑010 | Voice selection (child/female/male) | Must | MVP |
| FR‑011 | Record a personal voice per button | Should | MVP |
| FR‑012 | Sentence bar + "Speak" button | Must | MVP |
| FR‑013 | Navigation: home/back/delete/clear/more + cell→board link | Must | MVP |
| FR‑014 | Gradual hide/reveal of words | Must | MVP |
| FR‑015 | Dynamic grid sizes | Must | MVP |
| FR‑016 | Fitzgerald color coding | Should | MVP |
| FR‑017 | Bulk cell editing | Should | MVP/2 |
| FR‑018 | Undo/Redo + preview | Should | MVP |
| FR‑019 | Lock mode (Guided Access) + child/adult modes | Must | MVP |
| FR‑020 | Access settings: Dwell, Activate‑on‑Release, double‑tap prevention | Should | MVP |
| FR‑021 | Full offline operation | Must | MVP |
| FR‑022 | Backup + version restore | Must | MVP |
| FR‑023 | Two‑way cloud sync | Should | MVP/2 |
| FR‑024 | Basic usage logging | Should | MVP |
| FR‑025 | Clinical analytics dashboard (MLU, functions, vocabulary) | Could | Phase 2 |
| FR‑026 | Weekly/monthly progress report | Could | Phase 2 |
| FR‑027 | Permissions (clinician/parent/staff) | Must | MVP |
| FR‑028 | Visual Scene Displays (VSD) | Could | Phase 2 |
| FR‑029 | Word Finder | Could | Phase 2 |
| FR‑030 | Modeling/Coaching mode | Could | Phase 2 |
| FR‑031 | Remote editing (browser portal) | Could | Phase 2 |
| FR‑032 | Family Voice Banking | Won't‑now | Phase 2 |
| FR‑033 | AI symbol generation (with human approval) | Won't‑now | Phase 2 |
| FR‑034 | AI assistant for clinicians (suggestions/reports) | Won't‑now | Phase 2/3 |
| FR‑035 | Open Board Format import/export | Could | Phase 2 |
| FR‑036 | Alternative access: switch scanning / eye tracking | Won't‑now | Phase 3 |
| FR‑037 | iPad/iOS support | Should | Phase 2 |

---

## 8. Non‑Functional Requirements

### 8.1 Performance
| Metric | Target | Note |
|--------|--------|------|
| Visual feedback on tap | < 100ms | highlight the selected cell |
| Word appears in sentence bar | < 200ms | |
| Speech start (offline TTS) | < 300–500ms | near‑instant, no "stutter" |
| Board transition | < 200ms | smooth, no jumps |

> Note: the source documents cited different targets (150ms / 200ms / 500ms). These were unified by separating **visual feedback** (very fast) from **speech start** (a slightly higher threshold), since users experience the two differently.

### 8.2 Connectivity
- **Offline‑first mandatory:** communication, navigation, basic TTS, and symbols fully local.
- **Online‑only:** premium voices, community board downloads, remote editing, sync, AI symbol generation — none of which is a prerequisite for daily use.

### 8.3 Security
Encryption at rest and in transit (TLS); authentication and role‑based access control (RBAC); settings locked behind a clinician code; separation of child mode from edit mode.

### 8.4 Privacy
- **High sensitivity:** children's communication data. Data minimization; analytics collection **can be disabled**; default is local storage / anonymization before cloud.
- **Regulatory compliance:** GDPR (EU, if relevant), COPPA (US children), the **Israeli Privacy Protection Law**, and HIPAA where relevant (clinical context). Full parental control over what is uploaded.
- Market lesson: TouchChat iShare is unavailable in the EU due to privacy requirements — design for global compliance from the start.

### 8.5 Reliability, compatibility & more
- **Reliability:** stable offline operation; rigorous QA especially for multilingual builds; gradual rollout + roll‑back capability (lesson from post‑update bugs in TouchChat).
- **Compatibility:** Android (common versions) + modern browsers (PWA); iPadOS/iOS later.
- **Localization:** full Hebrew; architecture ready for additional languages (Arabic, English).
- **Scalability & maintainability:** modular architecture; shared cross‑platform code.

---

## 9. Technical Considerations

### 9.1 High‑level architecture (layers)
```
┌─────────────────────────────────────────────────────────────┐
│  Presentation (UI) — RTL-first, child mode / adult mode      │
│  Shared cross-platform code (recommended: Flutter or RN+PWA) │
├─────────────────────────────────────────────────────────────┤
│  Domain / Logic — boards, profiles, navigation, gradualness, │
│  permissions                                                 │
├─────────────────────────────────────────────────────────────┤
│  Services:                                                   │
│   • TTS Engine (local offline) ←→ premium voices (online)   │
│   • Nikud Service (Auto-Nikud, e.g. Nakdan API) + cache     │
│   • Media (camera, crop, on-device background removal, WebP) │
│   • Symbols (SymbolStix/PCS/Widgit/ARASAAC) + AI iconography │
│   • Analytics (local by default)                            │
├─────────────────────────────────────────────────────────────┤
│  Data (Offline-first):                                       │
│   • Local DB (SQLite / IndexedDB) — source of truth on device│
│   • Async two-way Sync Engine → Cloud                        │
│   • Encrypted backup + version control + Open Board Format   │
└─────────────────────────────────────────────────────────────┘
        Cloud: Auth/RBAC · Sync · Backup · (remote-edit portal — Phase 2)
```

### 9.2 Platform & stack (per the Android/Web‑first decision)
- **Recommended:** a cross‑platform framework with shared code for Android + Web (PWA) and later iOS — e.g., **Flutter** (compiles to Android + web + iOS) or **React Native + React/PWA**. Final choice is the engineering team's.
- **PWA consideration:** enables fast, cheap distribution but poses challenges for offline TTS, persistent storage, and system accessibility — see key risk.

### 9.3 TTS — the central technical risk
- **Challenge:** quality **offline** Hebrew TTS on Android/Web is non‑trivial. Browsers offer limited system voices; quality voices (Almagu) are usually online/native‑embedded.
- **Recommended approach:** hybrid — a guaranteed built‑in offline engine (system/embedded voice) as a base, + premium online voices when networked. On Web, consider a WASM‑based engine or aggressive audio caching.
- **Niqqud:** a niqqud service (Nakdan API) with **local caching** of results to avoid network dependence on repeat use; manual fixes saved per word.
- **Hebrew phonetics:** handle gutturals (ח/ע), dagesh, vocal/silent shva, stress (milel/milra), and proper names.

### 9.4 Data & images
Local source of truth (offline‑first); async cloud sync; encryption. Images: Camera API, crop, **on‑device background removal (ML)**, WebP compression. Open data format (OBF) for import/export and to avoid vendor lock‑in.

### 9.5 AI services (Phase 2+)
Symbol generation (server‑side), vocabulary suggestions, report drafts — always with **human approval** before exposure to the child, and subject to privacy.

### 9.6 Key technical risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| Quality offline Hebrew TTS on Android/Web | High | Hybrid architecture; audio caching; voice‑vendor agreement (Almagu) |
| PWA offline performance & accessibility | Medium | Early testing; fall back to native if needed |
| Symbol library licensing | Medium | ARASAAC free base; license SymbolStix/PCS/Widgit gradually |
| Auto‑niqqud accuracy | Medium | Manual fix + cache + Hebrew QA suite (see appendix) |
| Multi‑device sync conflicts | Low–Medium | Versioning + merge policy |

---

## 10. Gap Analysis

### 10.1 What existing apps lack
| Problem | Where | Our opportunity |
|---------|-------|-----------------|
| iOS lock‑in; no quality Hebrew Android | TouchChat, Grid, Proloquo2Go, LAMP | **Android + Web first** |
| High price ("empty desert" mid‑market, in Hebrew) | TouchChat ~₪700–900, Grid ~₪1,200–1,888 | accessible **Freemium + subscription + institutional** |
| Basic Hebrew, no auto‑niqqud | All tools | **Auto‑Nikud** + full morphology |
| Cumbersome cell‑by‑cell editing, dated UI | TouchChat | **modern builder + bulk editing** |
| No convenient/cross‑platform remote editing | TouchChat (local only) | **browser‑based editing portal** |
| Lack of personal/cultural symbols | Most tools | **Hebrew‑cultural set + AI iconography** |
| Paid external analytics | Realize Language | **built‑in clinical measurement** + privacy |
| Intimidating for parents | Grid, TouchChat | **simple parent mode + onboarding** |
| No GLP support | Most tools | **GLP toolkit** (whole phrases, vocal smileys) |
| Trial without voice output | TouchChat Discover | **real trial with speech** |
| Lack of skin‑tone/representation diversity | TouchChat | culturally diverse set |

### 10.2 Differentiators
1. Deep Hebrew (RTL, auto‑niqqud, morphology, cultural content).
2. Android + Web first (market gap) + user‑based licensing.
3. Two UX modes (simple parent / powerful clinician).
4. Modern builder + bulk editing + remote portal.
5. Built‑in clinical measurement (EBP) and privacy.
6. Controlled AI: cultural symbol generation, vocabulary suggestions, report drafts.
7. A language‑development system (Core, Motor Planning, Modeling, gradualness) — not a "board generator."

---

## 11. MVP Definition

### 11.1 Must‑have for v1 (Android + Web)
1. Multiple child profiles per device.
2. Ready Hebrew boards in 4 levels (4×4 → 12×12), by environment and goal.
3. Create/duplicate a custom board (builder with drag‑and‑drop, undo/redo, preview).
4. Cell editing: text+niqqud, symbol/photo, Fitzgerald color, action.
5. Capture & upload personal photos (+ crop).
6. Symbol library (ARASAAC base; SymbolStix/PCS gradually).
7. Hebrew TTS (basic offline + quality online), child/adult voices.
8. Automatic niqqud + manual override.
9. Sentence bar + speech + navigation (home/back/delete/clear/more).
10. Gradual hide/reveal of words.
11. Lock mode (Guided Access) + child/adult modes + permissions.
12. Access settings (Dwell, Activate‑on‑Release, double‑tap prevention).
13. Offline‑first + backup/restore + basic sync.
14. Basic usage logging (can be disabled).
15. Full RTL + friendly parent onboarding.

### 11.2 Out of MVP (later phases)
Remote editing · advanced analytics & reports · Voice Banking · AI symbol generation · AI assistant · VSD · Word Finder · Modeling mode · OBF · iPad/iOS · alternative access (switches/eyes) · board community/marketplace.

### 11.3 Success Metrics
- Vocabulary growth (unique words per week).
- Monthly MLU (mean length of utterance).
- % independent use (vs. prompted).
- Number of communication functions (request/comment/protest/greet).
- Parent & clinician satisfaction (NPS).
- Adoption: installs, active use, Free→Paid conversion.

---

## 12. Roadmap
> Time estimates are indicative; to be finalized with the engineering team.

| Phase | Focus | Key features | Platform |
|-------|-------|--------------|----------|
| **Phase 1 — MVP** (≈ Q1–Q2) | Communication + building + Hebrew | All of §11.1 | Android + Web (PWA) |
| **Phase 2** (≈ Q3–Q4) | Clinician power + depth | Remote editing, analytics & reports, Voice Banking, VSD, Word Finder, Modeling mode, OBF, **iPad/iOS** | + iOS |
| **Phase 3** (≈ Year 2) | AI + access + community | AI symbol generation, AI clinician assistant, alternative access (switches/eye tracking), board community/marketplace, language expansion | Multi‑platform |

### 12.1 Business model (summary, commercial product)
- **Freemium** — a real free base (including speech) to remove the entry barrier.
- **Subscription** — monthly/annual for advanced features (analytics, premium voices, cloud, remote editing).
- **Institutional licensing** — preschools, schools, HMOs, NGOs (group purchase/subscription).
- **User‑based licensing** (not device) — free movement between home/preschool devices.
- Pricing in ILS, significantly more accessible than competitors, with a **real trial that includes voice output**.

---

## Appendices

### Appendix A — Glossary
| Term | Meaning |
|------|---------|
| **AAC** | Augmentative & Alternative Communication |
| **Core Vocabulary** | Frequent, high‑utility words (80–85% of speech) |
| **Fringe Vocabulary** | Topic/context‑specific words |
| **Motor Planning** | Motor memory for a word's fixed position (basis of LAMP) |
| **Modeling / Aided Language Stimulation** | Adult demonstrates board use while speaking |
| **Fitzgerald Key** | Color coding for grammatical categories |
| **GLP** | Gestalt Language Processing — acquiring language as whole units |
| **MLU** | Mean Length of Utterance |
| **VSD** | Visual Scene Display |
| **T2L** | Transition to Literacy |
| **TTS** | Text‑to‑Speech |
| **Light's Competencies** | Linguistic, operational, social, strategic |

### Appendix B — Competitor comparison (merged summary)
| App | Platform | Pricing | Hebrew | Strength | Weakness |
|-----|----------|---------|--------|----------|----------|
| **TouchChat HD** | iOS only | ~₪707–900 one‑time | Full (MATACH + Almagu) | Deep customization, 8 Hebrew boards, head‑tracking | Dated UI, no remote editing, expensive, bugs |
| **Grid for iPad** | iPad + Windows | ~₪1,200–1,888 / sub | Full, "Smart Grammar" | Flexibility, remote editing, multi‑library, AI | Expensive, heavy, no iPhone, complex setup |
| **Proloquo2Go** | iOS | ~$249 one‑time | Very limited | Crescendo, 100+ voices, gradualness | No full Hebrew, long setup |
| **LAMP WFL** | iOS (and Android) | ~$299 | None (voices only) | Consistent motor planning | Less flexible, no full Hebrew |
| **TD Snap** | iPad + Windows | Free/~$149 | Partial | Many page sets, eye tracking | No Android, dedicated hardware |
| **SymboTalk** | Android/iOS/Web | Free/Pro | Basic (external engine) | Free, Israeli, sync | Fewer symbols, less clinical |
| **Cboard** | Web/Android/iOS | Free (open) | Basic | Free, 40+ languages, offline | Less professional |
| **CoughDrop** | Multi‑platform | ~$9/mo or $295 | Basic | Cloud+offline, free supervisor, OBF | Weak Hebrew, less polished UI |

### Appendix C — Hebrew TTS QA suite
| Topic | Examples |
|-------|----------|
| Niqqud | אָבָּא, אִמָּא, בּוֹא, תֵּן |
| Homographs | סֵפֶר / סָפַר / סְפָר |
| Gender | רוֹצֶה / רוֹצָה, הוֹלֵךְ / הוֹלֶכֶת |
| Number | יֶלֶד / יְלָדִים |
| Natural sentences | "אני רוצה לשחק", "כואב לי בבטן" |
| Proper names | רועי, נועם, תפארת |
| Everyday slang | "בא לי", "די", "עוד פעם" |
| Mixed languages/digits | Hebrew + English + digits in one sentence |

### Appendix D — Sources & assumptions
- **Sources:** merge of 4 research documents (`.docx` files in the repo root): GEMINI, ChatGPT, Opus, Researcher‑1, all based on official sites (TouchChat, Grid, Proloquo2Go, LAMP, TD Snap), App Store/Google Play reviews, and clinical sources (ASHA, Janice Light, AssistiveWare).
- **Contradiction resolutions:** platform (unified to the user's decision: Android/Web→iPad); latency targets (separated visual feedback vs speech start); color coding (Modified Fitzgerald adopted as default).
- **Open assumptions (to confirm):** final TTS vendor (Almagu preferred); niqqud vendor (Nakdan); stack (Flutter vs React Native); symbol‑library licensing; exact budget and timeline.

---

*A professional merge of 4 research documents. Primary Hebrew version: `PRD-he.md`. Maintained in git; see `HANDOFF.md` for a project 