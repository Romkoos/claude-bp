import { memo } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { Package, ChevronDown, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import type { PluginNodeData } from '../../types/nodes';
import { PinDirection } from '../../types/pins';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { TypedHandle } from '../Pins/TypedHandle';
import { useGraphStore } from '../../store/useGraphStore';

function PluginNodeInner({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as PluginNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const nodes = useGraphStore((s) => s.nodes);
  const dragOverPluginId = useGraphStore((s) => s.dragOverPluginId);
  const isDropTarget = dragOverPluginId === id;

  const children = nodes.filter((n) => n.parentId === id);
  const outputPins = NODE_PIN_DEFINITIONS.plugin.filter((p) => p.direction === PinDirection.Out);

  const hasErrors = nodeData.validation.errors.length > 0;
  const hasWarnings = nodeData.validation.warnings.length > 0;

  // Build child count summary
  const typeCounts: Record<string, number> = {};
  for (const child of children) {
    const t = (child.type as string) ?? 'unknown';
    // Strip "Node" suffix for display (e.g. "skillNode" -> "skill")
    const displayType = t.replace(/Node$/i, '').replace(/^\w/, (c) => c.toLowerCase());
    typeCounts[displayType] = (typeCounts[displayType] || 0) + 1;
  }
  const childSummary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');

  return (
    <div
      data-testid={`plugin-node-${id}`}
      data-drop-target={isDropTarget || undefined}
      style={{
        border: `2px dashed ${isDropTarget ? '#f43f5e' : selected ? '#f43f5e' : '#f43f5e40'}`,
        background: isDropTarget ? '#f43f5e18' : '#f43f5e08',
        boxShadow: isDropTarget ? '0 0 20px #f43f5e30, inset 0 0 20px #f43f5e10' : 'none',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        borderRadius: 12,
        minWidth: 400,
        minHeight: 200,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NodeResizer
        minWidth={400}
        minHeight={200}
        isVisible={selected ?? false}
        lineStyle={{ borderColor: '#f43f5e60' }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: '#f43f5e',
          borderColor: '#f43f5e',
        }}
      />
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1"
        style={{ borderBottom: '1px solid #f43f5e30' }}
      >
        <Package size={14} style={{ color: '#f43f5e' }} />
        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {nodeData.label}
        </span>
        {nodeData.version && (
          <span
            className="bp-badge font-mono text-[10px]"
            style={{ background: '#f43f5e20', color: '#f43f5e' }}
          >
            v{nodeData.version}
          </span>
        )}
        {childSummary && (
          <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>
            {childSummary}
          </span>
        )}
        <div className="flex-1" />
        {hasErrors && <AlertCircle size={14} style={{ color: '#ef4444' }} title={nodeData.validation.errors.join('\n')} />}
        {!hasErrors && hasWarnings && <AlertTriangle size={14} style={{ color: '#f59e0b' }} title={nodeData.validation.warnings.join('\n')} />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData(id, { collapsed: !nodeData.collapsed });
          }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          {nodeData.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {/* Output pins in header area */}
        <div className="flex flex-col justify-center ml-1">
          {outputPins.map((pin) => (
            <TypedHandle key={pin.id} pin={pin} />
          ))}
        </div>
      </div>

      {/* Expanded body */}
      {!nodeData.collapsed && (
        <div className="px-2 py-1 space-y-1">
          <input
            value={nodeData.pluginName}
            onChange={(e) => updateNodeData(id, { pluginName: e.target.value })}
            placeholder="Plugin name..."
            className="bp-input"
          />
          <input
            value={nodeData.version}
            onChange={(e) => updateNodeData(id, { version: e.target.value })}
            placeholder="1.0.0"
            className="bp-input"
          />
        </div>
      )}

      {/* Spacer — lets children render inside the group */}
      <div className="flex-1" />

      {/* Validation footer */}
      {(hasErrors || hasWarnings) && (
        <div
          className="px-2 py-1 text-[10px] flex flex-col gap-0.5"
          style={{
            borderTop: '1px solid #f43f5e30',
            background: hasErrors ? '#ef44440a' : '#f59e0b0a',
            borderRadius: '0 0 10px 10px',
          }}
        >
          {nodeData.validation.errors.map((msg, i) => (
            <div key={`e-${i}`} className="flex items-start gap-1" style={{ color: '#ef4444' }}>
              <AlertCircle size={10} className="mt-[1px] shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
          {nodeData.validation.warnings.map((msg, i) => (
            <div key={`w-${i}`} className="flex items-start gap-1" style={{ color: '#f59e0b' }}>
              <AlertTriangle size={10} className="mt-[1px] shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const PluginNode = memo(PluginNodeInner);
