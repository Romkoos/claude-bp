import { describe, it, expect } from 'vitest';
import { NODE_DESCRIPTIONS } from './nodeDescriptions';

describe('NODE_DESCRIPTIONS', () => {
  const expectedTypes = ['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin'] as const;

  it('has descriptions for all non-comment types', () => {
    expectedTypes.forEach((type) => {
      expect(NODE_DESCRIPTIONS[type]).toBeDefined();
    });
  });

  it('each description has summary, properties, and connectors', () => {
    for (const [, desc] of Object.entries(NODE_DESCRIPTIONS)) {
      expect(desc.summary).toBeTruthy();
      expect(Array.isArray(desc.properties)).toBe(true);
      expect(desc.properties.length).toBeGreaterThan(0);
      expect(Array.isArray(desc.connectors)).toBe(true);
    }
  });

  it('each property has name and description', () => {
    for (const [, desc] of Object.entries(NODE_DESCRIPTIONS)) {
      desc.properties.forEach((p) => {
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
      });
    }
  });

  it('each connector has pinId and description', () => {
    for (const [, desc] of Object.entries(NODE_DESCRIPTIONS)) {
      desc.connectors.forEach((c) => {
        expect(c.pinId).toBeTruthy();
        expect(c.description).toBeTruthy();
      });
    }
  });
});
