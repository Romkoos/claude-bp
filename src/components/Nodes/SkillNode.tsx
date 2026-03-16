import { type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { SkillNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

export function SkillNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  const updateFrontmatter = (updates: Partial<SkillNodeData['frontmatter']>) => {
    updateNodeData(id, {
      frontmatter: { ...nodeData.frontmatter, ...updates },
    });
  };

  return (
    <BaseNode
      id={id}
      nodeType="skill"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.skill}
      icon={Zap}
      selected={selected}
    >
      <div className="space-y-1.5 text-xs">
        {/* Compact */}
        {nodeData.frontmatter.name && (
          <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {nodeData.frontmatter.name}
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          <span
            className="bp-badge"
            style={{
              background: nodeData.frontmatter.context === 'conversation' ? '#10b98130' : '#8b5cf630',
              color: nodeData.frontmatter.context === 'conversation' ? '#6ee7b7' : '#c4b5fd',
            }}
          >
            {nodeData.frontmatter.context}
          </span>
          {nodeData.frontmatter.context === 'fork' && nodeData.frontmatter.agent !== 'inherit' && (
            <span className="bp-badge" style={{ background: '#3b82f630', color: '#93c5fd' }}>
              {nodeData.frontmatter.agent}
            </span>
          )}
        </div>

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <input
              value={nodeData.frontmatter.name}
              onChange={(e) => updateFrontmatter({ name: e.target.value })}
              placeholder="Skill name..."
              className="bp-input text-xs"
            />
            <textarea
              value={nodeData.frontmatter.description}
              onChange={(e) => updateFrontmatter({ description: e.target.value })}
              placeholder="Description..."
              className="bp-textarea text-xs"
              rows={2}
            />
            <select
              value={nodeData.frontmatter.context}
              onChange={(e) => updateFrontmatter({ context: e.target.value as 'conversation' | 'fork' })}
              className="bp-select text-xs"
            >
              <option value="conversation">Conversation</option>
              <option value="fork">Fork</option>
            </select>
            {nodeData.frontmatter.context === 'fork' && (
              <select
                value={nodeData.frontmatter.agent}
                onChange={(e) => updateFrontmatter({ agent: e.target.value })}
                className="bp-select text-xs"
              >
                <option value="inherit">Inherit</option>
                <option value="Explore">Explore</option>
                <option value="Plan">Plan</option>
                <option value="general-purpose">General Purpose</option>
              </select>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
