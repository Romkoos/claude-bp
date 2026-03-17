import { describe, it, expect } from 'vitest';
import { applyDagreLayout } from './layout';
import type { Node, Edge } from '@xyflow/react';

function makeNode(id: string, overrides?: Partial<Node>): Node {
  return {
    id,
    type: 'skill',
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  };
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

describe('applyDagreLayout', () => {
  it('returns empty array for empty input', () => {
    expect(applyDagreLayout([], [])).toEqual([]);
  });

  it('assigns positions to nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b')];
    const result = applyDagreLayout(nodes, edges);
    expect(result).toHaveLength(2);
    expect(result[0].position).toBeDefined();
    expect(result[1].position).toBeDefined();
  });

  it('does not layout nodes with parentId', () => {
    const parent = makeNode('parent');
    const child = makeNode('child', { parentId: 'parent' });
    const result = applyDagreLayout([parent, child], []);
    const childResult = result.find((n) => n.id === 'child');
    expect(childResult!.position).toEqual({ x: 0, y: 0 });
  });

  it('does not layout comment nodes', () => {
    const comment = makeNode('c1', { type: 'comment' });
    const skill = makeNode('s1');
    const result = applyDagreLayout([comment, skill], []);
    const commentResult = result.find((n) => n.id === 'c1');
    // comment nodes are not in the dagre graph, so they get no position from dagre
    expect(commentResult).toBeDefined();
  });

  it('respects direction option', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('a', 'b')];
    const resultLR = applyDagreLayout(nodes, edges, {
      direction: 'LR',
      nodeSpacing: 80,
      rankSpacing: 200,
    });
    const resultTB = applyDagreLayout(nodes, edges, {
      direction: 'TB',
      nodeSpacing: 80,
      rankSpacing: 200,
    });
    // In LR, nodes should be spread horizontally; in TB, vertically
    const dxLR = Math.abs(resultLR[0].position.x - resultLR[1].position.x);
    const dyLR = Math.abs(resultLR[0].position.y - resultLR[1].position.y);
    const dxTB = Math.abs(resultTB[0].position.x - resultTB[1].position.x);
    const dyTB = Math.abs(resultTB[0].position.y - resultTB[1].position.y);
    expect(dxLR).toBeGreaterThan(dyLR);
    expect(dyTB).toBeGreaterThan(dxTB);
  });

  it('uses default options when none provided', () => {
    const nodes = [makeNode('a')];
    const result = applyDagreLayout(nodes, []);
    expect(result).toHaveLength(1);
    expect(result[0].position.x).toBeDefined();
    expect(result[0].position.y).toBeDefined();
  });

  it('skips edges where source or target has parentId', () => {
    const parent = makeNode('p');
    const child = makeNode('c', { parentId: 'p' });
    const other = makeNode('o');
    const result = applyDagreLayout(
      [parent, child, other],
      [makeEdge('c', 'o')]
    );
    expect(result).toHaveLength(3);
  });

  it('uses measured dimensions when available', () => {
    const nodeA = makeNode('a', {
      measured: { width: 400, height: 300 },
    } as Partial<Node>);
    const nodeB = makeNode('b');
    const result = applyDagreLayout([nodeA, nodeB], [makeEdge('a', 'b')]);
    expect(result).toHaveLength(2);
  });
});
