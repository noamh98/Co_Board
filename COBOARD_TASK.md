# Co_Board – Path to Best‑in‑Israel AAC Shelf Product

## Full Technical Due Diligence
## Production Readiness Assessment
## UX / Accessibility Overhaul
## Cross‑Platform Delivery Plan (Web / iOS / Android / Tablet / Desktop)
## MVP → Scale Roadmap (1 → 10,000 users)
## Documentation & Handoff Planning

---

### Background

**Co_Board** is a Communication Board platform (AAC – Augmentative and Alternative Communication) for:
- **Children** with speech/language delays, ASD, CP, apraxia, selective mutism.
- **Adults** post‑stroke, ALS, dementia, or with intellectual disabilities.
- **Families, SLPs (קלינאי תקשורת), special‑ed teachers, occupational therapists.**

Today it is an experimental prototype. The goal of this review is to transform it into **the leading AAC shelf product in Israel** – trusted by families, therapists, HMOs (קופות חולים), Ministry of Education (משרד החינוך), and Ministry of Welfare.

Determine:
- Whether the current codebase can become a commercial multi‑tenant SaaS.
- What must change in **UX, accessibility, performance, security, privacy, and platform coverage**.
- What is the fastest safe path to 1,000 → 10,000 active users.

Assume the system stores **highly sensitive data of minors and people with disabilities** (photos, voice, therapy history, diagnoses). Treat privacy as tier‑1.

---

## Source Of Truth

- Source code = primary truth.
- Database schema = primary truth.
- Infrastructure / IaC = primary truth.
- Product Skill / Knowledge Base = business context only.

For every doc↔code contradiction: report, explain risk, propose correction.

---

## Deliverable Requirements

For **every** finding provide:
- Impact
- Risk
- Root cause
- Recommended solution
- Implementation complexity (S / M / L / XL)
- Owner suggestion (which sub‑agent should execute)

---

## 🧠 Multi‑Agent Execution Strategy (Token & Quality Optimization)

Use Claude Code's sub‑agent capability. Route work by complexity:

| Sub‑Agent            | Model            | Responsibility                                                                 |
|----------------------|------------------|--------------------------------------------------------------------------------|
| **Scout**            | Haiku            | Repo scanning, file inventory, dependency listing, dead‑code detection.        |
| **Analyst**          | Sonnet           | Code review, DB review, test coverage analysis, cost modeling.                 |
| **Architect**        | Opus             | Architecture decisions, multi‑tenant model, scaling & DR strategy.             |
| **UX Auditor**       | Sonnet           | Heuristic evaluation, WCAG 2.2 audit, RTL/Hebrew review, design system draft.  |
| **Security Sentinel**| Sonnet (persistent) | Continuous security/privacy/permissions watchdog on every diff.             |
| **Optimizer Watchdog**| Haiku (persistent) | Monitors bundle size, query cost, AI token spend, latency budgets.          |
| **QA Agent**         | Sonnet           | Generates test plans (unit / e2e / accessibility / load).                      |
| **Docs Agent**       | Haiku            | Produces/updates `/docs` structure.                                            |

Rules:
- **Scout first, Architect last.** Never burn Opus tokens on discovery.
- Every PR/diff must pass **Security Sentinel** and **Optimizer Watchdog** before merge suggestion.
- Persistent agents post short status reports (≤ 20 lines) after each phase.

---

## Part 1 – System Discovery

Document:
- Overall architecture (client/server/DB/CDN/storage/AI)
- Frontend framework, state mgmt, routing, i18n, RTL handling
- Backend framework, API style (REST/GraphQL/tRPC)
- Database engine, schema, migrations
- Authentication (providers, session/JWT, family/child roles)
- Storage (images, audio, symbol libraries)
- AI integration (TTS, image generation, symbol suggestion, translation)
- External services (analytics, error tracking, push, email/SMS)
- Environment structure (dev/staging/prod)

Generate **Current State Architecture Diagram** (Mermaid).

---

## Part 2 – Production Readiness Assessment

Evaluate readiness for:
- Internal Testing
- Closed Beta (10 families + 3 SLPs)
- First Paying Customer
- 100 / 500 / 1,000 / 10,000 users
- Institutional deployment (school / HMO)

For each level: status, blocking issues, required improvements.

---

## Part 3 – Code Quality Assessment

Review project structure, maintainability, technical debt, error handling, logging, config, dependencies. Identify critical problems, high‑risk modules, refactor targets.

---

## Part 4 – Database Assessment

