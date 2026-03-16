import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { CommentNodeData } from '../../types/nodes';
import { useGraphStore } from '../../store/useGraphStore';

const COLOR_PALETTE = {
  yellow: { bg: '#fef9c320', border: '#eab30840', text: '#fbbf24' },
  blue:   { bg: '#dbeafe20', border: '#3b82f640', text: '#60a5fa' },
  green:  { bg: '#dcfce720', border: '#22c55e40', text: '#4ade80' },
  pink:   { bg: '#fce7f320', border: '#ec489940', text: '#f472b6' },
} as const;

const COLORS: Array<CommentNodeData['color']> = ['yellow', 'blue', 'green', 'pink'];

function CommentNodeInner({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as CommentNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const palette = COLOR_PALETTE[nodeData.color] || COLOR_PALETTE.yellow;

  return (
    <div
      style={{
        width: nodeData.width,
        minHeight: nodeData.height,
        background: palette.bg,
        border: `1px solid ${selected ? palette.text : palette.border}`,
        borderRadius: 6,
        padding: 10,
        boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Color selector */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => updateNodeData(id, { color: c })}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: COLOR_PALETTE[c].text,
              border: nodeData.color === c ? '2px solid #fff' : '1px solid transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Content textarea */}
      <textarea
        value={nodeData.content}
        onChange={(e) => updateNodeData(id, { content: e.target.value })}
        placeholder="Add a comment..."
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          color: palette.text,
          fontSize: 11,
          lineHeight: 1.5,
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

export const CommentNode = memo(CommentNodeInner);
