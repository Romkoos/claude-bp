import { type NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import type { RulesNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

export function RulesNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as RulesNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  return (
    <BaseNode
      id={id}
      nodeType="rules"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.rules}
      icon={FileText}
      selected={selected}
    >
      <div className="space-y-1 text-xs">
        {/* Compact: scope badge + content preview */}
        <div className="flex gap-1">
          <span
            className="bp-badge"
            style={{
              background: nodeData.scope === 'root' ? '#64748b30' : '#3b82f630',
              color: nodeData.scope === 'root' ? '#94a3b8' : '#60a5fa',
            }}
          >
            {nodeData.scope === 'root' ? 'root' : nodeData.path}
          </span>
        </div>
        <div
          className="text-[10px] leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-muted)' }}
        >
          {nodeData.content || 'No content...'}
        </div>

        {/* Expanded fields */}
        {!nodeData.collapsed && (
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <select
              value={nodeData.scope}
              onChange={(e) => updateNodeData(id, { scope: e.target.value })}
              className="bp-select"
            >
              <option value="root">Root</option>
              <option value="subfolder">Subfolder</option>
            </select>
            {nodeData.scope === 'subfolder' && (
              <input
                value={nodeData.path}
                onChange={(e) => updateNodeData(id, { path: e.target.value })}
                placeholder="Path..."
                className="bp-input"
              />
            )}
            <textarea
              value={nodeData.content}
              onChange={(e) => updateNodeData(id, { content: e.target.value })}
              placeholder="Rules content..."
              className="bp-textarea"
              rows={4}
            />
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>Priority:</span>
              <input
                type="number"
                value={nodeData.priority}
                onChange={(e) => updateNodeData(id, { priority: parseInt(e.target.value) || 0 })}
                className="bp-input w-16"
              />
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
