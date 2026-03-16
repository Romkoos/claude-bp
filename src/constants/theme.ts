import type { BlueprintNodeType } from '../types/nodes';

export const NODE_COLORS: Record<BlueprintNodeType, { header: string; headerDark: string; glow: string }> = {
  rules:    { header: '#64748b', headerDark: '#475569', glow: '#64748b40' },
  skill:    { header: '#10b981', headerDark: '#059669', glow: '#10b98140' },
  subagent: { header: '#8b5cf6', headerDark: '#7c3aed', glow: '#8b5cf640' },
  hook:     { header: '#f59e0b', headerDark: '#d97706', glow: '#f59e0b40' },
};

export const CANVAS_BG = '#0d1117';
export const NODE_BG = '#1c2028';
export const NODE_BORDER = '#2d333b';
export const TEXT_PRIMARY = '#e6edf3';
export const TEXT_SECONDARY = '#8b949e';
export const TEXT_MUTED = '#484f58';
