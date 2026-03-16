import { type NodeProps } from '@xyflow/react';
import { Plug } from 'lucide-react';
import type { McpNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

export function McpNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as McpNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  const updateConnection = (updates: Partial<McpNodeData['connection']>) => {
    updateNodeData(id, {
      connection: { ...nodeData.connection, ...updates },
    });
  };

  return (
    <BaseNode
      id={id}
      nodeType="mcp"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.mcp}
      icon={Plug}
      selected={selected}
      dashed
    >
      <div className="space-y-1.5 text-xs">
        {/* Compact */}
        <div className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {nodeData.serverName || 'unnamed server'}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              background: nodeData.connection.type === 'url' ? '#06b6d420' : '#a855f720',
              color: nodeData.connection.type === 'url' ? '#06b6d4' : '#a855f7',
            }}
          >
            {nodeData.connection.type}
          </span>
          {nodeData.providedTools.length > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {nodeData.providedTools.length} tool{nodeData.providedTools.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <input
              value={nodeData.serverName}
              onChange={(e) => updateNodeData(id, { serverName: e.target.value })}
              placeholder="Server name..."
              className="bp-input text-xs"
            />
            <select
              value={nodeData.connection.type}
              onChange={(e) => updateConnection({ type: e.target.value as McpNodeData['connection']['type'] })}
              className="bp-select text-xs"
            >
              <option value="url">URL</option>
              <option value="stdio">Stdio</option>
            </select>
            {nodeData.connection.type === 'url' && (
              <input
                value={nodeData.connection.url}
                onChange={(e) => updateConnection({ url: e.target.value })}
                placeholder="http://localhost:3000/mcp"
                className="bp-input text-xs font-mono"
              />
            )}
            {nodeData.connection.type === 'stdio' && (
              <>
                <input
                  value={nodeData.connection.command}
                  onChange={(e) => updateConnection({ command: e.target.value })}
                  placeholder="Command..."
                  className="bp-input text-xs font-mono"
                />
                <input
                  value={nodeData.connection.args.join(', ')}
                  onChange={(e) =>
                    updateConnection({
                      args: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Args (comma-separated)..."
                  className="bp-input text-xs font-mono"
                />
              </>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
