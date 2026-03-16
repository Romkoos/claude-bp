import type { ToolNodeData } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';

const COMMON_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'Task', 'Agent',
];

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function ToolEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as ToolNodeData;

  const isCustom = !COMMON_TOOLS.includes(d.toolName);

  return (
    <div className="space-y-1">
      <CollapsibleSection title="Tool Configuration">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Tool Name</label>
            <select
              value={isCustom ? '__custom__' : d.toolName}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__custom__') {
                  updateNodeData(nodeId, { toolName: '' });
                } else {
                  updateNodeData(nodeId, { toolName: val });
                }
              }}
              className="bp-select text-xs"
            >
              {COMMON_TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="__custom__">Custom...</option>
            </select>
          </div>
          {(isCustom || d.toolName === '') && (
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Custom Tool Name</label>
              <input
                value={d.toolName}
                onChange={(e) => updateNodeData(nodeId, { toolName: e.target.value })}
                placeholder="Enter tool name..."
                className="bp-input text-xs font-mono"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Pattern</label>
            <input
              value={d.pattern}
              onChange={(e) => updateNodeData(nodeId, { pattern: e.target.value })}
              placeholder="No restriction"
              className="bp-input text-xs font-mono"
            />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={d.builtin}
              onChange={(e) => updateNodeData(nodeId, { builtin: e.target.checked })}
              className="rounded"
            />
            Built-in
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Description" defaultOpen={false}>
        <div>
          <textarea
            value={d.description}
            onChange={(e) => updateNodeData(nodeId, { description: e.target.value })}
            placeholder="Describe this tool..."
            className="bp-textarea text-xs"
            rows={4}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
