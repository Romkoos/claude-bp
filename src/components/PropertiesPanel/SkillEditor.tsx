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
    <div className="space-y-1" data-testid="skill-editor">
      <CollapsibleSection title="Frontmatter" testId="collapsible-section-frontmatter">
        <div className="space-y-2">
          <div data-testid="field-skill-name">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input value={d.frontmatter.name} onChange={(e) => updateFm({ name: e.target.value })} placeholder="skill-name" className="bp-input text-xs" />
          </div>
          <div data-testid="field-skill-description">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea value={d.frontmatter.description} onChange={(e) => updateFm({ description: e.target.value })} placeholder="What this skill does..." className="bp-textarea text-xs" rows={2} />
          </div>
          <div data-testid="field-skill-argument-hint">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Argument Hint</label>
            <input value={d.frontmatter.argumentHint} onChange={(e) => updateFm({ argumentHint: e.target.value })} placeholder="[issue-number]" className="bp-input text-xs" />
          </div>
          <div data-testid="field-skill-disable-model-invocation" className="flex items-center gap-2">
            <input type="checkbox" checked={d.frontmatter.disableModelInvocation} onChange={(e) => updateFm({ disableModelInvocation: e.target.checked })} className="bp-checkbox" />
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Disable Model Invocation</label>
          </div>
          <div data-testid="field-skill-user-invocable" className="flex items-center gap-2">
            <input type="checkbox" checked={d.frontmatter.userInvocable} onChange={(e) => updateFm({ userInvocable: e.target.checked })} className="bp-checkbox" />
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>User Invocable</label>
          </div>
          <div data-testid="field-skill-context">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Context</label>
            <select value={d.frontmatter.context ?? ''} onChange={(e) => updateFm({ context: e.target.value === 'fork' ? 'fork' : undefined })} className="bp-select text-xs">
              <option value="">Inline (default)</option>
              <option value="fork">Fork</option>
            </select>
          </div>
          {d.frontmatter.context === 'fork' && (
            <div data-testid="field-skill-agent">
              <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Agent</label>
              <select value={d.frontmatter.agent} onChange={(e) => updateFm({ agent: e.target.value })} className="bp-select text-xs">
                <option value="general-purpose">General Purpose</option>
                <option value="Explore">Explore</option>
                <option value="Plan">Plan</option>
              </select>
            </div>
          )}
          <div data-testid="field-skill-model">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Model</label>
            <select value={d.frontmatter.model} onChange={(e) => updateFm({ model: e.target.value })} className="bp-select text-xs">
              <option value="">Not set</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      <div data-testid="field-skill-allowed-tools">
      <CollapsibleSection title="Allowed Tools">
        <MultiSelect
          options={COMMON_TOOLS}
          selected={d.frontmatter.allowedTools}
          onChange={(tools) => updateFm({ allowedTools: tools })}
          placeholder="Select tools..."
        />
      </CollapsibleSection>
      </div>

      <div data-testid="field-skill-instructions">
      <CollapsibleSection title="Instructions">
        <textarea value={d.instructions} onChange={(e) => updateNodeData(nodeId, { instructions: e.target.value })} placeholder="Skill instructions..." className="bp-textarea text-xs" rows={8} />
      </CollapsibleSection>
      </div>
    </div>
  );
}
