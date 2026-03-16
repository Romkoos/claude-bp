import type { HookNodeData, HookEvent } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';

const HOOK_EVENTS: HookEvent[] = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'PostToolUseFailure', 'PermissionRequest', 'Stop', 'SubagentStop',
  'SubagentSpawn', 'PreCompact', 'ConfigChange', 'ContextUpdate',
];

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function HookEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as HookNodeData;

  const updateDecision = (updates: Partial<HookNodeData['decision']>) => {
    updateNodeData(nodeId, { decision: { ...d.decision, ...updates } });
  };

  return (
    <div className="space-y-1" data-testid="hook-editor">
      <CollapsibleSection title="Event">
        <div className="space-y-2">
          <div data-testid="field-hook-event">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Lifecycle Event</label>
            <select value={d.event} onChange={(e) => updateNodeData(nodeId, { event: e.target.value })} className="bp-select text-xs">
              {HOOK_EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>
          <div data-testid="field-hook-matcher">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Matcher</label>
            <input value={d.matcher} onChange={(e) => updateNodeData(nodeId, { matcher: e.target.value })} placeholder="* or tool name" className="bp-input text-xs font-mono" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Handler">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
            <select value={d.hookType} onChange={(e) => updateNodeData(nodeId, { hookType: e.target.value })} className="bp-select text-xs">
              <option value="command">Command</option>
              <option value="http">HTTP</option>
            </select>
          </div>
          <div data-testid="field-hook-command">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Command</label>
            <input value={d.command} onChange={(e) => updateNodeData(nodeId, { command: e.target.value })} placeholder="echo 'hook fired'" className="bp-input text-xs font-mono" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Timeout (ms)</label>
            <input type="number" value={d.timeoutMs} onChange={(e) => updateNodeData(nodeId, { timeoutMs: parseInt(e.target.value) || 60000 })} className="bp-input text-xs w-24" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Decision">
        <div className="space-y-2">
          <div data-testid="field-hook-decision">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Decision Type</label>
            <select value={d.decision.type} onChange={(e) => updateDecision({ type: e.target.value as HookNodeData['decision']['type'] })} className="bp-select text-xs">
              <option value="none">None</option>
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
              <option value="block">Block</option>
              <option value="escalate">Escalate</option>
            </select>
          </div>
          {d.decision.type !== 'none' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Reason</label>
                <input value={d.decision.reason} onChange={(e) => updateDecision({ reason: e.target.value })} placeholder="Reason for decision..." className="bp-input text-xs" />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={d.decision.modifyInput}
                  onChange={(e) => updateDecision({ modifyInput: e.target.checked })}
                  className="rounded"
                />
                Modify input
              </label>
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Advanced" defaultOpen={false}>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Inject System Message</label>
            <textarea value={d.injectSystemMessage} onChange={(e) => updateNodeData(nodeId, { injectSystemMessage: e.target.value })} placeholder="System message to inject..." className="bp-textarea text-xs" rows={3} />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={d.continueAfter}
              onChange={(e) => updateNodeData(nodeId, { continueAfter: e.target.checked })}
              className="rounded"
            />
            Continue after hook
          </label>
        </div>
      </CollapsibleSection>
    </div>
  );
}
