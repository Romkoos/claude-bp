import { type NodeProps } from '@xyflow/react';
import { Plug } from 'lucide-react';
import type { McpNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

export function McpNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as McpNodeData;

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
      <div className="space-y-1 text-xs">
        {nodeData.collapsed ? (
          <>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {nodeData.serverName || 'unnamed server'}
            </div>
            <div className="flex items-center gap-1">
              <span
                className="inline-block px-1 py-0.5 rounded text-[9px] font-medium"
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
          </>
        ) : (
          <NodeParamBlock>
            <NodeParamRow label="Server" value={nodeData.serverName} />
            <NodeParamRow label="Type" value={nodeData.connection.type} />
            {nodeData.connection.type === 'url' && (
              <NodeParamRow label="URL" value={nodeData.connection.url} />
            )}
            {nodeData.connection.type === 'stdio' && (
              <>
                <NodeParamRow label="Command" value={nodeData.connection.command} />
                <NodeParamRow label="Args" value={nodeData.connection.args.join(', ')} />
              </>
            )}
            {Object.keys(nodeData.env).length > 0 && (
              <NodeParamRow label="Env vars" value={Object.keys(nodeData.env).length} />
            )}
            {nodeData.providedTools.length > 0 && (
              <NodeParamRow label="Tools" value={nodeData.providedTools.length} />
            )}
          </NodeParamBlock>
        )}
      </div>
    </BaseNode>
  );
}
