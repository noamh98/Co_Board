# TOOLING-AUDIT — Claude Code skills, hooks & agent-config docs

> נכתב: 2026-07-05 (סבב audit ייעודי). מסמך זה באנגלית כי הוא מתאר תשתית-סוכן (hooks/skills), לא מוצר.
> Scope: everything that configures or steers Claude Code sessions for this repo — project-level hooks/skills/CLAUDE.md, the managed remote-environment hooks, and the "prompt-as-agent-config" documents (`EXECUTION-PROMPT.md`, `docs/reviews/NEXT-SESSION-PROMPT.md`, `README.md` reading-order table).

## 1. Inventory

Two distinct layers exist:

**Layer A — managed environment (`/root/.claude/`, owned by the Claude-on-the-web platform, ephemeral, not committable):**

| Item | Type | Trigger | State |
|---|---|---|---|
| `session-start-git-identity.sh` | SessionStart hook | every session start | registered in `launcher-settings.json`, active |
| `stop-hook-git-check.sh` | Stop hook | end of every turn | registered, active — blocks turn-end while uncommitted/unpushed/unverifiable commits exist |
| `stop-hook-reply-gate.py` | Stop hook | Slack-originated sessions only (`CCR_REPLY_STOP_HOOK_REASON`) | present, **not registered** for this session type |
| `user-prompt-submit-reply-reminder.py` | UserPromptSubmit hook | Slack-originated sessions only | present, **not registered** |
| `skills/session-start-hook/SKILL.md` | Skill | user asks to set up repo for web sessions | available (used by this audit) |

**Layer B — project-level (committable, was EMPTY before this audit):**

| Item | State before audit |
|---|---|
| `CLAUDE.md` | ❌ did not exist |
| `.claude/settings.json` + hooks | ❌ did not exist — fresh clones had no `node_modules`, so lint/tests could not run until someone manually installed |
| Project skills / slash commands | ❌ none |
| `EXECUTION-PROMPT.md` | de-facto agent config; stale (see below) |
| `docs/reviews/NEXT-SESSION-PROMPT.md` | de-facto agent config; fully executed, still phrased as runnable |
| `README.md` reading-order table | steering doc; stale paths |

## 2. Findings & actions

