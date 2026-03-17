import { describe, it, expect } from 'vitest';
import { exportGraph, importGraph } from './jsonExporter';
import type { Node, Edge, Viewport } from '@xyflow/react';

const sampleNodes: Node[] = [
  { id: 'n1', type: 'rules', position: { x: 0, y: 0 }, data: { label: 'Rules' } },
];
const sampleEdges: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2' },
];
const sampleViewport: Viewport = { x: 0, y: 0, zoom: 1 };

describe('exportGraph', () => {
  it('creates a valid GraphSchema', () => {
    const result = exportGraph(sampleNodes, sampleEdges, sampleViewport);
    expect(result.version).toBe('1.0.0');
    expect(result.nodes).toBe(sampleNodes);
    expect(result.edges).toBe(sampleEdges);
    expect(result.viewport).toBe(sampleViewport);
    expect(result.metadata.name).toBe('Untitled Blueprint');
  });

  it('uses provided config name', () => {
    const result = exportGraph(sampleNodes, sampleEdges, sampleViewport, 'My Config');
    expect(result.metadata.name).toBe('My Config');
  });

  it('sets created and modified timestamps', () => {
    const result = exportGraph(sampleNodes, sampleEdges, sampleViewport);
    expect(result.metadata.created).toBeTruthy();
    expect(result.metadata.modified).toBeTruthy();
    // Both should be valid ISO dates
    expect(new Date(result.metadata.created).toISOString()).toBe(result.metadata.created);
  });

  it('sets empty description', () => {
    const result = exportGraph(sampleNodes, sampleEdges, sampleViewport);
    expect(result.metadata.description).toBe('');
  });
});

describe('importGraph', () => {
  it('parses valid JSON', () => {
    const schema = exportGraph(sampleNodes, sampleEdges, sampleViewport);
    const json = JSON.stringify(schema);
    const result = importGraph(json);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.0.0');
    expect(result!.nodes).toHaveLength(1);
    expect(result!.edges).toHaveLength(1);
  });

  it('returns null for invalid JSON', () => {
    expect(importGraph('not json')).toBeNull();
  });

  it('returns null for JSON without required fields', () => {
    expect(importGraph(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });

  it('returns null for JSON with version but missing nodes', () => {
    expect(importGraph(JSON.stringify({ version: '1.0.0', edges: [] }))).toBeNull();
  });

  it('returns null for JSON with version but missing edges', () => {
    expect(importGraph(JSON.stringify({ version: '1.0.0', nodes: [] }))).toBeNull();
  });

  it('accepts minimal valid schema', () => {
    const json = JSON.stringify({ version: '1.0.0', nodes: [], edges: [] });
    const result = importGraph(json);
    expect(result).not.toBeNull();
    expect(result!.nodes).toEqual([]);
  });
});
