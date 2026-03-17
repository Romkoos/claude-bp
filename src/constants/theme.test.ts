import { describe, it, expect } from 'vitest';
import { NODE_COLORS, CANVAS_BG, NODE_BG, NODE_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from './theme';

describe('NODE_COLORS', () => {
  const nodeTypes = ['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin', 'comment'] as const;

  it('has colors for all node types', () => {
    nodeTypes.forEach((type) => {
      expect(NODE_COLORS[type]).toBeDefined();
    });
  });

  it('each entry has header, headerDark, and glow', () => {
    for (const [, colors] of Object.entries(NODE_COLORS)) {
      expect(colors.header).toBeTruthy();
      expect(colors.headerDark).toBeTruthy();
      expect(colors.glow).toBeTruthy();
    }
  });

  it('colors are valid hex values', () => {
    for (const [, colors] of Object.entries(NODE_COLORS)) {
      expect(colors.header).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors.headerDark).toMatch(/^#[0-9a-fA-F]{6}$/);
      // glow has alpha
      expect(colors.glow).toMatch(/^#[0-9a-fA-F]{6,8}$/);
    }
  });
});

describe('canvas constants', () => {
  it('CANVAS_BG is a hex color', () => {
    expect(CANVAS_BG).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('NODE_BG is a hex color', () => {
    expect(NODE_BG).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('NODE_BORDER is a hex color', () => {
    expect(NODE_BORDER).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('TEXT_PRIMARY is a hex color', () => {
    expect(TEXT_PRIMARY).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('TEXT_SECONDARY is a hex color', () => {
    expect(TEXT_SECONDARY).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('TEXT_MUTED is a hex color', () => {
    expect(TEXT_MUTED).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
