import type { BlueprintNodeType } from '../types/nodes';

export const NODE_COLORS: Record<BlueprintNodeType, { header: string; headerDark: string; glow: string }> = {
  rules:    { header: '#64748b', headerDark: '#475569', glow: '#64748b40' },
  skill:    { header: '#10b981', headerDark: '#059669', glow: '#10b98140' },
  subagent: { header: '#8b5cf6', headerDark: '#7c3aed', glow: '#8b5cf640' },
  hook:     { header: '#f59e0b', headerDark: '#d97706', glow: '#f59e0b40' },
  tool:     { header: '#f97316', headerDark: '#ea580c', glow: '#f9731640' },
  mcp:      { header: '#06b6d4', headerDark: '#0891b2', glow: '#06b6d440' },
  plugin:   { header: '#f43f5e', headerDark: '#e11d48', glow: '#f43f5e40' },
  comment:  { header: '#eab308', headerDark: '#422006', glow: '#eab30830' },
};

export const CANVAS_BG = '#0d1117';
export const NODE_BG = '#1c2028';
export const NODE_BORDER = '#2d333b';
export const TEXT_PRIMARY = '#e6edf3';
export const TEXT_SECONDARY = '#8b949e';
export const TEXT_MUTED = '#484f58';
