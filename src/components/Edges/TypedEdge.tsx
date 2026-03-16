import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { PinType } from '../../types/pins';
import { PIN_COLORS } from '../../constants/pinTypes';

interface TypedEdgeData {
  pinType?: PinType;
  label?: string;
}

export function TypedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = (data || {}) as TypedEdgeData;
  const pinType = edgeData.pinType || PinType.Exec;
  const color = PIN_COLORS[pinType];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const isAnimated = pinType === PinType.Exec || pinType === PinType.Trigger;
  const isDashed = pinType === PinType.Context || pinType === PinType.ToolAccess;
  const strokeWidth = pinType === PinType.Exec ? 3 : 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? strokeWidth + 1 : strokeWidth,
          strokeDasharray: isDashed ? '5,5' : isAnimated ? '12' : undefined,
          opacity: selected ? 1 : 0.8,
        }}
        className={isAnimated ? 'animated-edge' : undefined}
      />
      {edgeData.label && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 10}
          width={80}
          height={20}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'var(--node-bg)',
              border: `1px solid ${color}40`,
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 10,
              color: color,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {edgeData.label}
          </div>
        </foreignObject>
      )}
    </>
  );
}
