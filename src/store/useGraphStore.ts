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
import { NODE_PIN_DEFINITIONS, createRulesData, createSkillData, createSubagentData, createHookData } from '../constants/nodeDefaults';
import { generateId } from '../utils/idGenerator';
import { validateGraph, type ValidationResult } from '../validation/validate';
import { exportGraph, importGraph } from '../serialization/jsonExporter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DATA_FACTORIES: Record<BlueprintNodeType, () => any> = {
  rules: createRulesData,
  skill: createSkillData,
  subagent: createSubagentData,
  hook: createHookData,
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
    }
  )
);
