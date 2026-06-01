export type Theme = 'dark' | 'light'

export interface ThemeColors {
  bg: string
  containerBg: string
  text: string
  textMuted: string
  grid: string
  border: string
  crosshair: string
  panelBg: string
  panelBorder: string
  up: string
  down: string
}

export const DARK: ThemeColors = {
  bg: '#0a0a0a',
  containerBg: '#000000',
  text: '#e0e0e0',
  textMuted: '#999999',
  grid: '#1a1a1a',
  border: '#1a1a1a',
  crosshair: '#555555',
  panelBg: 'rgba(0,0,0,0.9)',
  panelBorder: 'rgba(255,255,255,0.05)',
  up: '#26a69a',
  down: '#ef5350',
}

export const LIGHT: ThemeColors = {
  bg: '#f5f5f5',
  containerBg: '#ffffff',
  text: '#222222',
  textMuted: '#555555',
  grid: '#e0e0e0',
  border: '#e0e0e0',
  crosshair: '#aaaaaa',
  panelBg: 'rgba(255,255,255,0.95)',
  panelBorder: 'rgba(0,0,0,0.08)',
  up: '#26a69a',
  down: '#ef5350',
}
