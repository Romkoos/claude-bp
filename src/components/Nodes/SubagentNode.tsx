import { type NodeProps } from '@xyflow/react';
import { Bot } from 'lucide-react';
import type { SubagentNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

export function SubagentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SubagentNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  return (
    <BaseNode
      id={id}
      nodeType="subagent"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.subagent}
      icon={Bot}
      selected={selected}
    >
      <div className="space-y-1 text-xs">
        {/* Compact */}
        {nodeData.name && (
          <div className="text-[10px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {nodeData.name}
          </div>
        )}
        <div className="flex gap-1 flex-wrap">
          {nodeData.model !== 'inherit' && (
            <span className="bp-badge" style={{ background: '#2d333b', color: 'var(--text-secondary)' }}>
              {nodeData.model}
            </span>
          )}
          {nodeData.permissionMode && (
            <span
              className="bp-badge"
              style={{
                background: nodeData.permissionMode === 'bypassPermissions' ? '#7f1d1d80' : '#1e3a5f80',
                color: nodeData.permissionMode === 'bypassPermissions' ? '#fca5a5' : '#93c5fd',
              }}
            >
              {nodeData.permissionMode}
            </span>
          )}
          {nodeData.background && (
            <span className="bp-badge" style={{ background: '#1c1917', color: '#a8a29e' }}>
              background
            </span>
          )}
          {nodeData.isolation === 'worktree' && (
            <span className="bp-badge" style={{ background: '#14532d80', color: '#86efac' }}>
              worktree
            </span>
          )}
        </div>

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <input
              value={nodeData.name}
              onChange={(e) => updateNodeData(id, { name: e.target.value })}
              placeholder="Subagent name..."
              className="bp-input"
            />
            <select
              value={nodeData.model}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="bp-select"
            >
              <option value="inherit">Inherit</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
            <textarea
              value={nodeData.systemPrompt}
              onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
              placeholder="System prompt..."
              className="bp-textarea"
              rows={2}
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
}
