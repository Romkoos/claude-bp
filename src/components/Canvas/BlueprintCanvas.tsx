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
  type OnConnectStart,
  type Connection,
} from '@xyflow/react';
import type { BlueprintNodeType } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { NODE_COLORS } from '../../constants/theme';
import { canConnect, getCompatibleNodeTypes } from '../../utils/pinCompatibility';
import { useGraphStore } from '../../store/useGraphStore';
import { RulesNode } from '../Nodes/RulesNode';
import { SkillNode } from '../Nodes/SkillNode';
import { SubagentNode } from '../Nodes/SubagentNode';
import { HookNode } from '../Nodes/HookNode';
import { ToolNode } from '../Nodes/ToolNode';
import { McpNode } from '../Nodes/McpNode';
import { PluginNode } from '../Nodes/PluginNode';
import { CommentNode } from '../Nodes/CommentNode';
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
  comment: CommentNode,
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
  const [quickConnectMenu, setQuickConnectMenu] = useState<{
    x: number;
    y: number;
    sourceNodeId: string;
    sourceHandleId: string;
    items: { nodeType: BlueprintNodeType; pinId: string }[];
    draggedFromSource: boolean;
  } | null>(null);

  const connectStartRef = useRef<{
    nodeId: string;
    handleId: string;
    handleType: 'source' | 'target';
  } | null>(null);

  // Timestamp when quick-connect menu was opened; used to suppress the
  // click event that fires immediately after mouseup on the canvas.
  const quickConnectOpenedAt = useRef<number>(0);

  const { screenToFlowPosition, fitView, setCenter, getZoom } = useReactFlow();

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
  const showMinimap = useGraphStore((s) => s.showMinimap);

  const contextMenuNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;

  // Fit view after auto-layout animation
  useEffect(() => {
    if (layouting) {
      const timer = setTimeout(() => fitView({ padding: 0.2 }), 350);
      return () => clearTimeout(timer);
    }
  }, [layouting, fitView]);

  // Close context menu + keyboard shortcuts
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setCanvasMenu(null);
      // Don't close quick-connect menu if it was just opened (mouseup → click race)
      if (Date.now() - quickConnectOpenedAt.current > 200) {
        setQuickConnectMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setCanvasMenu(null);
        setQuickConnectMenu(null);
        selectNode(null);
        useGraphStore.getState().setSearchOpen(false);
        useGraphStore.getState().setExportPreviewOpen(false);
        useGraphStore.getState().setShortcutsOpen(false);
        useGraphStore.getState().setSettingsOpen(false);
      }

      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) {
        return;
      }

      const meta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const shift = e.shiftKey;

      // Undo / Redo
      if (meta && key === 'z' && !shift) {
        e.preventDefault();
        useGraphStore.temporal.getState().undo();
      }
      if (meta && (key === 'y' || (key === 'z' && shift))) {
        e.preventDefault();
        useGraphStore.temporal.getState().redo();
      }

      // Search
      if (meta && key === 'k') { e.preventDefault(); useGraphStore.getState().setSearchOpen(true); }
      // Export preview
      if (meta && key === 'e') { e.preventDefault(); useGraphStore.getState().setExportPreviewOpen(true); }
      // Duplicate selected
      if (meta && key === 'd') {
        e.preventDefault();
        const sel = useGraphStore.getState().selectedNodeId;
        if (sel) useGraphStore.getState().duplicateNode(sel);
      }
      // Select all nodes
      if (meta && key === 'a') {
        e.preventDefault();
        const st = useGraphStore.getState();
        const allSelected = st.nodes.map((n) => ({ ...n, selected: true }));
        useGraphStore.setState({ nodes: allSelected });
      }
      // Fit view
      if (key === 'f' && !meta) { e.preventDefault(); fitView({ padding: 0.2 }); }
      // Shortcuts overlay
      if (key === '?' || (shift && key === '/')) { useGraphStore.getState().setShortcutsOpen(true); }
      // Search via /
      if (key === '/' && !shift && !meta) { e.preventDefault(); useGraphStore.getState().setSearchOpen(true); }
      // Settings
      if (meta && key === ',') { e.preventDefault(); useGraphStore.getState().setSettingsOpen(!useGraphStore.getState().settingsOpen); }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fitView, selectNode]);

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
    (event: React.MouseEvent, node: { id: string }) => {
      const target = event.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
        return;
      }
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

  const onConnectStartHandler: OnConnectStart = useCallback((_event, params) => {
    connectStartRef.current = {
      nodeId: params.nodeId ?? '',
      handleId: params.handleId ?? '',
      handleType: params.handleType ?? 'source',
    };
  }, []);

  const onConnectEndHandler = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const startInfo = connectStartRef.current;
      connectStartRef.current = null;
      if (!startInfo) return;

      // If dropped on a handle or node, the connection succeeded — do nothing
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__handle') || target.closest('.react-flow__node')) {
        return;
      }

      // Find the dragged pin definition
      const sourceNode = nodes.find((n) => n.id === startInfo.nodeId);
      if (!sourceNode) return;

      const pins = NODE_PIN_DEFINITIONS[sourceNode.type as BlueprintNodeType];
      if (!pins) return;

      const draggedPin = pins.find((p) => p.id === startInfo.handleId);
      if (!draggedPin) return;

      // Get compatible node types
      const items = getCompatibleNodeTypes(draggedPin.type, draggedPin.direction);
      if (items.length === 0) return;

      // Get mouse/touch position
      const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
      const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;

      quickConnectOpenedAt.current = Date.now();
      setQuickConnectMenu({
        x: clientX,
        y: clientY,
        sourceNodeId: startInfo.nodeId,
        sourceHandleId: startInfo.handleId,
        items,
        draggedFromSource: startInfo.handleType === 'source',
      });
    },
    [nodes]
  );

  const onQuickConnectSelect = useCallback(
    (nodeType: BlueprintNodeType, pinId: string) => {
      if (!quickConnectMenu) return;

      const position = screenToFlowPosition({
        x: quickConnectMenu.x,
        y: quickConnectMenu.y,
      });

      addNode(nodeType, position);

      const newNodes = useGraphStore.getState().nodes;
      const newNode = newNodes[newNodes.length - 1];
      if (!newNode) { setQuickConnectMenu(null); return; }

      let connection: Connection;
      if (quickConnectMenu.draggedFromSource) {
        connection = {
          source: quickConnectMenu.sourceNodeId,
          sourceHandle: quickConnectMenu.sourceHandleId,
          target: newNode.id,
          targetHandle: pinId,
        };
      } else {
        connection = {
          source: newNode.id,
          sourceHandle: pinId,
          target: quickConnectMenu.sourceNodeId,
          targetHandle: quickConnectMenu.sourceHandleId,
        };
      }

      onConnectHandler(connection);
      setQuickConnectMenu(null);
    },
    [quickConnectMenu, screenToFlowPosition, addNode, onConnectHandler]
  );

  const minimapNodeColor = (node: { type?: string }) => {
    const colors = NODE_COLORS[node.type as BlueprintNodeType];
    return colors?.header || '#2d333b';
  };

  return (
    <div ref={reactFlowRef} data-testid="blueprint-canvas" className={`flex-1 relative${layouting ? ' layouting' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectHandler}
        onConnectStart={onConnectStartHandler}
        onConnectEnd={onConnectEndHandler}
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
        {showMinimap && (
          <MiniMap
            nodeColor={minimapNodeColor}
            style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: 8 }}
            maskColor="#0d111780"
            onNodeClick={(_event, node) => {
              const n = nodes.find((nd) => nd.id === node.id);
              if (n) {
                const x = n.position.x + (n.measured?.width ?? 300) / 2;
                const y = n.position.y + (n.measured?.height ?? 200) / 2;
                setCenter(x, y, { zoom: getZoom(), duration: 300 });
                selectNode(n.id);
              }
            }}
          />
        )}
        <Controls />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <div
          data-testid="context-menu"
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            data-testid="ctx-duplicate-node"
            className="context-menu-item"
            onClick={() => { duplicateNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            Duplicate
          </div>
          <div
            data-testid="ctx-disconnect-all"
            className="context-menu-item"
            onClick={() => { disconnectNode(contextMenu.nodeId); setContextMenu(null); }}
          >
            Disconnect all
          </div>
          <div style={{ height: 1, background: 'var(--node-border)', margin: '4px 0' }} />
          {!contextMenuNode?.parentId && (
            <div
              data-testid="ctx-group-into-plugin"
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
              data-testid="ctx-remove-from-plugin"
              className="context-menu-item"
              onClick={() => { removeFromPlugin(contextMenu.nodeId); setContextMenu(null); }}
            >
              Remove from Plugin
            </div>
          )}
          <div
            data-testid="ctx-delete-node"
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
          data-testid="context-menu"
          className="context-menu"
          style={{ left: canvasMenu.x, top: canvasMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin', 'comment'] as BlueprintNodeType[]).map((type) => (
            <div
              key={type}
              data-testid={`ctx-add-${type}`}
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
            data-testid="ctx-auto-layout"
            className="context-menu-item"
            onClick={() => { autoLayout('LR'); setCanvasMenu(null); }}
          >
            Auto-layout
          </div>
        </div>
      )}

      {/* Quick-Connect Menu */}
      {quickConnectMenu && (
        <div
          data-testid="quick-connect-menu"
          className="context-menu"
          style={{ left: quickConnectMenu.x, top: quickConnectMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {quickConnectMenu.items.map(({ nodeType, pinId }) => (
            <div
              key={`${nodeType}-${pinId}`}
              data-testid={`qc-add-${nodeType}`}
              className="context-menu-item"
              onClick={() => onQuickConnectSelect(nodeType, pinId)}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: NODE_COLORS[nodeType]?.header,
                  marginRight: 8,
                }}
              />
              {nodeType === 'mcp' ? 'MCP Server' : nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
