import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  BackgroundVariant,
  useReactFlow,
  type IsValidConnection,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import type { BlueprintNodeType } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { NODE_COLORS } from '../../constants/theme';
import { canConnect } from '../../utils/pinCompatibility';
import { useGraphStore } from '../../store/useGraphStore';
import { RulesNode } from '../Nodes/RulesNode';
import { SkillNode } from '../Nodes/SkillNode';
import { SubagentNode } from '../Nodes/SubagentNode';
import { HookNode } from '../Nodes/HookNode';
import { ToolNode } from '../Nodes/ToolNode';
import { McpNode } from '../Nodes/McpNode';
import { PluginNode } from '../Nodes/PluginNode';
import { TypedEdge } from '../Edges/TypedEdge';

// MUST be defined outside component to prevent infinite re-renders
const nodeTypes: NodeTypes = {
  rules: RulesNode,
  skill: SkillNode,
  subagent: SubagentNode,
  hook: HookNode,
  tool: ToolNode,
  mcp: McpNode,
  plugin: PluginNode,
};

const edgeTypes: EdgeTypes = {
  typed: TypedEdge,
};

const defaultEdgeOptions = {
  type: 'typed',
};

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

export function BlueprintCanvas() {
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnectHandler = useGraphStore((s) => s.onConnect);
  const addNode = useGraphStore((s) => s.addNode);
  const selectNode = useGraphStore((s) => s.selectNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const duplicateNode = useGraphStore((s) => s.duplicateNode);
  const disconnectNode = useGraphStore((s) => s.disconnectNode);
  const groupIntoPlugin = useGraphStore((s) => s.groupIntoPlugin);
  const removeFromPlugin = useGraphStore((s) => s.removeFromPlugin);
  const autoLayout = useGraphStore((s) => s.autoLayout);
  const layouting = useGraphStore((s) => s.layouting);

  const contextMenuNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;

  // Fit view after auto-layout animation
  useEffect(() => {
    if (layouting) {
      const timer = setTimeout(() => fitView({ padding: 0.2 }), 350);
      return () => clearTimeout(timer);
    }
  }, [layouting, fitView]);

  // Close context menu + undo/redo keyboard shortcuts
  useEffect(() => {
    const handleClick = () => { setContextMenu(null); setCanvasMenu(null); };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setContextMenu(null); setCanvasMenu(null); }

      // Undo/Redo: skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useGraphStore.temporal.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useGraphStore.temporal.getState().redo();
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/blueprint-node') as BlueprintNodeType;
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(nodeType, position);
    },
    [addNode, screenToFlowPosition]
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const { source, sourceHandle, target, targetHandle } = connection;
      if (!source || !sourceHandle || !target || !targetHandle) return false;
      if (source === target) return false;

      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return false;

      const sourcePins = NODE_PIN_DEFINITIONS[sourceNode.type as BlueprintNodeType];
      const targetPins = NODE_PIN_DEFINITIONS[targetNode.type as BlueprintNodeType];
      if (!sourcePins || !targetPins) return false;

      const sourcePin = sourcePins.find((p) => p.id === sourceHandle);
      const targetPin = targetPins.find((p) => p.id === targetHandle);
      if (!sourcePin || !targetPin) return false;

      return canConnect(sourcePin, targetPin);
    },
    [nodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
  }, [selectNode]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setCanvasMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const minimapNodeColor = (node: { type?: string }) => {
    const colors = NODE_COLORS[node.type as BlueprintNodeType];
    return colors?.header || '#2d333b';
  };

  return (
    <div ref={reactFlowRef} className={`flex-1 relative${layouting ? ' layouting' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectHandler}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={isValidConnection}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        colorMode="dark"
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
      >
        <Background variant={BackgroundVariant.Dots} color="#2d333b" gap={20} />
        <MiniMap
          nodeColor={minimapNodeColor}
          style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: 8 }}
          maskColor="#0d111780"
        />
        <Controls />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            onClick={() => { duplicateNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            Duplicate
          </div>
          <div
            className="context-menu-item"
            onClick={() => { disconnectNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            Disconnect all
          </div>
          <div style={{ height: 1, background: 'var(--node-border)', margin: '4px 0' }} />
          {!contextMenuNode?.parentId && (
            <div
              className="context-menu-item"
              onClick={() => {
                const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
                const idsToGroup = selectedIds.length > 1 ? selectedIds : [contextMenu.nodeId];
                groupIntoPlugin(idsToGroup);
                setContextMenu(null);
              }}
            >
              Group into Plugin
            </div>
          )}
          {contextMenuNode?.parentId && (
            <div
              className="context-menu-item"
              onClick={() => { removeFromPlugin(contextMenu.nodeId); setContextMenu(null); }}
            >
              Remove from Plugin
            </div>
          )}
          <div
            className="context-menu-item danger"
            onClick={() => { deleteNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            Delete
          </div>
        </div>
      )}

      {/* Canvas Context Menu */}
      {canvasMenu && (
        <div
          className="context-menu"
          style={{ left: canvasMenu.x, top: canvasMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin'] as BlueprintNodeType[]).map((type) => (
            <div
              key={type}
              className="context-menu-item"
              onClick={() => {
                const position = screenToFlowPosition({ x: canvasMenu.x, y: canvasMenu.y });
                addNode(type, position);
                setCanvasMenu(null);
              }}
            >
              Add {type === 'mcp' ? 'MCP Server' : type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--node-border)', margin: '4px 0' }} />
          <div
            className="context-menu-item"
            onClick={() => { autoLayout('LR'); setCanvasMenu(null); }}
          >
            Auto-layout
          </div>
        </div>
      )}
    </div>
  );
}
