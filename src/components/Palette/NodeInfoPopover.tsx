import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { BlueprintNodeType } from '../../types/nodes';
import type { PinDefinition } from '../../types/pins';
import { PinDirection } from '../../types/pins';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { PIN_COLORS } from '../../constants/pinTypes';
import { NODE_COLORS } from '../../constants/theme';
import { NODE_DESCRIPTIONS, type ConnectorDescription } from '../../constants/nodeDescriptions';

interface NodeInfoPopoverProps {
  nodeType: Exclude<BlueprintNodeType, 'comment'>;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function PinRow({ pin, connectorDesc }: { pin: PinDefinition; connectorDesc?: ConnectorDescription }) {
  const color = PIN_COLORS[pin.type];
  const dirLabel = pin.direction === PinDirection.In ? 'IN' : 'OUT';

  return (
    <div className="py-1.5" style={{ borderBottom: '1px solid var(--node-border)' }}>
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <span
          className="text-[9px] font-semibold uppercase flex-shrink-0"
          style={{ color: color }}
        >
          {dirLabel}
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {pin.label}
        </span>
        <span
          className="text-[8px] ml-auto flex-shrink-0 px-1 py-px rounded"
          style={{ color: color, background: `${color}15` }}
        >
          {pin.type}
        </span>
      </div>
      {connectorDesc && (
        <p className="mt-0.5 pl-4 text-[9px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {connectorDesc.description}
        </p>
      )}
    </div>
  );
}

export function NodeInfoPopover({ nodeType, anchorRef, onClose }: NodeInfoPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const desc = NODE_DESCRIPTIONS[nodeType];
  const pins = NODE_PIN_DEFINITIONS[nodeType];
  const colors = NODE_COLORS[nodeType];

  const inputPins = pins.filter((p) => p.direction === PinDirection.In);
  const outputPins = pins.filter((p) => p.direction === PinDirection.Out);
  const connectorDescs = new Map(desc.connectors.map((c) => [c.pinId, c]));

  const [pos, setPos] = useState<{ top: number; left: number; maxH: number }>({ top: -9999, left: -9999, maxH: 400 });

  useLayoutEffect(() => {
    function update() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const margin = 16;
      const minH = 360;
      let top = rect.top;
      let available = vh - top - margin;
      // If not enough space below anchor, align to bottom of viewport
      if (available < minH) {
        top = vh - minH - margin;
        if (top < margin) top = margin;
        available = vh - top - margin;
      }
      setPos({ top, left: rect.right + 8, maxH: available });
    }
    update();
  }, [anchorRef, nodeType]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  return createPortal(
    <div
      ref={ref}
      data-testid={`node-info-popover-${nodeType}`}
      className="fixed z-[9999] w-72 rounded-lg flex flex-col"
      style={{
        top: pos.top,
        left: pos.left,
        maxHeight: pos.maxH,
        background: 'var(--node-bg)',
        border: '1px solid var(--node-border)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--node-border)', background: `${colors.header}15` }}
      >
        <span className="text-xs font-semibold" style={{ color: colors.header }}>
          {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--node-border)] transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="px-3 py-2 overflow-y-auto flex-1 space-y-2">
        {/* Summary */}
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {desc.summary}
        </p>

        {/* Properties */}
        <div>
          <h4
            className="text-[9px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Properties
          </h4>
          {desc.properties.map((prop) => (
            <div key={prop.name} className="py-0.5">
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {prop.name}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {' '}&mdash; {prop.description}
              </span>
            </div>
          ))}
        </div>

        {/* Input connectors */}
        {inputPins.length > 0 && (
          <div>
            <h4
              className="text-[9px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Inputs
            </h4>
            {inputPins.map((pin) => (
              <PinRow key={pin.id} pin={pin} connectorDesc={connectorDescs.get(pin.id)} />
            ))}
          </div>
        )}

        {/* Output connectors */}
        {outputPins.length > 0 && (
          <div>
            <h4
              className="text-[9px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Outputs
            </h4>
            {outputPins.map((pin) => (
              <PinRow key={pin.id} pin={pin} connectorDesc={connectorDescs.get(pin.id)} />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
