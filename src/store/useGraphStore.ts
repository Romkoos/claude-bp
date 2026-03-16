import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type { BlueprintNodeType } from '../types/nodes';
import type { GraphSchema } from '../types/graph';
import { NODE_PIN_DEFINITIONS, createRulesData, createSkillData, createSubagentData, createHookData, createToolData, createMcpData, createPluginData } from '../constants/nodeDefaults';
import { generateId } from '../utils/idGenerator';
import { validateGraph, type ValidationResult } from '../validation/validate';
import { exportGraph, importGraph } from '../serialization/jsonExporter';
import { applyDagreLayout } from '../utils/layout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DATA_FACTORIES: Record<BlueprintNodeType, () => any> = {
  rules: createRulesData,
  skill: createSkillData,
  subagent: createSubagentData,
  hook: createHookData,
  tool: createToolData,
  mcp: createMcpData,
  plugin: createPluginData,
};

interface GraphStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  configName: string;
  validationResults: ValidationResult[];

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (type: BlueprintNodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  disconnectNode: (nodeId: string) => void;
  groupIntoPlugin: (nodeIds: string[]) => void;
  removeFromPlugin: (nodeId: string) => void;
  layouting: boolean;
  autoLayout: (direction?: 'TB' | 'LR' | 'BT' | 'RL') => void;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId: string | null) => void;
  runValidation: () => void;
  exportJSON: (viewport: { x: number; y: number; zoom: number }) => GraphSchema;
  importJSON: (schema: GraphSchema) => void;
  clearGraph: () => void;
}

export const useGraphStore = create<GraphStore>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      configName: 'Untitled Blueprint',
      validationResults: [],
      layouting: false,

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },

      addNode: (type, position) => {
        const factory = DATA_FACTORIES[type];
        if (!factory) return;

        const newNode: Node = {
          id: generateId(),
          type,
          position,
          data: factory(),
        };

        set({ nodes: [...get().nodes, newNode] });
      },

      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
        });
      },

      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        });
      },

      duplicateNode: (nodeId) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const newNode: Node = {
          ...node,
          id: generateId(),
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          data: { ...node.data },
          selected: false,
        };

        set({ nodes: [...get().nodes, newNode] });
      },

      disconnectNode: (nodeId) => {
        set({
          edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        });
      },

      groupIntoPlugin: (nodeIds) => {
        const { nodes } = get();
        const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id) && !n.parentId);
        if (selectedNodes.length === 0) return;

        const padding = 60;
        const headerHeight = 50;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of selectedNodes) {
          const w = (n.measured?.width ?? n.width ?? 300) as number;
          const h = (n.measured?.height ?? n.height ?? 200) as number;
          minX = Math.min(minX, n.position.x);
          minY = Math.min(minY, n.position.y);
          maxX = Math.max(maxX, n.position.x + w);
          maxY = Math.max(maxY, n.position.y + h);
        }

        const pluginId = generateId();
        const pluginX = minX - padding;
        const pluginY = minY - padding - headerHeight;

        const pluginNode: Node = {
          id: pluginId,
          type: 'plugin',
          position: { x: pluginX, y: pluginY },
          data: createPluginData() as unknown as Record<string, unknown>,
          style: {
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2 + headerHeight,
          },
        };

        const updatedNodes = nodes.map((n) => {
          if (nodeIds.includes(n.id) && !n.parentId) {
            return {
              ...n,
              parentId: pluginId,
              position: {
                x: n.position.x - pluginX,
                y: n.position.y - pluginY,
              },
            };
          }
          return n;
        });

        set({ nodes: [pluginNode, ...updatedNodes] });
      },

      removeFromPlugin: (nodeId) => {
        const { nodes } = get();
        const node = nodes.find((n) => n.id === nodeId);
        if (!node || !node.parentId) return;

        const parentNode = nodes.find((n) => n.id === node.parentId);
        if (!parentNode) return;

        set({
          nodes: nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  parentId: undefined,
                  position: {
                    x: n.position.x + parentNode.position.x,
                    y: n.position.y + parentNode.position.y,
                  },
                }
              : n
          ),
        });
      },

      autoLayout: (direction = 'LR') => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;
        const layoutedNodes = applyDagreLayout(nodes, edges, {
          direction,
          nodeSpacing: 80,
          rankSpacing: 200,
        });
        set({ nodes: layoutedNodes, layouting: true });
        setTimeout(() => set({ layouting: false }), 350);
      },

      onConnect: (connection) => {
        const { source, sourceHandle, target } = connection;
        if (!source || !sourceHandle || !target) return;

        const sourceNode = get().nodes.find((n) => n.id === source);
        if (!sourceNode) return;

        const sourceNodeType = sourceNode.type as BlueprintNodeType;
        const pinDefs = NODE_PIN_DEFINITIONS[sourceNodeType];
        if (!pinDefs) return;

        const sourcePin = pinDefs.find((p) => p.id === sourceHandle);
        if (!sourcePin) return;

        const newEdge: Edge = {
          id: generateId(),
          source: connection.source!,
          target: connection.target!,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'typed',
          data: { pinType: sourcePin.type },
        };

        set({ edges: [...get().edges, newEdge] });
      },

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      runValidation: () => {
        const { nodes, edges } = get();
        const results = validateGraph(nodes, edges);

        const nodeErrors = new Map<string, { errors: string[]; warnings: string[] }>();
        for (const node of nodes) {
          nodeErrors.set(node.id, { errors: [], warnings: [] });
        }
        for (const result of results) {
          const entry = nodeErrors.get(result.nodeId);
          if (entry) {
            if (result.level === 'error') entry.errors.push(result.message);
            else entry.warnings.push(result.message);
          }
        }

        set({
          validationResults: results,
          nodes: nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              validation: nodeErrors.get(node.id) || { errors: [], warnings: [] },
            },
          })),
        });
      },

      exportJSON: (viewport) => {
        const { nodes, edges, configName } = get();
        return exportGraph(nodes, edges, viewport, configName);
      },

      importJSON: (schema) => {
        const parsed = typeof schema === 'string' ? importGraph(schema as unknown as string) : schema;
        if (!parsed) return;

        set({
          nodes: parsed.nodes,
          edges: parsed.edges,
          configName: parsed.metadata?.name || 'Untitled Blueprint',
          selectedNodeId: null,
          validationResults: [],
        });
      },

      clearGraph: () => {
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          validationResults: [],
          configName: 'Untitled Blueprint',
        });
      },
    }),
    {
      // Only track nodes and edges for undo/redo, not UI state
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      limit: 50,
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
    }
  )
);
