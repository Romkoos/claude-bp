import { Handle, Position, useHandleConnections } from '@xyflow/react';
import type { PinDefinition } from '../../types/pins';
import { PinDirection } from '../../types/pins';
import { PIN_COLORS } from '../../constants/pinTypes';

interface TypedHandleProps {
  pin: PinDefinition;
  style?: React.CSSProperties;
}

export function TypedHandle({ pin, style }: TypedHandleProps) {
  const isInput = pin.direction === PinDirection.In;
  const handleType = isInput ? 'target' : 'source';
  const position = isInput ? Position.Left : Position.Right;
  const color = PIN_COLORS[pin.type];

  const connections = useHandleConnections({ type: handleType, id: pin.id });
  const isConnected = connections.length > 0;

  return (
    <div
      className="flex items-center gap-1.5 relative"
      style={{
        justifyContent: isInput ? 'flex-start' : 'flex-end',
        padding: '3px 0',
      }}
    >
      {!isInput && (
        <span
          className="text-[10px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          {pin.label}
        </span>
      )}
      <Handle
        type={handleType}
        position={position}
        id={pin.id}
        style={{
          width: 10,
          height: 10,
          background: isConnected ? color : 'transparent',
          border: `2px solid ${color}`,
          borderRadius: '50%',
          position: 'relative',
          transform: 'none',
          top: 'auto',
          left: 'auto',
          right: 'auto',
          ...style,
        }}
      />
      {isInput && (
        <span
          className="text-[10px] whitespace-nowrap"
          style={{ color: 'var(--text-muted)' }}
        >
          {pin.label}
        </span>
      )}
    </div>
  );
}
