import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import { PLUGIN_MIN_WIDTH, PLUGIN_MIN_HEIGHT } from './pluginHelpers';

export interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSpacing: number;
  rankSpacing: number;
}

const PLUGIN_PADDING = 60;
const PLUGIN_HEADER_HEIGHT = 50;

/** Layout children inside a single plugin, returning updated child nodes */
function layoutPluginChildren(
  pluginId: string,
  children: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  if (children.length === 0) return children;

  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing / 2,
    ranksep: options.rankSpacing / 2,
    marginx: PLUGIN_PADDING,
    marginy: PLUGIN_HEADER_HEIGHT,
  });

  for (const child of children) {
    if (child.type === 'comment') continue;
    g.setNode(child.id, {
      width: (child.measured?.width ?? child.width ?? 300) as number,
      height: (child.measured?.height ?? child.height ?? 200) as number,
    });
  }

  // Only include edges between children of this plugin
  const childIds = new Set(children.map((c) => c.id));
  for (const edge of edges) {
    if (childIds.has(edge.source) && childIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  Dagre.layout(g);

  return children.map((child) => {
    const dagreNode = g.node(child.id);
    if (!dagreNode) return child;
    return {
      ...child,
      position: {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
    };
  });
}

/** Recalculate plugin style dimensions based on its children positions */
function calcPluginSize(plugin: Node, children: Node[]): { width: number; height: number } {
  if (children.length === 0) {
    return { width: PLUGIN_MIN_WIDTH, height: PLUGIN_MIN_HEIGHT };
  }

  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const child of children) {
    const w = (child.measured?.width ?? child.width ?? 300) as number;
    const h = (child.measured?.height ?? child.height ?? 200) as number;
    maxX = Math.max(maxX, child.position.x + w);
    maxY = Math.max(maxY, child.position.y + h);
  }

  return {
    width: Math.max(PLUGIN_MIN_WIDTH, maxX + PLUGIN_PADDING),
    height: Math.max(PLUGIN_MIN_HEIGHT, maxY + PLUGIN_HEADER_HEIGHT + PLUGIN_PADDING),
  };
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = { direction: 'LR', nodeSpacing: 80, rankSpacing: 200 }
): Node[] {
  // Phase 1: Layout children inside each plugin
  const plugins = nodes.filter((n) => n.type === 'plugin');
  let updatedNodes = [...nodes];

  for (const plugin of plugins) {
    const children = updatedNodes.filter((n) => n.parentId === plugin.id);
    if (children.length === 0) continue;

    const layoutedChildren = layoutPluginChildren(plugin.id, children, edges, options);

    // Replace children in updatedNodes
    const childMap = new Map(layoutedChildren.map((c) => [c.id, c]));
    updatedNodes = updatedNodes.map((n) => childMap.get(n.id) ?? n);

    // Recalc plugin size
    const size = calcPluginSize(plugin, layoutedChildren);
    updatedNodes = updatedNodes.map((n) =>
      n.id === plugin.id ? { ...n, style: { ...n.style, ...size } } : n
    );
  }

  // Phase 2: Layout top-level nodes (with updated plugin sizes)
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing,
    ranksep: options.rankSpacing,
    marginx: 50,
    marginy: 50,
  });

  updatedNodes.forEach((node) => {
    if (!node.parentId && node.type !== 'comment') {
      const w = node.type === 'plugin'
        ? ((node.style as Record<string, unknown>)?.width as number) ?? PLUGIN_MIN_WIDTH
        : (node.measured?.width ?? node.width ?? 300) as number;
      const h = node.type === 'plugin'
        ? ((node.style as Record<string, unknown>)?.height as number) ?? PLUGIN_MIN_HEIGHT
        : (node.measured?.height ?? node.height ?? 200) as number;
      g.setNode(node.id, { width: w, height: h });
    }
  });

  edges.forEach((edge) => {
    const sourceNode = updatedNodes.find((n) => n.id === edge.source);
    const targetNode = updatedNodes.find((n) => n.id === edge.target);
    if (sourceNode && targetNode && !sourceNode.parentId && !targetNode.parentId) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  return updatedNodes.map((node) => {
    if (node.parentId) return node;

    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
    };
  });
}
