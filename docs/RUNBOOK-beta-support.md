# Beta Support Runbook

> Operational playbook for the Closed Beta cohort (10 families + 3 SLPs).
> Scope: the most likely support incidents for a privacy-first, offline-first,
> E2EE AAC PWA. Keep answers short and calm — caregivers are often stressed.

## Guiding principles

- **First tap always speaks** — never ask a caregiver to go online to use the board.
- **The child's board is irreplaceable.** Treat any "my board is gone" report as
  a Sev-1 until proven otherwise.
- **Never ask for a password, PIN, or recovery code over chat/email.**

## Incident: "Family lost / replaced / wiped their device"

This is the highest-impact scenario. What is recoverable depends on whether
cloud sync was on.

1. **Was sync enabled?** (Settings → Sync). Since B-11, sync is default-on with
   consent copy, so most beta users will have it.
   - **Yes:** sign in on the new device with the same account. Board content,
     profiles and settings re-download from Firestore.
   - **No:** board data lived only in that device's IndexedDB. Recoverable only
     from a local export file the family saved (Library → Backup). If none
     exists, the board is lost — escalate and log for the R-03 data-loss metric.
2. **Encrypted media / voice recordings (photos, voice clips):** these are
   E2EE. Until the D-02 key-continuity ADR (PR #28) is approved and shipped,
   media encrypted on the *old* device may **not** decrypt on a new device.
   - Set expectations honestly: text/symbol board recovers; encrypted media may
     not until key-continuity ships. Do **not** promise media recovery.
3. Confirm `navigator.storage.persist()` was granted on the new device (B-10 runs
   this at onboarding) to reduce future eviction risk.

## Incident: "An SLP/therapist can't open a shared child"

1. Confirm the invite was accepted (AcceptInvite screen, 32-hex code — D-01).
2. Confirm the member is **approved** (`approved` claim). Unapproved accounts are
   denied by rules even with a valid childAccess membership.
3. Confirm the grant has not expired (D-05 `expiresAt`). Check the access list
   ("who has access") panel on the child card.
4. If all true and it still fails, capture the console error and escalate — do
   not hand-edit Firestore rules or `childAccess` docs in prod.

## Incident: "I want to remove someone's access"

- Use the access list panel → Revoke (D-05, `revokeChildAccess` CF). Revocation
  is immediate at the rules layer. Confirm the row disappears from the list.

## Incident: "I forgot my password"

- Direct the caregiver to the "forgot password" link (D-04,
  `sendPasswordResetEmail`). Never reset it for them or ask for it.

## Escalation

- Sev-1 (possible permanent board/voice loss): notify the on-call engineer
  immediately and record device, sync state, and export availability.
- Anything requiring Firebase/GCP console (PITR restore, exports) is engineer-only
  — see tasks B-12/B-13. Restore drills are pre-rehearsed; do not improvise.
