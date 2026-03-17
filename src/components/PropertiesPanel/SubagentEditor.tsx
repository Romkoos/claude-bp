import type { SubagentNodeData, SubagentPermissionMode } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { MultiSelect } from '../shared/MultiSelect';


const COMMON_TOOLS = [
  'Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep', 'Agent',
  'WebSearch', 'WebFetch', 'NotebookEdit', 'TodoWrite',
];

const PERMISSION_MODES: { value: SubagentPermissionMode | ''; label: string; warning?: string }[] = [
  { value: '', label: 'Not set (inherits)' },
  { value: 'default', label: 'Default — standard permission prompts' },
  { value: 'acceptEdits', label: 'Accept Edits — auto-accept file edits' },
  { value: 'plan', label: 'Plan — read-only exploration' },
  { value: 'dontAsk', label: "Don't Ask — auto-deny prompts" },
  {
    value: 'bypassPermissions',
    label: 'Bypass Permissions — skip ALL checks',
    warning: 'Skips all permission checks, allowing the subagent to execute any operation without approval. Use with extreme caution.',
  },
];

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function SubagentEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as SubagentNodeData;

  const selectedPermission = PERMISSION_MODES.find((m) => m.value === (d.permissionMode ?? ''));

  return (
    <div className="space-y-1" data-testid="subagent-editor">
      <CollapsibleSection title="Configuration" defaultOpen>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name *</label>
            <input value={d.name} onChange={(e) => updateNodeData(nodeId, { name: e.target.value })} placeholder="Agent name..." className="bp-input text-xs" data-testid="field-subagent-name" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description *</label>
            <textarea value={d.description} onChange={(e) => updateNodeData(nodeId, { description: e.target.value })} placeholder="When Claude should delegate to this subagent..." className="bp-textarea text-xs" rows={4} data-testid="field-subagent-description" />
          </div>
          <div data-testid="field-subagent-system-prompt">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>System Prompt</label>
            <textarea value={d.systemPrompt} onChange={(e) => updateNodeData(nodeId, { systemPrompt: e.target.value })} placeholder="System prompt..." className="bp-textarea text-xs" rows={10} />
          </div>
          <div className="flex items-center gap-2" data-testid="field-subagent-background">
            <input
              type="checkbox"
              id={`${nodeId}-background`}
              checked={d.background}
              onChange={(e) => updateNodeData(nodeId, { background: e.target.checked })}
              className="rounded"
            />
            <label htmlFor={`${nodeId}-background`} className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Always run in background
            </label>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Model</label>
            <select value={d.model} onChange={(e) => updateNodeData(nodeId, { model: e.target.value })} className="bp-select text-xs" data-testid="field-subagent-model">
              <option value="inherit">Inherit (from main conversation)</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Max Turns</label>
            <input
              type="number"
              value={d.maxTurns ?? ''}
              onChange={(e) => updateNodeData(nodeId, { maxTurns: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Unlimited"
              className="bp-input text-xs w-24"
              data-testid="field-subagent-max-turns"
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Tools">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Allowed Tools</label>
            <MultiSelect
              options={COMMON_TOOLS}
              selected={d.allowedTools}
              onChange={(tools) => updateNodeData(nodeId, { allowedTools: tools })}
              placeholder="Inherits all tools if empty..."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Disallowed Tools</label>
            <MultiSelect
              options={COMMON_TOOLS}
              selected={d.disallowedTools}
              onChange={(tools) => updateNodeData(nodeId, { disallowedTools: tools })}
              placeholder="Tools to deny..."
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Permissions & Execution">
        <div className="space-y-2">
          <div data-testid="field-subagent-permission-mode">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Permission Mode</label>
            <select
              value={d.permissionMode ?? ''}
              onChange={(e) => updateNodeData(nodeId, { permissionMode: e.target.value || null })}
              className="bp-select text-xs"
              style={d.permissionMode === 'bypassPermissions' ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            >
              {PERMISSION_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {selectedPermission?.warning && (
              <div
                className="mt-1 text-[10px] px-2 py-1 rounded"
                style={{ background: '#7f1d1d60', color: '#fca5a5', border: '1px solid #7f1d1d' }}
                data-testid="bypass-permissions-warning"
              >
                {selectedPermission.warning}
              </div>
            )}
          </div>
          <div data-testid="field-subagent-isolation">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Isolation</label>
            <select
              value={d.isolation ?? ''}
              onChange={(e) => updateNodeData(nodeId, { isolation: e.target.value || null })}
              className="bp-select text-xs"
            >
              <option value="">None</option>
              <option value="worktree">Git Worktree (isolated repo copy)</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

    </div>
  );
}
