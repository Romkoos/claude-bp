import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSpacing: number;
  rankSpacing: number;
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = { direction: 'LR', nodeSpacing: 80, rankSpacing: 200 }
): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing,
    ranksep: options.rankSpacing,
    marginx: 50,
    marginy: 50,
  });

  // Only layout top-level nodes (not plugin children)
  nodes.forEach((node) => {
    if (!node.parentId) {
      g.setNode(node.id, {
        width: (node.measured?.width ?? node.width ?? 300) as number,
        height: (node.measured?.height ?? node.height ?? 200) as number,
      });
    }
  });

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (sourceNode && targetNode && !sourceNode.parentId && !targetNode.parentId) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  return nodes.map((node) => {
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
