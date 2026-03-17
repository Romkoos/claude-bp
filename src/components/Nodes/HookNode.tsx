import { type NodeProps } from '@xyflow/react';
import { Webhook } from 'lucide-react';
import type { HookNodeData, HookEvent } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

const HOOK_EVENTS: HookEvent[] = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'PostToolUseFailure', 'PermissionRequest', 'Stop', 'SubagentStop',
  'SubagentSpawn', 'PreCompact', 'ConfigChange', 'ContextUpdate',
];

const DECISION_COLORS: Record<string, string> = {
  none: '#484f58',
  allow: '#22c55e',
  deny: '#ef4444',
  block: '#ef4444',
  escalate: '#f59e0b',
};

export function HookNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as HookNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  const updateDecision = (updates: Partial<HookNodeData['decision']>) => {
    updateNodeData(id, {
      decision: { ...nodeData.decision, ...updates },
    });
  };

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
        {/* Compact */}
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

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <select
              value={nodeData.event}
              onChange={(e) => updateNodeData(id, { event: e.target.value })}
              className="bp-select"
            >
              {HOOK_EVENTS.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <input
              value={nodeData.matcher}
              onChange={(e) => updateNodeData(id, { matcher: e.target.value })}
              placeholder="Matcher pattern..."
              className="bp-input"
            />
            <select
              value={nodeData.hookType}
              onChange={(e) => updateNodeData(id, { hookType: e.target.value })}
              className="bp-select"
            >
              <option value="command">Command</option>
              <option value="http">HTTP</option>
            </select>
            <input
              value={nodeData.command}
              onChange={(e) => updateNodeData(id, { command: e.target.value })}
              placeholder="Command..."
              className="bp-input"
            />
            <select
              value={nodeData.decision.type}
              onChange={(e) => updateDecision({ type: e.target.value as HookNodeData['decision']['type'] })}
              className="bp-select"
            >
              <option value="none">None</option>
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
              <option value="block">Block</option>
              <option value="escalate">Escalate</option>
            </select>
            {nodeData.decision.type !== 'none' && (
              <input
                value={nodeData.decision.reason}
                onChange={(e) => updateDecision({ reason: e.target.value })}
                placeholder="Reason..."
                className="bp-input"
              />
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
