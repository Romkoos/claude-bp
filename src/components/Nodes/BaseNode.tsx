import { memo, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, type LucideIcon } from 'lucide-react';
import type { BlueprintNodeType } from '../../types/nodes';
import { PinDirection, type PinDefinition } from '../../types/pins';
import { NODE_COLORS } from '../../constants/theme';
import { TypedHandle } from '../Pins/TypedHandle';
import { useGraphStore } from '../../store/useGraphStore';

interface BaseNodeProps {
  id: string;
  nodeType: BlueprintNodeType;
  data: {
    label: string;
    collapsed: boolean;
    validation: { errors: string[]; warnings: string[] };
  };
  pins: PinDefinition[];
  icon: LucideIcon;
  children?: ReactNode;
  selected?: boolean;
}

function BaseNodeInner({ id, nodeType, data, pins, icon: Icon, children, selected }: BaseNodeProps) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const colors = NODE_COLORS[nodeType];
  const inputPins = pins.filter((p) => p.direction === PinDirection.In);
  const outputPins = pins.filter((p) => p.direction === PinDirection.Out);
  const hasErrors = data.validation.errors.length > 0;
  const hasWarnings = data.validation.warnings.length > 0;

  return (
    <div
      className="blueprint-node rounded-lg overflow-hidden"
      style={{
        background: 'var(--node-bg)',
        border: `1px solid ${selected ? colors.header : 'var(--node-border)'}`,
        boxShadow: selected ? `0 0 20px ${colors.glow}` : undefined,
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      {/* Header stripe */}
      <div style={{ height: 4, background: colors.header }} />

      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--node-border)' }}
      >
        <Icon size={16} style={{ color: colors.header }} />
        <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
          {data.label}
        </span>
        {hasErrors && <AlertCircle size={14} style={{ color: '#ef4444' }} />}
        {!hasErrors && hasWarnings && <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData(id, { collapsed: !data.collapsed });
          }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          {data.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Body: pins + content */}
      <div className="flex">
        {/* Input pins */}
        <div className="flex flex-col justify-center py-2 pl-1 min-w-[90px]">
          {inputPins.map((pin) => (
            <TypedHandle key={pin.id} pin={pin} />
          ))}
        </div>

        {/* Content */}
        {!data.collapsed && children && (
          <div className="flex-1 py-2 px-1 min-w-0">
            {children}
          </div>
        )}

        {/* Output pins */}
        <div className="flex flex-col justify-center py-2 pr-1 min-w-[90px]">
          {outputPins.map((pin) => (
            <TypedHandle key={pin.id} pin={pin} />
          ))}
        </div>
      </div>

      {/* Validation footer */}
      {(hasErrors || hasWarnings) && (
        <div
          className="px-3 py-1.5 text-[10px] flex items-center gap-1"
          style={{
            borderTop: '1px solid var(--node-border)',
            color: hasErrors ? '#ef4444' : '#f59e0b',
            background: hasErrors ? '#ef44440a' : '#f59e0b0a',
          }}
        >
          {hasErrors ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
          {hasErrors
            ? `${data.validation.errors.length} error${data.validation.errors.length > 1 ? 's' : ''}`
            : `${data.validation.warnings.length} warning${data.validation.warnings.length > 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeInner);
