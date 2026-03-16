import { type NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import type { ToolNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

const COMMON_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'Task', 'Agent',
];

export function ToolNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  const isCustom = !COMMON_TOOLS.includes(nodeData.toolName);

  return (
    <BaseNode
      id={id}
      nodeType="tool"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.tool}
      icon={Wrench}
      selected={selected}
      minWidth={200}
    >
      <div className="space-y-1.5 text-xs">
        {/* Compact: tool name, pattern badge, built-in badge */}
        <div className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {nodeData.toolName || 'Unnamed'}
        </div>
        <div className="flex items-center gap-1.5">
          {nodeData.pattern && (
            <span
              className="bp-badge font-mono"
              style={{ background: '#f9731630', color: '#f97316' }}
            >
              {nodeData.pattern}
            </span>
          )}
          {nodeData.builtin && (
            <span
              className="bp-badge"
              style={{ background: '#64748b30', color: '#94a3b8' }}
            >
              built-in
            </span>
          )}
        </div>

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <select
              value={isCustom ? '__custom__' : nodeData.toolName}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom__') {
                  updateNodeData(id, { toolName: '' });
                } else {
                  updateNodeData(id, { toolName: val });
                }
              }}
              className="bp-select text-xs"
            >
              {COMMON_TOOLS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {(isCustom || nodeData.toolName === '') && (
              <input
                value={nodeData.toolName}
                onChange={(e) => updateNodeData(id, { toolName: e.target.value })}
                placeholder="Custom tool name..."
                className="bp-input text-xs font-mono"
              />
            )}
            <input
              value={nodeData.pattern}
              onChange={(e) => updateNodeData(id, { pattern: e.target.value })}
              placeholder="No restriction"
              className="bp-input text-xs font-mono"
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={nodeData.builtin}
                onChange={(e) => updateNodeData(id, { builtin: e.target.checked })}
                className="rounded"
              />
              Built-in
            </label>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
