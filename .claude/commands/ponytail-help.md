Quick reference for ponytail levels, skills, and commands.

Show a concise help card:

**Levels** (use with `/ponytail <level>`):
- `lite` — YAGNI + reuse checks only, still writes helpers when genuinely needed
- `full` (default) — full decision ladder, one-liners preferred, no speculative abstractions
- `ultra` — maximum minimalism, stdlib/native over any new code, comment every shortcut
- `off` — disable ponytail mode, return to default agent behavior

**Commands**:
- `/ponytail [lite|full|ultra|off]` — set intensity level
- `/ponytail-review` — scan current diff for over-engineering
- `/ponytail-audit` — scan whole repo for what can be deleted
- `/ponytail-debt` — harvest all `ponytail:` comments into a tracked ledger
- `/ponytail-gain` — show benchmark impact metrics (lines, cost, speed)
- `/ponytail-help` — this help card

**The decision ladder** (checked before any code is written):
1. Does this need to exist? (YAGNI)
2. Already in this codebase?
3. In the standard library?
4. A native platform feature?
5. An already-installed dependency?
6. Can it be one line?
7. Only then: write the minimum necessary.

**Marking deferrals**: add `// ponytail: <what was simplified> | ceiling: <limit> | upgrade: <trigger>` to track intentional shortcuts without losing them.
