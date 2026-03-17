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
      <div className="space-y-1 text-xs">
        {/* Compact */}
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

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <input
              value={nodeData.frontmatter.name}
              onChange={(e) => updateFrontmatter({ name: e.target.value })}
              placeholder="Skill name..."
              className="bp-input"
            />
            <textarea
              value={nodeData.frontmatter.description}
              onChange={(e) => updateFrontmatter({ description: e.target.value })}
              placeholder="Description..."
              className="bp-textarea"
              rows={2}
            />
            <select
              value={nodeData.frontmatter.context ?? ''}
              onChange={(e) => updateFrontmatter({ context: e.target.value === 'fork' ? 'fork' : undefined })}
              className="bp-select"
            >
              <option value="">Inline (default)</option>
              <option value="fork">Fork</option>
            </select>
            {nodeData.frontmatter.context === 'fork' && (
              <select
                value={nodeData.frontmatter.agent}
                onChange={(e) => updateFrontmatter({ agent: e.target.value })}
                className="bp-select"
              >
                <option value="general-purpose">General Purpose</option>
                <option value="Explore">Explore</option>
                <option value="Plan">Plan</option>
              </select>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
