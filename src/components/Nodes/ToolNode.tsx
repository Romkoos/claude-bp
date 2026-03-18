import { type NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import type { ToolNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

export function ToolNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;

  return (
    <BaseNode
      id={id}
      nodeType="tool"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.tool}
      icon={Wrench}
      selected={selected}
      minWidth={180}
    >
      <div className="space-y-1 text-xs">
        {nodeData.collapsed ? (
          <>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {nodeData.toolName || 'Unnamed'}
            </div>
            <div className="flex items-center gap-1">
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
          </>
        ) : (
          <NodeParamBlock>
            <NodeParamRow label="Tool" value={nodeData.toolName} />
            <NodeParamRow label="Pattern" value={nodeData.pattern} />
            <NodeParamRow label="Built-in" value={nodeData.builtin} />
          </NodeParamBlock>
        )}
      </div>
    </BaseNode>
  );
}
