import { Plus, Trash2 } from 'lucide-react';
import type { McpNodeData } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { KeyValueEditor } from '../shared/KeyValueEditor';

interface Props {
  nodeId: string;
  data: Record<string, unknown>;
}

export function McpEditor({ nodeId, data }: Props) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const d = data as unknown as McpNodeData;

  const updateConnection = (updates: Partial<McpNodeData['connection']>) => {
    updateNodeData(nodeId, { connection: { ...d.connection, ...updates } });
  };

  const updateTool = (index: number, updates: Partial<McpNodeData['providedTools'][number]>) => {
    const tools = [...d.providedTools];
    tools[index] = { ...tools[index], ...updates };
    updateNodeData(nodeId, { providedTools: tools });
  };

  const addTool = () => {
    updateNodeData(nodeId, {
      providedTools: [...d.providedTools, { name: '', description: '' }],
    });
  };

  const removeTool = (index: number) => {
    const tools = d.providedTools.filter((_, i) => i !== index);
    updateNodeData(nodeId, { providedTools: tools });
  };

  return (
    <div className="space-y-1" data-testid="mcp-editor">
      <CollapsibleSection title="Server Configuration">
        <div className="space-y-2">
          <div data-testid="field-mcp-server-name">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Server Name</label>
            <input value={d.serverName} onChange={(e) => updateNodeData(nodeId, { serverName: e.target.value })} placeholder="my-mcp-server" className="bp-input text-xs" />
          </div>
          <div data-testid="field-mcp-connection-type">
            <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Connection Type</label>
            <select value={d.connection.type} onChange={(e) => updateConnection({ type: e.target.value as McpNodeData['connection']['type'] })} className="bp-select text-xs">
              <option value="url">URL</option>
              <option value="stdio">Stdio</option>
            </select>
          </div>
          {d.connection.type === 'url' && (
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>URL</label>
              <input value={d.connection.url} onChange={(e) => updateConnection({ url: e.target.value })} placeholder="http://localhost:3000/mcp" className="bp-input text-xs font-mono" />
            </div>
          )}
          {d.connection.type === 'stdio' && (
            <>
              <div data-testid="field-mcp-command">
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Command</label>
                <input value={d.connection.command} onChange={(e) => updateConnection({ command: e.target.value })} placeholder="npx -y @modelcontextprotocol/server" className="bp-input text-xs font-mono" />
              </div>
              <div data-testid="field-mcp-args">
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Args (comma-separated)</label>
                <input
                  value={d.connection.args.join(', ')}
                  onChange={(e) => updateConnection({ args: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="--port, 3000"
                  className="bp-input text-xs font-mono"
                />
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Environment Variables" defaultOpen={false}>
        <KeyValueEditor
          pairs={d.env}
          onChange={(env) => updateNodeData(nodeId, { env })}
          keyPlaceholder="ENV_VAR"
          valuePlaceholder="value"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Provided Tools" defaultOpen={false}>
        <div className="space-y-1.5">
          {d.providedTools.map((tool, index) => (
            <div key={index} className="flex gap-1.5 items-start">
              <div className="flex-1 space-y-1">
                <input
                  value={tool.name}
                  onChange={(e) => updateTool(index, { name: e.target.value })}
                  placeholder="tool_name"
                  className="bp-input text-xs font-mono"
                />
                <input
                  value={tool.description}
                  onChange={(e) => updateTool(index, { description: e.target.value })}
                  placeholder="Tool description..."
                  className="bp-input text-xs"
                />
              </div>
              <button
                onClick={() => removeTool(index)}
                className="p-1 rounded hover:opacity-70 mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addTool}
            className="flex items-center gap-1 text-xs py-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <Plus size={12} /> Add tool
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
