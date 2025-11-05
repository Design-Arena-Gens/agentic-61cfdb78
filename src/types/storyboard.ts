export type VideoTone = 'inspirational' | 'educational' | 'playful' | 'direct';

export interface StoryBrief {
  idea: string;
  audience: string;
  tone: VideoTone;
  callToAction: string;
  length: 'short' | 'medium' | 'long';
}

export type BackgroundStyle =
  | { kind: 'gradient'; value: string }
  | { kind: 'image'; value: string }
  | { kind: 'color'; value: string };

export interface Scene {
  id: string;
  title: string;
  narration: string;
  supportingPoint: string;
  duration: number;
  background: BackgroundStyle;
  overlay: 'light' | 'dark';
  cta?: string;
}

export interface GeneratedVideo {
  url: string;
  fileName: string;
  file: File;
}
