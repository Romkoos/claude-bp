import type { PluginNodeData } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function PluginEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const nodes = useGraphStore((s) => s.nodes);
  const d = data as unknown as PluginNodeData;

  const children = nodes.filter((n) => n.parentId === nodeId);

  return (
    <div className="space-y-1">
      <CollapsibleSection title="Plugin Configuration" defaultOpen>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Plugin Name
            </label>
            <input
              value={d.pluginName}
              onChange={(e) => updateNodeData(nodeId, { pluginName: e.target.value })}
              placeholder="my-plugin"
              className="bp-input text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Version
            </label>
            <input
              value={d.version}
              onChange={(e) => updateNodeData(nodeId, { version: e.target.value })}
              placeholder="1.0.0"
              className="bp-input text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Description
            </label>
            <textarea
              value={d.description}
              onChange={(e) => updateNodeData(nodeId, { description: e.target.value })}
              placeholder="What does this plugin do..."
              className="bp-textarea text-xs"
              rows={3}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Install Script" defaultOpen={false}>
        <textarea
          value={d.installScript}
          onChange={(e) => updateNodeData(nodeId, { installScript: e.target.value })}
          placeholder="npm install my-plugin..."
          className="bp-textarea text-xs font-mono"
          rows={6}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Children" defaultOpen>
        {children.length === 0 ? (
          <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
            Drag nodes into the plugin container to group them
          </p>
        ) : (
          <div className="space-y-1">
            {children.map((child) => {
              const childType = (child.type as string ?? 'unknown').replace(/Node$/i, '');
              const childLabel = (child.data as Record<string, unknown>)?.label as string ?? child.id;
              return (
                <div
                  key={child.id}
                  className="flex items-center gap-2 px-2 py-1 rounded"
                  style={{ background: 'var(--node-bg)', border: '1px solid var(--node-border)' }}
                >
                  <span
                    className="bp-badge text-[10px]"
                    style={{ background: '#f43f5e20', color: '#f43f5e' }}
                  >
                    {childType}
                  </span>
                  <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {childLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
