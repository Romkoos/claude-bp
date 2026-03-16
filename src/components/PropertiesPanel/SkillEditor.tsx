import type { SkillNodeData } from '../../types/nodes';
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

export function SkillEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as SkillNodeData;

  const updateFm = (updates: Partial<SkillNodeData['frontmatter']>) => {
    updateNodeData(nodeId, { frontmatter: { ...d.frontmatter, ...updates } });
  };

  return (
    <div className="space-y-1">
      <CollapsibleSection title="Frontmatter">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input value={d.frontmatter.name} onChange={(e) => updateFm({ name: e.target.value })} placeholder="skill-name" className="bp-input text-xs" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea value={d.frontmatter.description} onChange={(e) => updateFm({ description: e.target.value })} placeholder="What this skill does..." className="bp-textarea text-xs" rows={2} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Context</label>
            <select value={d.frontmatter.context} onChange={(e) => updateFm({ context: e.target.value as 'conversation' | 'fork' })} className="bp-select text-xs">
              <option value="conversation">Conversation</option>
              <option value="fork">Fork</option>
            </select>
          </div>
          {d.frontmatter.context === 'fork' && (
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Agent</label>
              <select value={d.frontmatter.agent} onChange={(e) => updateFm({ agent: e.target.value })} className="bp-select text-xs">
                <option value="inherit">Inherit</option>
                <option value="Explore">Explore</option>
                <option value="Plan">Plan</option>
                <option value="general-purpose">General Purpose</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Model</label>
            <select value={d.frontmatter.model} onChange={(e) => updateFm({ model: e.target.value })} className="bp-select text-xs">
              <option value="inherit">Inherit</option>
              <option value="claude-opus-4">Claude Opus 4</option>
              <option value="claude-sonnet-4">Claude Sonnet 4</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Version</label>
            <input value={d.frontmatter.version} onChange={(e) => updateFm({ version: e.target.value })} className="bp-input text-xs" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Allowed Tools">
        <MultiSelect
          options={COMMON_TOOLS}
          selected={d.frontmatter.allowedTools}
          onChange={(tools) => updateFm({ allowedTools: tools })}
          placeholder="Select tools..."
        />
      </CollapsibleSection>

      <CollapsibleSection title="Instructions">
        <textarea
          value={d.instructions}
          onChange={(e) => updateNodeData(nodeId, { instructions: e.target.value })}
          placeholder="Skill instructions..."
          className="bp-textarea text-xs font-mono"
          rows={8}
        />
      </CollapsibleSection>
    </div>
  );
}