| Skill/Hook/Doc | Purpose | Issues Found | Recommended Change | Priority |
|---|---|---|---|---|
| *(missing)* project SessionStart hook | install `app/` + `functions/` deps in web sessions | Entire gap: every remote session started without `node_modules`; agent burns turns on `npm install` or skips testing | **Added** `.claude/hooks/session-start.sh` + `.claude/settings.json` (sync mode, remote-only gate, idempotent; does NOT `playwright install` — browsers are pre-baked at `/opt/pw-browsers`) | **P0 — applied** |
| *(missing)* `CLAUDE.md` | per-session distillation: commands, invariants, conventions | Invariants lived only in `docs/reviews/HANDOFF.md` §4, behind two stale path references; a session that skips HANDOFF can silently break Motor-Planning/offline-first/CSS-order | **Added** root `CLAUDE.md` — points to HANDOFF as source of truth, lists the 9 hard invariants, gate commands, commit conventions, and marks the historical prompts as do-not-execute | **P0 — applied** |
| `EXECUTION-PROMPT.md` | original build prompt (role, subagent tiers, milestones M0–M6) | Recommends Flutter (actual stack: React+TS+Vite per adr-0001); M0–M6 long finished; references root `HANDOFF.md` (moved); a fresh session pasting it would plan the wrong project | **Applied:** prominent "historical — do not re-run" banner pointing to CLAUDE.md/HANDOFF; content preserved (process principles still referenced). Full deletion NOT recommended — it documents the delegation/QA methodology | P1 — applied |
| `docs/reviews/NEXT-SESSION-PROMPT.md` | continuation prompt for Phase 2–3 | Every listed task completed & merged (PR #10, HANDOFF §7); re-running it would redo finished work on a stale branch name | **Applied:** "✅ executed — historical" banner. Keep file as record of the session protocol | P1 — applied |
| `README.md` reading-order table | tells humans+agents what to read when | `HANDOFF.md` root path wrong (3 places); `*.docx` research files listed but never committed; status line hardcoded stale counts ("244 tests, M22") | **Applied:** paths fixed to `docs/reviews/HANDOFF.md`; docx line removed (files are not in the repo — flagged here, not silent); status now defers to HANDOFF §7/CHANGELOG instead of hardcoding numbers | P1 — applied |
| `app/README.md` | app run instructions | `../HANDOFF.md` stale path | **Applied:** fixed to `../docs/reviews/HANDOFF.md` | P2 — applied |
| `session-start-git-identity.sh` (managed) | keep commits SSH-verifiable + co-author trailer | None functional. Well-hardened (passthrough stubs, trailer-injection sanitization). Not project-owned | No change — platform-managed, out of repo scope | — |
| `stop-hook-git-check.sh` (managed) | force commit+push before turn end | Minor: flags *any* untracked file, so scratch files inside the repo tree force a commit; mitigated by using the session scratchpad dir. Not project-owned | No change; note in CLAUDE.md conventions implicitly avoids it (work is committed per task) | P3 |
| `stop-hook-reply-gate.py` / `user-prompt-submit-reply-reminder.py` (managed) | Slack-surface reply enforcement | Inactive here by design (env-gated). Correctly never-trap (fail-open) | No change — dormant, correct | — |
| `skills/session-start-hook/SKILL.md` (managed) | guide for creating SessionStart hooks | Cosmetic: frontmatter `name: startup-hook-skill` ≠ directory name `session-start-hook`; sample uses async while text says "don't use async first" | Platform-owned; no repo action. (This audit followed its workflow: hook ran 36s cold, lint + 1 test verified green) | P3 |
| `.github/workflows/ci.yml` | CI gate (typecheck+lint+coverage+build, e2e+axe, rules) | Healthy; matches HANDOFF §5 commands. `npx playwright install` is correct **in CI** (GitHub runners lack the pre-baked browsers) — do not copy that line into the session hook | No change | — |
| `.github/workflows/deploy.yml` | auto-deploy on main | Healthy; secrets comment freshly fixed (PR #25) | No change | — |

## 3. Proposed new skills/hooks (not yet created)

1. **`/verify-offline` project skill (P2).** The #1 invariant (offline-first) has no automated gate: CI runs unit+e2e online. A skill encoding the manual check already used in Phase 2.4 (build → `vite preview` → wait for SW active → cut network → reload → board renders from cache, headless Chromium at `/opt/pw-browsers`) would turn "בדיקת offline ידנית" from tribal knowledge into a runnable step. Even better follow-up: promote it to a Playwright spec using `context.setOffline(true)` and add it to the `e2e` CI job.
2. **`/hebrew-qa` project skill (P2).** PRD Appendix C defines the Hebrew QA battery (nikud, homographs, gender/number, natural sentences, code-switching). No harness exists. A skill that runs the nikud service + TTS provider against a fixture list of these cases (offline, using the cache layer) would catch regressions the generic test suite can't.
3. **PostToolOff invariants guard — recommend NOT building (P3, flagged to avoid re-litigating).** A PreToolUse/PostToolUse hook grepping edits to `domain/layout.ts` / `styles/` import order was considered and rejected: the invariants are semantic (cell positions, cascade order), regex hooks would be noisy and give false confidence. CLAUDE.md + the existing `BuilderView` ConfirmDialog on core-cell moves are the right enforcement points.
4. **HANDOFF-sync Stop-hook — recommend NOT building.** Forcing "HANDOFF updated in same commit" via a hook can't distinguish behavior-changing commits from mechanical ones; kept as a CLAUDE.md convention instead.

## 4. Verification of applied changes

- Hook executed with `CLAUDE_CODE_REMOTE=true`: app deps (676 pkgs, 16s) + functions deps (848 pkgs, 20s), exit 0, idempotent.
- `npx eslint src/App.tsx` → exit 0; `npx vitest run src/domain/layout.test.ts` → 6/6 passed.
- Known non-fatal: `functions/package.json` pins `engines.node: 20`, remote image runs Node 22 → `EBADENGINE` warning on install (CI still uses Node 20; consider `"node": ">=20"` only if it ever becomes blocking).
