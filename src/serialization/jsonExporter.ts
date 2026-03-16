import type { Node, Edge, Viewport } from '@xyflow/react';
import type { GraphSchema } from '../types/graph';

export function exportGraph(
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport,
  configName: string = 'Untitled Blueprint'
): GraphSchema {
  return {
    version: '1.0.0',
    metadata: {
      name: configName,
      description: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    nodes,
    edges,
    viewport,
  };
}

export function downloadJSON(graph: GraphSchema) {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${graph.metadata.name.replace(/\s+/g, '-').toLowerCase()}.blueprint.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importGraph(json: string): GraphSchema | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version && parsed.nodes && parsed.edges) {
      return parsed as GraphSchema;
    }
    return null;
  } catch {
    return null;
  }
}
