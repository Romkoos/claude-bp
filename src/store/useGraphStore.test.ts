import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGraphStore } from './useGraphStore';
import { createSkillData, createRulesData } from '../constants/nodeDefaults';

function resetStore() {
  useGraphStore.getState().clearGraph();
  useGraphStore.setState({ layouting: false });
}

describe('useGraphStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // --- Initial state ---

  it('has empty initial state', () => {
    const state = useGraphStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.configName).toBe('Untitled Blueprint');
    expect(state.validationResults).toEqual([]);
    expect(state.simulationActive).toBe(false);
  });

  // --- addNode ---

  it('adds a node', () => {
    useGraphStore.getState().addNode('skill', { x: 100, y: 200 });
    const nodes = useGraphStore.getState().nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('skill');
    expect(nodes[0].position).toEqual({ x: 100, y: 200 });
  });

  it('adds nodes of all types', () => {
    const types = ['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin', 'comment'] as const;
    types.forEach((type, i) => {
      useGraphStore.getState().addNode(type, { x: i * 100, y: 0 });
    });
    expect(useGraphStore.getState().nodes).toHaveLength(8);
  });

  // --- updateNodeData ---

  it('updates node data', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().updateNodeData(nodeId, { label: 'Updated' });
    const node = useGraphStore.getState().nodes.find((n) => n.id === nodeId);
    expect(node!.data.label).toBe('Updated');
  });

  it('does not affect other nodes when updating', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    useGraphStore.getState().addNode('rules', { x: 100, y: 0 });
    const [skill, rules] = useGraphStore.getState().nodes;
    useGraphStore.getState().updateNodeData(skill.id, { label: 'Changed' });
    const rulesAfter = useGraphStore.getState().nodes.find((n) => n.id === rules.id);
    expect(rulesAfter!.data.label).toBe('CLAUDE.md');
  });

  // --- deleteNode ---

  it('deletes a node', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().deleteNode(nodeId);
    expect(useGraphStore.getState().nodes).toHaveLength(0);
  });

  it('removes connected edges when deleting a node', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    useGraphStore.getState().addNode('skill', { x: 200, y: 0 });
    const [rules, skill] = useGraphStore.getState().nodes;
    useGraphStore.getState().onConnect({
      source: rules.id,
      sourceHandle: 'out_context',
      target: skill.id,
      targetHandle: 'in_context',
    });
    expect(useGraphStore.getState().edges).toHaveLength(1);
    useGraphStore.getState().deleteNode(rules.id);
    expect(useGraphStore.getState().edges).toHaveLength(0);
  });

  it('clears selection when deleting selected node', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    expect(useGraphStore.getState().selectedNodeId).toBe(nodeId);
    useGraphStore.getState().deleteNode(nodeId);
    expect(useGraphStore.getState().selectedNodeId).toBeNull();
  });

  // --- duplicateNode ---

  it('duplicates a node', () => {
    useGraphStore.getState().addNode('skill', { x: 100, y: 200 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().duplicateNode(nodeId);
    const nodes = useGraphStore.getState().nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes[1].type).toBe('skill');
    expect(nodes[1].position.x).toBe(140);
    expect(nodes[1].position.y).toBe(240);
    expect(nodes[1].id).not.toBe(nodeId);
  });

  it('does nothing when duplicating non-existent node', () => {
    useGraphStore.getState().duplicateNode('non-existent');
    expect(useGraphStore.getState().nodes).toHaveLength(0);
  });

  // --- disconnectNode ---

  it('disconnects a node', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    useGraphStore.getState().addNode('skill', { x: 200, y: 0 });
    const [rules, skill] = useGraphStore.getState().nodes;
    useGraphStore.getState().onConnect({
      source: rules.id,
      sourceHandle: 'out_context',
      target: skill.id,
      targetHandle: 'in_context',
    });
    useGraphStore.getState().disconnectNode(rules.id);
    expect(useGraphStore.getState().edges).toHaveLength(0);
    expect(useGraphStore.getState().nodes).toHaveLength(2);
  });

  // --- selectNode ---

  it('selects a node', () => {
    useGraphStore.getState().selectNode('test-id');
    expect(useGraphStore.getState().selectedNodeId).toBe('test-id');
  });

  it('deselects a node', () => {
    useGraphStore.getState().selectNode('test-id');
    useGraphStore.getState().selectNode(null);
    expect(useGraphStore.getState().selectedNodeId).toBeNull();
  });

  // --- onConnect ---

  it('creates a typed edge on connect', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    useGraphStore.getState().addNode('skill', { x: 200, y: 0 });
    const [rules, skill] = useGraphStore.getState().nodes;
    useGraphStore.getState().onConnect({
      source: rules.id,
      sourceHandle: 'out_context',
      target: skill.id,
      targetHandle: 'in_context',
    });
    const edges = useGraphStore.getState().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe('typed');
    expect(edges[0].data?.pinType).toBe('context');
  });

  it('ignores connect without source', () => {
    useGraphStore.getState().onConnect({
      source: null as unknown as string,
      sourceHandle: 'out_context',
      target: 'target',
      targetHandle: 'in_context',
    });
    expect(useGraphStore.getState().edges).toHaveLength(0);
  });

  it('ignores connect without sourceHandle', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().onConnect({
      source: nodeId,
      sourceHandle: null,
      target: 'target',
      targetHandle: 'in_context',
    });
    expect(useGraphStore.getState().edges).toHaveLength(0);
  });

  // --- runValidation ---

  it('runs validation and updates state', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    useGraphStore.getState().runValidation();
    const state = useGraphStore.getState();
    expect(state.validationResults.length).toBeGreaterThan(0);
    // Nodes should have validation data
    expect(state.nodes[0].data.validation).toBeDefined();
  });

  // --- exportJSON ---

  it('exports graph as JSON', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    const result = useGraphStore.getState().exportJSON({ x: 0, y: 0, zoom: 1 });
    expect(result.version).toBe('1.0.0');
    expect(result.nodes).toHaveLength(1);
    expect(result.metadata.name).toBe('Untitled Blueprint');
  });

  // --- importJSON ---

  it('imports graph from schema', () => {
    const schema = {
      version: '1.0.0',
      metadata: { name: 'Imported', description: '', created: '', modified: '' },
      nodes: [
        { id: 'n1', type: 'rules', position: { x: 0, y: 0 }, data: createRulesData() },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    useGraphStore.getState().importJSON(schema);
    expect(useGraphStore.getState().nodes).toHaveLength(1);
    expect(useGraphStore.getState().configName).toBe('Imported');
  });

  // --- clearGraph ---

  it('clears the graph', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    useGraphStore.getState().selectNode('test');
    useGraphStore.getState().clearGraph();
    const state = useGraphStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.configName).toBe('Untitled Blueprint');
  });

  // --- UI overlay setters ---

  it('toggles searchOpen', () => {
    useGraphStore.getState().setSearchOpen(true);
    expect(useGraphStore.getState().searchOpen).toBe(true);
    useGraphStore.getState().setSearchOpen(false);
    expect(useGraphStore.getState().searchOpen).toBe(false);
  });

  it('toggles shortcutsOpen', () => {
    useGraphStore.getState().setShortcutsOpen(true);
    expect(useGraphStore.getState().shortcutsOpen).toBe(true);
  });

  it('toggles exportPreviewOpen', () => {
    useGraphStore.getState().setExportPreviewOpen(true);
    expect(useGraphStore.getState().exportPreviewOpen).toBe(true);
  });

  it('toggles settingsOpen', () => {
    useGraphStore.getState().setSettingsOpen(true);
    expect(useGraphStore.getState().settingsOpen).toBe(true);
  });

  it('toggles showMinimap', () => {
    useGraphStore.getState().setShowMinimap(false);
    expect(useGraphStore.getState().showMinimap).toBe(false);
    useGraphStore.getState().setShowMinimap(true);
    expect(useGraphStore.getState().showMinimap).toBe(true);
  });

  it('toggles paletteCollapsed', () => {
    expect(useGraphStore.getState().paletteCollapsed).toBe(false);
    useGraphStore.getState().setPaletteCollapsed(true);
    expect(useGraphStore.getState().paletteCollapsed).toBe(true);
    useGraphStore.getState().setPaletteCollapsed(false);
    expect(useGraphStore.getState().paletteCollapsed).toBe(false);
  });

  // --- groupIntoPlugin ---

  it('groups nodes into a plugin', () => {
    useGraphStore.getState().addNode('skill', { x: 100, y: 100 });
    useGraphStore.getState().addNode('hook', { x: 300, y: 100 });
    const nodeIds = useGraphStore.getState().nodes.map((n) => n.id);
    useGraphStore.getState().groupIntoPlugin(nodeIds);
    const nodes = useGraphStore.getState().nodes;
    const plugin = nodes.find((n) => n.type === 'plugin');
    expect(plugin).toBeDefined();
    const children = nodes.filter((n) => n.parentId === plugin!.id);
    expect(children).toHaveLength(2);
  });

  it('does nothing when grouping empty selection', () => {
    useGraphStore.getState().groupIntoPlugin([]);
    expect(useGraphStore.getState().nodes).toHaveLength(0);
  });

  it('does not group nodes that already have parents', () => {
    useGraphStore.getState().addNode('skill', { x: 100, y: 100 });
    useGraphStore.getState().addNode('hook', { x: 300, y: 100 });
    const nodeIds = useGraphStore.getState().nodes.map((n) => n.id);
    useGraphStore.getState().groupIntoPlugin(nodeIds);
    // Try to group the children again
    const childIds = useGraphStore.getState().nodes.filter((n) => n.parentId).map((n) => n.id);
    const countBefore = useGraphStore.getState().nodes.length;
    useGraphStore.getState().groupIntoPlugin(childIds);
    // Should not create another plugin since all selected nodes have parents
    expect(useGraphStore.getState().nodes.length).toBe(countBefore);
  });

  // --- removeFromPlugin ---

  it('removes a node from a plugin', () => {
    useGraphStore.getState().addNode('skill', { x: 100, y: 100 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().groupIntoPlugin([nodeId]);
    const child = useGraphStore.getState().nodes.find((n) => n.parentId);
    expect(child).toBeDefined();
    useGraphStore.getState().removeFromPlugin(child!.id);
    const afterRemove = useGraphStore.getState().nodes.find((n) => n.id === child!.id);
    expect(afterRemove!.parentId).toBeUndefined();
  });

  it('does nothing when removing node without parent', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().removeFromPlugin(nodeId);
    expect(useGraphStore.getState().nodes[0].parentId).toBeUndefined();
  });

  // --- autoLayout ---

  it('runs auto layout', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    useGraphStore.getState().autoLayout('LR');
    expect(useGraphStore.getState().layouting).toBe(true);
  });

  it('does nothing on empty graph', () => {
    useGraphStore.getState().autoLayout();
    expect(useGraphStore.getState().layouting).toBe(false);
  });

  // --- setNodes / setEdges ---

  it('sets nodes directly', () => {
    const nodes = [{ id: 'test', type: 'skill', position: { x: 0, y: 0 }, data: createSkillData() }];
    useGraphStore.getState().setNodes(nodes);
    expect(useGraphStore.getState().nodes).toHaveLength(1);
  });

  it('sets edges directly', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    useGraphStore.getState().setEdges(edges);
    expect(useGraphStore.getState().edges).toHaveLength(1);
  });

  // --- stopSimulation ---

  it('stops simulation', () => {
    useGraphStore.setState({ simulationActive: true, simulationHighlightedNodeId: 'x', simulationHighlightedEdgeIds: ['e1'] });
    useGraphStore.getState().stopSimulation();
    const state = useGraphStore.getState();
    expect(state.simulationActive).toBe(false);
    expect(state.simulationHighlightedNodeId).toBeNull();
    expect(state.simulationHighlightedEdgeIds).toEqual([]);
  });
});
