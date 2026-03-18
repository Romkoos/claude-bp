import { type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { SkillNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

export function SkillNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;

  return (
    <BaseNode
      id={id}
      nodeType="skill"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.skill}
      icon={Zap}
      selected={selected}
    >
      <div className="space-y-1 text-xs">
        {nodeData.collapsed ? (
          <>
            {nodeData.frontmatter.name && (
              <div className="text-[10px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                {nodeData.frontmatter.name}
              </div>
            )}
            <div className="flex gap-1 flex-wrap">
              <span
                className="bp-badge"
                style={{
                  background: nodeData.frontmatter.context === 'fork' ? '#8b5cf630' : '#10b98130',
                  color: nodeData.frontmatter.context === 'fork' ? '#c4b5fd' : '#6ee7b7',
                }}
              >
                {nodeData.frontmatter.context === 'fork' ? 'fork' : 'inline'}
              </span>
              {nodeData.frontmatter.context === 'fork' && nodeData.frontmatter.agent && (
                <span className="bp-badge" style={{ background: '#3b82f630', color: '#93c5fd' }}>
                  {nodeData.frontmatter.agent}
                </span>
              )}
            </div>
          </>
        ) : (
          <NodeParamBlock>
            <NodeParamRow label="Name" value={nodeData.frontmatter.name} />
            <NodeParamRow label="Context" value={nodeData.frontmatter.context === 'fork' ? 'fork' : 'inline'} />
            {nodeData.frontmatter.context === 'fork' && (
              <NodeParamRow label="Agent" value={nodeData.frontmatter.agent} />
            )}
            <NodeParamRow label="Model" value={nodeData.frontmatter.model} />
            <NodeParamRow label="Argument hint" value={nodeData.frontmatter.argumentHint} />
            <NodeParamRow label="User invocable" value={nodeData.frontmatter.userInvocable} />
            <NodeParamRow label="Model invocation" value={nodeData.frontmatter.disableModelInvocation ? 'Disabled' : 'Enabled'} />
            {nodeData.frontmatter.allowedTools.length > 0 && (
              <NodeParamRow label="Allowed tools" value={nodeData.frontmatter.allowedTools.length} />
            )}
          </NodeParamBlock>
        )}
      </div>
    </BaseNode>
  );
}
