import type { RulesNodeData } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function RulesEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as RulesNodeData;

  return (
    <div className="space-y-1">
      <CollapsibleSection title="Configuration">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Scope</label>
            <select value={d.scope} onChange={(e) => updateNodeData(nodeId, { scope: e.target.value })} className="bp-select text-xs">
              <option value="root">Root</option>
              <option value="subfolder">Subfolder</option>
            </select>
          </div>
          {d.scope === 'subfolder' && (
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Path</label>
              <input value={d.path} onChange={(e) => updateNodeData(nodeId, { path: e.target.value })} placeholder="e.g. src/components" className="bp-input text-xs font-mono" />
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Priority</label>
            <input type="number" value={d.priority} onChange={(e) => updateNodeData(nodeId, { priority: parseInt(e.target.value) || 0 })} className="bp-input text-xs w-20" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Content">
        <textarea
          value={d.content}
          onChange={(e) => updateNodeData(nodeId, { content: e.target.value })}
          placeholder="# Project Rules..."
          className="bp-textarea text-xs font-mono"
          rows={12}
        />
      </CollapsibleSection>
    </div>
  );
}
