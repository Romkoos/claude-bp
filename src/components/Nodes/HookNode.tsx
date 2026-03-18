import { type NodeProps } from '@xyflow/react';
import { Webhook } from 'lucide-react';
import type { HookNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

const DECISION_COLORS: Record<string, string> = {
  none: '#484f58',
  allow: '#22c55e',
  deny: '#ef4444',
  block: '#ef4444',
  escalate: '#f59e0b',
};

export function HookNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as HookNodeData;

  return (
    <BaseNode
      id={id}
      nodeType="hook"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.hook}
      icon={Webhook}
      selected={selected}
    >
      <div className="space-y-1 text-xs">
        {nodeData.collapsed ? (
          <>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {nodeData.event}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {nodeData.matcher}
              </span>
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: DECISION_COLORS[nodeData.decision.type] || '#484f58' }}
              />
            </div>
          </>
        ) : (
          <NodeParamBlock>
            <NodeParamRow label="Event" value={nodeData.event} />
            <NodeParamRow label="Matcher" value={nodeData.matcher} />
            <NodeParamRow label="Type" value={nodeData.hookType} />
            <NodeParamRow label="Command" value={nodeData.command} />
            <NodeParamRow label="Timeout" value={nodeData.timeoutMs ? `${nodeData.timeoutMs}ms` : undefined} />
            <NodeParamRow label="Decision" value={nodeData.decision.type} />
            {nodeData.decision.type !== 'none' && (
              <>
                <NodeParamRow label="Reason" value={nodeData.decision.reason} />
                <NodeParamRow label="Modify input" value={nodeData.decision.modifyInput} />
              </>
            )}
            <NodeParamRow label="Continue after" value={nodeData.continueAfter} />
          </NodeParamBlock>
        )}
      </div>
    </BaseNode>
  );
}
