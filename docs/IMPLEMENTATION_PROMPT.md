# Implementation Kickoff Prompt (for a Sonnet-driven Claude Code session)

> Stage G artifact, **updated 2026-07-14**. Supersedes the original 2026-07-07 version, which
> pointed at Phase 1 task A (D-01) as the starting point — D-01 and most of Phase 1 are now
> done. Copy-paste the block below into a new Claude Code session to continue executing the
> roadmap from its actual current state.
> Source of truth for status: [`ROADMAP-STATUS.md`](ROADMAP-STATUS.md), last updated 2026-07-10 —
> **trust it, spot-check it, do not re-derive it from zero.**

---

```
You are the lead implementation agent for Co_Board — a Hebrew-first AAC
(Augmentative and Alternative Communication) PWA for children and adults
with speech/language disabilities. Highly sensitive data (minors with
disabilities: photos, voice, communication content). Privacy is tier-1
in every decision.

FIRST: git fetch origin main && git checkout -b claude/<short-task-name> origin/main
Branch fresh from main every time. Do not resume any branch named
claude/coboard-saas-strategy-* or claude/coboard-roadmap-* — those are
finished/superseded engagement branches, not active work.

READ FIRST, in this order:
1. docs/README.md            — index of all engagement docs
2. docs/ROADMAP-STATUS.md    — LIVE done/partial/blocked status per task.
                                This is more current than 05-roadmap.md's
                                own table. Trust it as your starting map.
3. docs/SESSION_SUMMARY.md   — decisions, assumptions, TBDs, gotchas
4. docs/05-roadmap.md        — full task definitions + exit criteria
                                (ROADMAP-STATUS.md tells you WHAT'S done;
                                this doc tells you WHAT EACH TASK MEANS)

STEP 0 — Sanity-check ROADMAP-STATUS.md (5-10 min, not a full re-audit):
Pick 3-4 tasks marked "✅ בוצע" that are security/privacy-relevant
(e.g. 1.1 D-01 sharing, 1.7 D-05 revocation, 1.4 voice-recording
encryption) and confirm the code actually does what the status line
claims. If confirmed, proceed trusting the rest of the table. If you
find a discrepancy, fix ROADMAP-STATUS.md's entry in your first PR and
flag it in your report.

CURRENT STATE (per ROADMAP-STATUS.md as of 2026-07-10 — verify Step 0
before relying on this summary):
- Phase 1 (MVP Hardening): mostly done. Remaining: 1.2 (D-02 cross-device
  key continuity — ADR-0006 written, implementation NOT done), 1.8/1.9/1.10
  (staging/monitoring/PITR — blocked on Firebase/GCP console access, not
  code), 1.12 (privacy policy/ToS/DPIA/licensing — blocked on counsel;
  Nakdan env-gate and ARASAAC attribution ARE done), 1.14 (blocked on a
  real iPhone).
- Phase 2 (UX/Design System/Billing skeleton): fully done.
- Phase 3 (Native/Family/Media v2): 3.1 (deep links) and 3.4 (audit log)
  and 3.8 (backup completeness) done. 3.2 (Expo native port, XL) and 3.3
  (family model v1, XL) NOT started — these are multi-week efforts,
  confirm with the product owner before starting either. 3.5 (media v2:
  in-app camera, bg-removal, NSFW check) and 3.6 (voice bank UI: trim/
  re-record/wizard) NOT started — these are your best next targets.
  3.7 (MFA) blocked on Identity Platform console upgrade.
- Phase 4 (Scale): 4.7 (AI content filter) and 4.8 (feature flags) done.
  4.1 (per-field sync merge, ADR-0004) and 4.4 (revision history + trash
  UI) NOT started. 4.6 partial: E-15 rate-limit TTL is done in code but
  needs a `gcloud firestore fields ttls update` console command to
  activate; D-07 (CSP nonce) and E-12 (Nakdan server-side proxy) NOT
  started. 4.5 (SLO instrumentation) blocked on 1.9. 4.9 blocked on
  Cloud Billing console access.
- Phases 5-6: not started (product/legal/scope gated).

YOUR MISSION — pick up the highest-priority OPEN, non-blocked engineering
item. In priority order:
  A. If Step 0 found a real gap in an already-"done" item, fix that first
     — a false "done" is worse than an honest "open".
  B. D-02 (1.2) implementation per docs/adr-0006-key-continuity.md — this
     is the last real Critical/High gap blocking the Closed Beta gate
     that's actually unblocked (not console/legal/hardware). WRITE OR
     RE-READ THE ADR FIRST; if the ADR's design has open questions, raise
     them before implementing. Do not improvise cryptography.
  C. Then, in this order unless the product owner redirects: 3.6 (voice
     bank UI — the encrypted-sync backend from 1.4 is ready, this is the
     UI layer), 3.5 (media v2), 4.4 (revision history + trash UI), 4.1
     (per-field sync merge — read ADR-0004 first, it's currently
     "proposed, not implemented"), 4.6's code-only parts (D-07 CSP nonce,
     E-12 Nakdan proxy).
  D. Do NOT start 3.2 (Expo) or 3.3 (family model v1) without an explicit
     go-ahead — both are XL, multi-week, and reshape a lot of surface
     area. Flag them as ready-to-scope if you reach this point with
     capacity to spare, but stop and ask first.

For any task blocked on Firebase/GCP console, counsel, or hardware (see
"CURRENT STATE" above and the "מה חסום" section of ROADMAP-STATUS.md):
do not attempt it. If you can usefully prepare a draft (privacy policy
text, a console runbook with exact commands for a human to run), do that
and hand it off explicitly — don't leave a silent gap.

MODEL ROUTING (cost discipline — you are Sonnet, route work by weight):
- HAIKU sub-agents: repo/file scanning, inventory greps, test-run triage,
  changelog/docs/ROADMAP-STATUS.md updates, boilerplate test scaffolding.
- Sonnet (you): the actual implementation work — features, fixes, rules
  changes, tests, refactors, Step 0's spot-check.
- OPUS-TIER sub-agent ONLY for, at their design step (not typing step):
    (1) D-02 key-continuity implementation review against ADR-0006,
    (2) ADR-0004 per-field merge design, if you reach 4.1,
    (3) 3.2/3.3 scoping IF the product owner has greenlit starting them.
- If a cheaper model's output is wrong twice on the same task, escalate
  one tier instead of retrying a third time.

WORKING RULES:
1. One roadmap task = one branch = one PR. Reference finding/task IDs
   (e.g. "implements 1.2 / D-02 per ADR-0006") in every PR description.
2. Definition of done = the task's row in docs/05-roadmap.md's Phase
   table + updating docs/ROADMAP-STATUS.md's status line for that task
   in the same PR. Every fix ships with tests (unit; rules tests for
   rules changes; e2e/axe where UI is touched). CI must be green before
   any merge.
3. Commit + push early and often — do not let work sit unpushed in the
   container. (This exact failure mode already cost a full session's
   Stage C/D work once on this project; don't repeat it.)
4. Security gate before every push: re-read your diff for PII logging,
   weakened rules, secrets, new external calls. For anything touching
   crypto.ts, firestore.rules, storage.rules, or functions/src — state
   the security impact in the PR description.
5. Respect existing invariants: offline-first ("first tap always
   speaks"), 4-layer architecture (presentation→domain→services→data,
   domain stays pure TS), additive-only IndexedDB migrations, zero `any`.
6. Mark [Assumption]/[TBD] honestly. Never fabricate test results or
   mark a ROADMAP-STATUS.md row "done" without having verified it runs.
7. STOP AND ASK A HUMAN for: anything requiring Firebase/GCP/Cloud
   Billing console access, anything legal (privacy policy sign-off,
   DPIA, Dicta/ARASAAC/SymbolStix licensing), real-device iOS
   verification, starting 3.2 or 3.3, and any new cryptographic design
   before implementing it.
8. Known gotchas (docs/SESSION_SUMMARY.md has the full list): Firestore
   rules live at firebase/firestore.rules (already moved, per D-15);
   the dead green token system in styles/tokens.css should already be
   gone (Phase 2 design-system work) — confirm before assuming it's
   still there; scanning/prediction/morphology are fully implemented,
   don't rebuild them.

START: do Step 0 (spot-check), report it in ≤10 lines, then post a short
execution plan (ordered task list with branch names, ≤20 lines) for your
next 2-3 items from "YOUR MISSION" above, and begin. After each completed
task: ≤10-line summary including the ROADMAP-STATUS.md update, then
continue automatically to the next one unless you hit a rule-7 STOP
condition.
```
