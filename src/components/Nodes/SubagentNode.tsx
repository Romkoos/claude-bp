import { type NodeProps } from '@xyflow/react';
import { Bot } from 'lucide-react';
import type { SubagentNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

export function SubagentNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SubagentNodeData;

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
        {nodeData.collapsed ? (
          <>
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
          </>
        ) : (
          <NodeParamBlock>
            <NodeParamRow label="Name" value={nodeData.name} />
            <NodeParamRow label="Model" value={nodeData.model} />
            <NodeParamRow label="Permission" value={nodeData.permissionMode} />
            <NodeParamRow label="Max turns" value={nodeData.maxTurns} />
            <NodeParamRow label="Background" value={nodeData.background} />
            <NodeParamRow label="Isolation" value={nodeData.isolation} />
            {nodeData.allowedTools.length > 0 && (
              <NodeParamRow label="Allowed tools" value={nodeData.allowedTools.length} />
            )}
            {nodeData.disallowedTools.length > 0 && (
              <NodeParamRow label="Disallowed tools" value={nodeData.disallowedTools.length} />
            )}
          </NodeParamBlock>
        )}
      </div>
    </BaseNode>
  );
}
