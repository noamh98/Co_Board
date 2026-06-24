# ADR-0003 — TTS Provider: Google Neural2 (with Almagu as future target)

**Date:** 2026-06-21  
**Status:** Accepted  
**Deciders:** Project lead

## Context

The app requires Hebrew TTS with high naturalness for AAC use (children with communication difficulties). The browser's built-in `SpeechSynthesis` API provides inconsistent Hebrew voice quality across devices and is unavailable offline without pre-loading.

## Decision

Implement a **hybrid TTS architecture**:

1. **Cache layer** (IndexedDB `audioCache` store) — fastest, fully offline
2. **Google Cloud TTS Neural2** (`he-IL-Neural2-A/C`, `he-IL-Wavenet-A/B`) — high-quality Hebrew, requires API key + network
3. **Browser fallback** (`SpeechSynthesis`) — always available, no key required, lower quality

Priority: cache → online provider → browser fallback. The fallback **always** fires gracefully — TTS never crashes silently.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Browser SpeechSynthesis only | Zero cost, offline | Inconsistent Hebrew quality, device-dependent |
| **Google Neural2 (chosen)** | Excellent Hebrew, cacheable | Requires API key, network for first play |
| Almagu (preferred in PRD §4.3) | Native Israeli Hebrew, AAC-optimized | API not publicly available at time of implementation |
| ElevenLabs | High quality | No Hebrew Neural2 equivalent, cost |

## Almagu (Future Target)

PRD §4.3 lists Almagu as the preferred TTS vendor for production. The `TTSProvider` interface (`services/tts/ttsProvider.ts`) is designed to be backend-agnostic — swapping to Almagu requires only implementing a new `AlmaguTtsProvider` class, with zero changes to `hybridTtsService.ts` or higher layers.

## Consequences

- API key stored via `settingsRepo.getTtsApiKey()` — never hardcoded, never in version control
- Key sent in `x-goog-api-key` header (not URL) to prevent DevTools exposure
- Cache prunes to 500 entries max (`pruneAudioCache`)
- Offline invariant preserved: browser fallback always available regardless of network/key state
