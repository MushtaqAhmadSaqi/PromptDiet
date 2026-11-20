import { Easing } from 'remotion';

export const THEME = {
  colors: {
    bg: '#020617',
    surface: '#0f172a',
    border: '#1e293b',
    text: '#f8fafc',
    muted: '#94a3b8',
    hero: '#6366f1',
    accent: '#10b981',
    warning: '#f59e0b',
  },
  fonts: {
    display: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  springs: {
    snappy: { damping: 14, stiffness: 180, mass: 0.8 },
    smooth: { damping: 18, stiffness: 120, mass: 1.0 },
  },
  easings: {
    outCubic: Easing.out(Easing.cubic),
    inOutCubic: Easing.inOut(Easing.cubic),
  },
} as const;
