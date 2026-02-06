export interface Photo {
  id: string;
  url: string;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  scale: number;
  width?: number;
  height?: number;
  timestamp: number;
}

export interface Position {
  x: number;
  y: number;
}

export type BackgroundType = 'default' | 'color' | 'image';

export interface BackgroundSettings {
  type: BackgroundType;
  value: string;
}