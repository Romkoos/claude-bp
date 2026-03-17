import { describe, it, expect } from 'vitest';
import { TEMPLATES } from './templates';
import type { Template } from './templates';

describe('TEMPLATES', () => {
  it('has 4 templates', () => {
    expect(TEMPLATES).toHaveLength(4);
  });

  it('each template has required fields', () => {
    TEMPLATES.forEach((t: Template) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(['pipeline', 'research', 'safety', 'starter']).toContain(t.category);
      expect(t.graph.nodes).toBeDefined();
      expect(t.graph.edges).toBeDefined();
    });
  });

  it('template IDs are unique', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all template nodes have valid types', () => {
    const validTypes = ['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin', 'comment'];
    TEMPLATES.forEach((t) => {
      t.graph.nodes.forEach((n) => {
        expect(validTypes).toContain(n.type);
      });
    });
  });

  it('all template edges reference existing nodes', () => {
    TEMPLATES.forEach((t) => {
      const nodeIds = new Set(t.graph.nodes.map((n) => n.id));
      t.graph.edges.forEach((e) => {
        expect(nodeIds.has(e.source)).toBe(true);
        expect(nodeIds.has(e.target)).toBe(true);
      });
    });
  });

  it('all template node IDs are unique within each template', () => {
    TEMPLATES.forEach((t) => {
      const ids = t.graph.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('all template edge IDs are unique within each template', () => {
    TEMPLATES.forEach((t) => {
      const ids = t.graph.edges.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('pr-review template exists', () => {
    expect(TEMPLATES.find((t) => t.id === 'pr-review')).toBeDefined();
  });

  it('starter template has minimal setup', () => {
    const starter = TEMPLATES.find((t) => t.id === 'starter')!;
    expect(starter.graph.nodes).toHaveLength(2);
    expect(starter.graph.edges).toHaveLength(1);
  });
});
