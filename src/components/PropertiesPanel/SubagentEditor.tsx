import type { SubagentNodeData } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { MultiSelect } from '../shared/MultiSelect';

const COMMON_TOOLS = [
  'Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep', 'Agent',
  'WebSearch', 'WebFetch', 'NotebookEdit', 'TodoWrite',
];

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function SubagentEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as SubagentNodeData;

  return (
    <div className="space-y-1">
      <CollapsibleSection title="Configuration">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input value={d.name} onChange={(e) => updateNodeData(nodeId, { name: e.target.value })} placeholder="Agent name..." className="bp-input text-xs" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea value={d.description} onChange={(e) => updateNodeData(nodeId, { description: e.target.value })} placeholder="What this agent does..." className="bp-textarea text-xs" rows={2} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Agent Type</label>
            <select value={d.agentType} onChange={(e) => updateNodeData(nodeId, { agentType: e.target.value })} className="bp-select text-xs">
              <option value="general-purpose">General Purpose</option>
              <option value="Explore">Explore</option>
              <option value="Plan">Plan</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Model</label>
            <select value={d.model} onChange={(e) => updateNodeData(nodeId, { model: e.target.value })} className="bp-select text-xs">
              <option value="inherit">Inherit</option>
              <option value="claude-opus-4">Claude Opus 4</option>
              <option value="claude-sonnet-4">Claude Sonnet 4</option>
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
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Allowed Tools">
        <MultiSelect
          options={COMMON_TOOLS}
          selected={d.allowedTools}
          onChange={(tools) => updateNodeData(nodeId, { allowedTools: tools })}
          placeholder="Select tools..."
        />
      </CollapsibleSection>

      <CollapsibleSection title="System Prompt">
        <textarea
          value={d.systemPrompt}
          onChange={(e) => updateNodeData(nodeId, { systemPrompt: e.target.value })}
          placeholder="System prompt..."
          className="bp-textarea text-xs font-mono"
          rows={10}
        />
      </CollapsibleSection>
    </div>
  );
}
