import { describe, it, expect } from 'vitest';
import { type Node } from '@xyflow/react';
import { findPluginAtPosition, PLUGIN_MIN_WIDTH, PLUGIN_MIN_HEIGHT } from './pluginHelpers';

function makePlugin(id: string, x: number, y: number, w?: number, h?: number): Node {
  return {
    id,
    type: 'plugin',
    position: { x, y },
    data: {},
    style: w != null && h != null ? { width: w, height: h } : undefined,
  } as Node;
}

function makeSkill(id: string, x: number, y: number): Node {
  return {
    id,
    type: 'skill',
    position: { x, y },
    data: {},
  } as Node;
}

describe('findPluginAtPosition', () => {
  it('returns plugin when position is inside its bounds', () => {
    const plugin = makePlugin('p1', 0, 0, 500, 400);
    const result = findPluginAtPosition([plugin], 100, 100, 'other');
    expect(result?.id).toBe('p1');
  });

  it('returns undefined when position is outside all plugins', () => {
    const plugin = makePlugin('p1', 0, 0, 500, 400);
    const result = findPluginAtPosition([plugin], 600, 600, 'other');
    expect(result).toBeUndefined();
  });

  it('excludes the dragged node from results', () => {
    const plugin = makePlugin('p1', 0, 0, 500, 400);
    const result = findPluginAtPosition([plugin], 100, 100, 'p1');
    expect(result).toBeUndefined();
  });

  it('ignores non-plugin nodes', () => {
    const skill = makeSkill('s1', 0, 0);
    const result = findPluginAtPosition([skill], 50, 50, 'other');
    expect(result).toBeUndefined();
  });

  it('uses default dimensions when style is not set', () => {
    const plugin = makePlugin('p1', 0, 0);
    // Should use PLUGIN_MIN_WIDTH (400) and PLUGIN_MIN_HEIGHT (200)
    expect(findPluginAtPosition([plugin], 200, 100, 'other')?.id).toBe('p1');
    expect(findPluginAtPosition([plugin], 500, 100, 'other')).toBeUndefined();
  });

  it('returns the last matching plugin (highest z-order) when plugins overlap', () => {
    const p1 = makePlugin('p1', 0, 0, 500, 500);
    const p2 = makePlugin('p2', 50, 50, 500, 500);
    // Point (100, 100) is inside both — should return p2 (later in array = visually on top)
    const result = findPluginAtPosition([p1, p2], 100, 100, 'other');
    expect(result?.id).toBe('p2');
  });

  it('handles edge case: position exactly on boundary', () => {
    const plugin = makePlugin('p1', 100, 100, 200, 200);
    // On the boundary should be included (<=)
    expect(findPluginAtPosition([plugin], 100, 100, 'other')?.id).toBe('p1');
    expect(findPluginAtPosition([plugin], 300, 300, 'other')?.id).toBe('p1');
    // Just outside
    expect(findPluginAtPosition([plugin], 99, 100, 'other')).toBeUndefined();
    expect(findPluginAtPosition([plugin], 301, 100, 'other')).toBeUndefined();
  });

  it('returns undefined for empty nodes array', () => {
    expect(findPluginAtPosition([], 100, 100, 'other')).toBeUndefined();
  });
});
