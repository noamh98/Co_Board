export interface UsageEvent {
  id: string;
  profileId: string;
  boardId: string;
  cellId: string;
  label: string;
  timestamp: number;
  sessionId: string;
}
