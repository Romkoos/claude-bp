import { type NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import type { RulesNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

export function RulesNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as RulesNodeData;

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
        {nodeData.collapsed ? (
          <>
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
          </>
        ) : (
          <NodeParamBlock>
            <NodeParamRow label="Scope" value={nodeData.scope} />
            {nodeData.scope === 'subfolder' && (
              <NodeParamRow label="Path" value={nodeData.path} />
            )}
            <NodeParamRow label="Priority" value={nodeData.priority} />
          </NodeParamBlock>
        )}
      </div>
    </BaseNode>
  );
}