Schema design, integrity, constraints, relationships, indexes, query efficiency, growth projections. Identify full table scans, missing indexes, expensive queries, concurrency & corruption risks. Model growth: 1,000 users × ~200 boards × ~50 tiles × media assets.

---

## Part 5 – Scalability Assessment

Model 10 / 100 / 500 / 1,000 / 10,000 users. Review backend, DB, AI, media storage/CDN, API. Recommend scaling architecture (edge caching for boards, signed URLs for media, background jobs for TTS).

---

## Part 6 – Reliability Assessment

Error recovery, retries, transactions, failure isolation. Identify SPOFs, data‑loss scenarios, downtime risks.  
**AAC‑specific:** the app MUST work offline (a non‑verbal child cannot lose the ability to communicate because Wi‑Fi died).

---

## Part 7 – Security Assessment

### Authentication
- Password storage (Argon2id / bcrypt cost)
- MFA readiness (for therapists & parents)
- Session management, JWT rotation, refresh tokens
- Account recovery (without locking a child out of their voice)
- **Child accounts under parental control** (COPPA‑like model)

### Authorization
- Role model: **Parent, Child, Co‑Parent, Therapist, School Staff, Admin**
- Board sharing permissions (view / edit / clone)
- Tenant isolation

### API Security
- Injection, XSS, CSRF, SSRF, IDOR
- Input validation, output encoding
- Rate limiting (esp. on TTS/AI endpoints – cost abuse)
- File upload validation (image/audio MIME sniff, size, malware scan)

### Secrets
- API keys, tokens, credentials, env vars, mobile app secrets (never in binary)

### Infrastructure Security
- Network exposure, public endpoints, WAF, service hardening
- Mobile: certificate pinning, jailbreak/root detection (soft)

Assign Critical / High / Medium / Low severity.

---

## Part 8 – Privacy Assessment

Assume: photos & voice of **minors with disabilities**, therapy notes, diagnoses.

Review:
- Encryption in transit (TLS 1.3) & at rest (AES‑256, per‑tenant keys where possible)
- Sensitive data exposure in logs / errors / analytics
- Data minimization (do we really need X?)
- Right to erasure, portability, access logs
- Consent flows (parent for child, dual‑parent scenarios, divorced families)

Assess alignment with:
- **חוק הגנת הפרטיות** (Israel) + **תקנות אבטחת מידע 2017** (רמת אבטחה גבוהה)
- **רשם מאגרי מידע** – חובת רישום
- **GDPR** (for EU expansion)
- **COPPA** (children under 13, if US)
- **HIPAA** (if US therapists) – posture only, not full certification day‑1
- **תקן ישראלי 5568** + **WCAG 2.2 AA (aim AAA where feasible)**
- **EN 301 549** (EU accessibility)
- **תקנות שוויון זכויות לאנשים עם מוגבלות (שירות)** – חובת נגישות דיגיטלית

Provide gaps + remediation plan + DPIA (Data Protection Impact Assessment) template.

---

## Part 9 – Multi‑Tenant Assessment

Assume 5,000 independent families + 500 clinics + 50 schools.  
Review tenant isolation, data segregation, query isolation, cross‑tenant sharing (e.g., a therapist working with 20 families).

Answer: *Can one tenant accidentally access another tenant's data?* If yes → remediation plan (row‑level security, tenant ID guards, tests).

---

## Part 10 – Backup & Recovery

Strategy, procedures, frequency, validation. What happens if DB / storage / server / region is lost? Recommend backup & recovery architecture (PITR, cross‑region snapshots, encrypted off‑site copies).

---

## Part 11 – Disaster Recovery

