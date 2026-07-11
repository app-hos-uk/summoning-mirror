export interface Fandom {
  id: string;
  displayName: string;
  accentColor: string;
  sortOrder: number;
  stripImage: string;
  enabled: boolean;
}

export type Screen = 'welcome' | 'camera' | 'result';

export type CaptureMode = 'solo' | 'group';

export type Lang = 'en' | 'es' | 'zh' | 'ja' | 'ko' | 'fr';

export interface AppState {
  screen: Screen;
  selectedFandom: Fandom | null;
  wishText: string;
  capturedPhoto: HTMLVideoElement | null;
  compositedBlob: Blob | null;
  lang: Lang;
  captureMode: CaptureMode;
}

export interface AnalyticsSnapshot {
  totalCards: number;
  totalShares: number;
  totalEmails: number;
  fandomCounts: Record<string, { name: string; count: number }>;
  hourly: { hour: string; count: number }[];
  topFandoms: { id: string; name: string; count: number }[];
}
