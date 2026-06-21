export interface ModelingSession {
  activeHighlights: Set<string>;
}

export function createModelingSession(): ModelingSession {
  return { activeHighlights: new Set() };
}

export function toggleHighlight(session: ModelingSession, cellId: string): ModelingSession {
  const next = new Set(session.activeHighlights);
  if (next.has(cellId)) {
    next.delete(cellId);
  } else {
    next.add(cellId);
  }
  return { activeHighlights: next };
}

export function clearHighlights(_session: ModelingSession): ModelingSession {
  return { activeHighlights: new Set() };
}
