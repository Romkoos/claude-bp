import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
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
      style={{
        border: `2px dashed ${selected ? '#f43f5e' : '#f43f5e40'}`,
        background: '#f43f5e08',
        borderRadius: 12,
        minWidth: 400,
        minHeight: 200,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid #f43f5e30' }}
      >
        <Package size={16} style={{ color: '#f43f5e' }} />
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
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
        {hasErrors && <AlertCircle size={14} style={{ color: '#ef4444' }} />}
        {!hasErrors && hasWarnings && <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
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
        <div className="px-3 py-2 space-y-1.5">
          <input
            value={nodeData.pluginName}
            onChange={(e) => updateNodeData(id, { pluginName: e.target.value })}
            placeholder="Plugin name..."
            className="bp-input text-xs"
          />
          <input
            value={nodeData.version}
            onChange={(e) => updateNodeData(id, { version: e.target.value })}
            placeholder="1.0.0"
            className="bp-input text-xs font-mono"
          />
        </div>
      )}

      {/* Spacer — lets children render inside the group */}
      <div className="flex-1" />

      {/* Validation footer */}
      {(hasErrors || hasWarnings) && (
        <div
          className="px-3 py-1.5 text-[10px] flex items-center gap-1"
          style={{
            borderTop: '1px solid #f43f5e30',
            color: hasErrors ? '#ef4444' : '#f59e0b',
            background: hasErrors ? '#ef44440a' : '#f59e0b0a',
            borderRadius: '0 0 10px 10px',
          }}
        >
          {hasErrors ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
          {hasErrors
            ? `${nodeData.validation.errors.length} error${nodeData.validation.errors.length > 1 ? 's' : ''}`
            : `${nodeData.validation.warnings.length} warning${nodeData.validation.warnings.length > 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
}

export const PluginNode = memo(PluginNodeInner);
