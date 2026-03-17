import { vi } from 'vitest';

// Mock @xyflow/react for component tests
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: ({ children, ...props }: Record<string, unknown>) => {
      const React = require('react');
      return React.createElement('div', { 'data-testid': `handle-${props.id}`, ...props }, children);
    },
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    useReactFlow: () => ({
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      fitView: vi.fn(),
      setViewport: vi.fn(),
      getNodes: () => [],
      getEdges: () => [],
      screenToFlowPosition: (pos: { x: number; y: number }) => pos,
    }),
    useNodeId: () => 'mock-node-id',
    useHandleConnections: () => [],
    useNodesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => {
      const React = require('react');
      return React.createElement(React.Fragment, null, children);
    },
    ReactFlow: ({ children }: { children: React.ReactNode }) => {
      const React = require('react');
      return React.createElement('div', { 'data-testid': 'reactflow' }, children);
    },
    BaseEdge: (props: Record<string, unknown>) => {
      const React = require('react');
      return React.createElement('path', { d: props.path });
    },
    getBezierPath: () => ['M0,0', 0, 0],
    applyNodeChanges: (_changes: unknown[], nodes: unknown[]) => nodes,
    applyEdgeChanges: (_changes: unknown[], edges: unknown[]) => edges,
  };
});
