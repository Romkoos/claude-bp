import { memo, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, type LucideIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
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
  minWidth?: number;
  dashed?: boolean;
}

function BaseNodeInner({ id, nodeType, data, pins, icon: Icon, children, selected, minWidth = 240, dashed = false }: BaseNodeProps) {
  const { fitView } = useReactFlow();
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const simulationHighlightedNodeId = useGraphStore((s) => s.simulationHighlightedNodeId);
  const isSimHighlighted = simulationHighlightedNodeId === id;
  const colors = NODE_COLORS[nodeType];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(data.label); }, [data.label]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== data.label) {
      updateNodeData(id, { label: trimmed });
    } else {
      setDraft(data.label);
    }
  }, [draft, data.label, id, updateNodeData]);
  const inputPins = pins.filter((p) => p.direction === PinDirection.In);
  const outputPins = pins.filter((p) => p.direction === PinDirection.Out);
  const hasErrors = data.validation.errors.length > 0;
  const hasWarnings = data.validation.warnings.length > 0;

  return (
    <div
      className={`blueprint-node rounded-lg overflow-hidden${isSimHighlighted ? ' simulation-active' : ''}`}
      style={{
        background: 'var(--node-bg)',
        border: `1px ${dashed ? 'dashed' : 'solid'} ${selected ? colors.header : 'var(--node-border)'}`,
        boxShadow: selected ? `0 0 20px ${colors.glow}` : undefined,
        minWidth: data.collapsed ? undefined : minWidth,
        maxWidth: 360,
        ...(isSimHighlighted ? { '--glow-color': colors.header } as React.CSSProperties : {}),
      }}
    >
      {/* Header stripe */}
      <div data-testid="node-header-stripe" style={{ height: 2, background: colors.header }} />

      {/* Header row */}
      <div
        data-testid="node-header"
        className="flex items-center gap-1.5 px-2 py-1"
        style={{ borderBottom: '1px solid var(--node-border)' }}
      >
        <span
          data-testid="node-icon"
          onDoubleClick={() => {
            fitView({ nodes: [{ id }], padding: 0.5, duration: 300 });
          }}
        >
          <Icon size={14} style={{ color: colors.header }} />
        </span>
        {editing ? (
          <input
            ref={inputRef}
            data-testid="node-label-input"
            className="text-xs font-medium flex-1 min-w-0 bg-transparent border-none outline-none p-0 nopan nodrag"
            style={{ color: 'var(--text-primary)' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') { setDraft(data.label); setEditing(false); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            data-testid="node-label"
            className="text-xs font-medium flex-1 truncate cursor-text"
            style={{ color: 'var(--text-primary)' }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {data.label}
          </span>
        )}
        {hasErrors && <AlertCircle size={14} style={{ color: '#ef4444' }} title={data.validation.errors.join('\n')} />}
        {!hasErrors && hasWarnings && <AlertTriangle size={14} style={{ color: '#f59e0b' }} title={data.validation.warnings.join('\n')} />}
        <button
          data-testid="collapse-toggle"
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
        <div className="flex flex-col justify-center py-1 pl-1 min-w-[70px]">
          {inputPins.map((pin) => (
            <TypedHandle key={pin.id} pin={pin} />
          ))}
        </div>

        {/* Content */}
        {!data.collapsed && children && (
          <div data-testid="node-expanded-content" className="flex-1 py-1 px-1 min-w-0">
            {children}
          </div>
        )}

        {/* Spacer when collapsed to keep pins at edges */}
        {data.collapsed && <div className="flex-1" />}

        {/* Output pins */}
        <div className="flex flex-col justify-center py-1 pr-1 min-w-[70px]">
          {outputPins.map((pin) => (
            <TypedHandle key={pin.id} pin={pin} />
          ))}
        </div>
      </div>

      {/* Validation footer */}
      {(hasErrors || hasWarnings) && (
        <div
          className="px-2 py-1 text-[10px] flex flex-col gap-0.5"
          data-testid={hasErrors ? 'validation-error-badge' : 'validation-warning-badge'}
          style={{
            borderTop: '1px solid var(--node-border)',
            background: hasErrors ? '#ef44440a' : '#f59e0b0a',
          }}
        >
          {data.validation.errors.map((msg, i) => (
            <div key={`e-${i}`} className="flex items-start gap-1" style={{ color: '#ef4444' }}>
              <AlertCircle size={10} className="mt-[1px] shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
          {data.validation.warnings.map((msg, i) => (
            <div key={`w-${i}`} className="flex items-start gap-1" style={{ color: '#f59e0b' }}>
              <AlertTriangle size={10} className="mt-[1px] shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeInner);