Define recommended **RTO / RPO** per data class:
- Boards & tiles: RPO ≤ 5 min (a child's personalized board is irreplaceable)
- Media (photos/audio): RPO ≤ 1 hour
- Analytics: RPO ≤ 24 h

Produce DR + Business Continuity strategy.

---

## Part 12 – Observability

Logs, metrics, monitoring, dashboards, alerting, tracing.  
**AAC‑specific SLOs:** board load < 1s on mid‑range Android, tile tap → speech < 150ms, offline sync success ≥ 99.5%.

Recommend stack (e.g., Sentry + Grafana Cloud + OpenTelemetry) + implementation roadmap.

---

## Part 13 – DevOps

CI/CD, deployment, environment separation, secrets, release strategy, rollback, feature flags (LaunchDarkly/Unleash), mobile store release pipelines (TestFlight / Play Internal / Closed / Open).

---

## Part 14 – AI Assessment

Current & planned AI usage:
- TTS (Hebrew + Arabic + English)
- Symbol suggestion / auto‑layout
- Photo → symbol conversion
- Voice cloning (family member's voice) – **highest risk area**
- Translation of boards

Review: prompt injection, data leakage, cost, abuse prevention, hallucination, fallback.  
Model scenarios: huge uploads, provider outage, spikes.  
**Voice cloning safeguards:** explicit consent, liveness check for the person being cloned, watermarking, deletion on request, no cloning of minors' voices without dual‑parent consent.

---

## Part 15 – Data Loss Assessment

Soft delete, versioning (a therapist edits a child's board – must be able to revert), accidental deletion handling, historical recovery, "trash" bin for 30 days. What events cause irreversible loss? Mitigations.

---

## Part 16 – Cost Assessment

Estimate infra + monthly opex for 100 / 500 / 1,000 / 10,000 users. Include hosting, DB, storage, CDN, AI (TTS minutes, image gen), monitoring, backups, app store fees, support. Show assumptions and unit economics (LTV / CAC sensitivity).

---

## Part 17 – 🎨 UX & Design System Overhaul (NEW – critical)

Current design is not satisfactory. Redesign with:

### 17.1 Design Principles
- **Child‑first, therapist‑approved, parent‑friendly.**
- One‑tap to speak, zero cognitive friction.
- Large touch targets (≥ 60×60 pt, ideally 88×88 pt for motor impairments).
- High contrast mode, dyslexia‑friendly font option (OpenDyslexic / דיסלקסיה עברית).
- Reduced motion mode.
- Hebrew RTL first‑class citizen, not an afterthought.

### 17.2 Design System
- Token‑based (color, spacing, radius, typography, motion).
- Component library (Storybook) with a11y annotations.
- Symbol library integration: **ARASAAC** (free, CC), option for **SymbolStix / PCS** (licensed).
- Themes: light, dark, high‑contrast, "sensory calm."

### 17.3 Key Flows to Redesign
- Onboarding (family / therapist / school branches)
- Board builder (drag‑drop, categories, folders, quick add from camera)
- Board play mode (fullscreen, lock to child, guided access hint on iOS)
- Family member capture flow (photo + name + relationship + voice recording)
- Sharing a board with a therapist
- Progress / usage analytics for parents & therapists

### 17.4 Deliverables
- Heuristic audit (Nielsen's 10) with scores
- WCAG 2.2 audit (per success criterion)
- Redesign proposal (Figma spec text / component tree)
- Motion & haptics guidelines
- Copy tone guide (Hebrew, simple language – "עברית פשוטה")

---

## Part 18 – 📱 Cross‑Platform Delivery (NEW – critical)

Target platforms:
- **Web** (PWA, installable, offline‑capable)
- **iOS** (iPhone + iPad, Guided Access + Assistive Touch friendly)
- **Android** (phone + tablet, incl. low‑end devices ₪500–₪1,000 range common in Israel)
- **Desktop** (Windows/Mac via web or Electron/Tauri wrapper for classroom use)

Evaluate strategies:

| Strategy                | Pros                                    | Cons                                | Fit for Co_Board |
|-------------------------|-----------------------------------------|-------------------------------------|------------------|
| PWA only                | 1 codebase, fastest ship                | iOS PWA limits (audio, install UX)  | Phase 1          |
| React Native + Web (Expo) | 1 codebase, real native, good a11y    | Some native modules needed          | **Recommended P2** |
| Flutter                 | Great perf, single codebase             | A11y on iOS still weaker than RN    | Alt              |
| Native iOS + Native Android | Best UX & a11y                       | 3× cost                             | Only if scale demands |

Recommend a **phased path**: PWA → React Native (Expo) with shared logic → optional native modules for voice recording & guided access.

Include: offline‑first sync strategy, conflict resolution, background sync of media, push notifications, deep links.

---

## Part 19 – ♿ Accessibility Deep Dive (NEW – critical)

Beyond WCAG. AAC users often have:
- Motor impairments → switch access, dwell click, head tracking
- Visual impairments → VoiceOver / TalkBack full support, large text
- Cognitive load sensitivity → predictable layouts, no surprise animations
- Sensory sensitivity → volume caps, calm palettes

Deliverables:
- Screen reader script coverage (VoiceOver/TalkBack) per screen
- Switch control support plan (1‑switch, 2‑switch scanning)
- Eye‑gaze / head‑tracking compatibility roadmap
- Keyboard navigation full map
- Testing matrix: real devices × assistive tech × OS versions
- Accessibility statement (הצהרת נגישות) template per תקן 5568

---

## Part 20 – 👨‍👩‍👧 Family & Multi‑Role Account Model (NEW)

Design:
- **Family account** = 1 billing entity, N members (parents, children, co‑parents, grandparents optional).
- **Child profile** = owned by family; boards, media, voice bank scoped to child.
- **Therapist link** = time‑bound, revocable, audit‑logged, minimal scope (only assigned children).
- **School staff link** = classroom‑scoped, principal‑approved.
- **Divorced parents** = dual custody mode, per‑action consent for sensitive changes (voice cloning, deletion).

Include: invite flow, permission matrix, audit log schema, billing model (family plan / clinic plan / school plan).

---

## Part 21 – 🎙️ Media Features Spec (NEW)

### Photo Capture & Upload
- In‑app camera with grid, face guide, auto‑crop.
- On‑device background removal (optional).
- EXIF stripping before upload.
- Server‑side moderation (NSFW filter) – with human‑in‑the‑loop for edge cases.

### Voice Recording
- Record family voices per tile ("אמא", "אבא", "סבתא רותי").
- Waveform preview, trim, re‑record.
- Storage: original + compressed (Opus).
- Optional AI voice cloning – **gated by consent + identity verification**.

### Symbol Sources
- Bundled ARASAAC set (offline).
- User uploads.
- AI‑generated (with content policy filter).

---

## Part 22 – Documentation Gap Analysis

Inventory existing docs. Recommended structure:

```
/docs
  product-overview.md
  architecture.md
  database-design.md
  security-design.md
  privacy-and-compliance.md
  accessibility.md
  design-system.md
  api-guide.md
  mobile-build-guide.md
  deployment-guide.md
  monitoring-guide.md
  backup-and-dr.md
  operations-runbook.md
  incident-response.md
  roadmap.md
```

---

## Part 23 – Handoff Assessment

Onboarding a new developer to zero‑knowledge → productive in ≤ 3 days. Produce Handoff Package Spec (architecture, deploy, env vars, secrets inventory, DB docs, API docs, monitoring, troubleshooting, backup, recovery, on‑call).

---

## Part 24 – MVP Readiness Plan

Groups:
- **Must Have Before First Paying Family**
- **Must Have Before 100 Users**
- **Must Have Before 500 Users**
- **Must Have Before 5,000 Users**
- **Must Have Before Institutional Sales (HMO / MoE)**
- **Nice To Have**

Per task: priority, risk addressed, complexity, dependencies, owning sub‑agent.

---

## Part 25 – Implementation Roadmap

- **Phase 0** – Current State snapshot
- **Phase 1** – MVP Hardening (security, privacy baseline, offline, RTL, WCAG AA)
- **Phase 2** – UX Overhaul + Design System + PWA polish
- **Phase 3** – Native apps (iOS/Android) via Expo, family accounts, media features
- **Phase 4** – Scale to 5,000 users, observability, cost optimization
- **Phase 5** – Institutional readiness (HMO / MoE / EU), voice cloning w/ safeguards
- **Phase 6** – Regional expansion (Arabic, English)

Per phase: goals, tasks, risks, deliverables, exit criteria.

---

## Part 26 – Risk Register

Columns: ID | Risk | Severity | Likelihood | Impact | Mitigation | Owner | Status.  
Include AAC‑specific risks (child locked out of voice, wrong voice attributed to family member, sensitive photo leak, therapist over‑access).

---

## Part 27 – Production Readiness Scorecard (0–100)

Architecture · Scalability · Reliability · Security · Privacy · **Accessibility** · **UX** · **Cross‑Platform Coverage** · DevOps · Monitoring · DR · Documentation · Maintainability · AI Readiness · **Regulatory (IL)**.  
Provide reasoning per score.

---

## Part 28 – Final Executive Summary

- Critical Findings
- High / Medium Risks
- Top 10 Priorities
- Recommended Next Actions (30 / 60 / 90 days)
- Go / No‑Go per milestone:
  - Ready for closed beta?
  - Ready for first paying family?
  - Ready for 500 users?
  - Ready for clinic pilots?
  - Ready for MoE / HMO tender?

Justify every answer.

---

## Final Requirement

Do **not** stop after analysis. Produce a **practical, sequenced implementation plan** a small team (1–3 devs + designer + QA) can execute.

Final output must serve as:
- Technical audit
- UX overhaul plan
- Accessibility compliance plan
- Cross‑platform delivery plan
- Privacy & security hardening plan
- MVP & scale roadmap
- Documentation & handoff package

**Goal:** enable safe growth from prototype to **the best AAC shelf product in Israel**, trusted by families of children who cannot speak, and by the professionals who serve them.