import type { Node, Edge, Viewport } from '@xyflow/react';

export interface GraphSchema {
  version: string;
  metadata: {
    name: string;
    description: string;
    created: string;
    modified: string;
  };
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}
