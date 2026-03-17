import { useState, useRef, useCallback } from 'react';
import { FileText, Zap, Bot, Webhook, Wrench, Plug, Package, StickyNote, Info, type LucideIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { BlueprintNodeType } from '../../types/nodes';
import { NODE_COLORS } from '../../constants/theme';
import { TEMPLATES } from '../../constants/templates';
import { useGraphStore } from '../../store/useGraphStore';
import { useModal } from '../shared/useModal';
import { NodeInfoPopover } from './NodeInfoPopover';

const TEMPLATE_TEST_IDS: Record<string, string> = {
  'pr-review': 'template-pr-review',
  'multi-research': 'template-multi-research',
  'safe-deploy': 'template-safe-deploy',
  'starter': 'template-starter',
};

interface PaletteItem {
  type: BlueprintNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'rules', label: 'CLAUDE.md', description: 'Project-level rules and context', icon: FileText },
  { type: 'skill', label: 'Skill', description: 'On-demand skill with instructions', icon: Zap },
  { type: 'subagent', label: 'Subagent', description: 'Isolated worker with system prompt', icon: Bot },
  { type: 'hook', label: 'Hook', description: 'Lifecycle event interceptor', icon: Webhook },
  { type: 'tool', label: 'Tool', description: 'Atomic tool unit (Read, Write, Bash, etc.)', icon: Wrench },
  { type: 'mcp', label: 'MCP Server', description: 'External service via MCP protocol', icon: Plug },
  { type: 'plugin', label: 'Plugin', description: 'Bundle container for skills, agents, hooks', icon: Package },
];

export function NodePalette() {
  const importJSON = useGraphStore((s) => s.importJSON);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const { fitView } = useReactFlow();
  const modal = useModal();
  const [infoOpen, setInfoOpen] = useState<BlueprintNodeType | null>(null);
  const infoButtonRefs = useRef<Map<BlueprintNodeType, HTMLButtonElement>>(new Map());
  const setInfoButtonRef = useCallback((type: BlueprintNodeType, el: HTMLButtonElement | null) => {
    if (el) infoButtonRefs.current.set(type, el);
    else infoButtonRefs.current.delete(type);
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: BlueprintNodeType) => {
    event.dataTransfer.setData('application/blueprint-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const loadTemplate = async (template: typeof TEMPLATES[0]) => {
    if (nodes.length > 0 || edges.length > 0) {
      if (!await modal.confirm({ title: 'Load Template', message: `Load "${template.name}"? This will replace the current graph.`, danger: true, confirmLabel: 'Load' })) return;
    }
    importJSON({
      version: '1.0.0',
      metadata: {
        name: template.name,
        description: template.description,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      nodes: template.graph.nodes,
      edges: template.graph.edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  return (
    <div
      data-testid="node-palette"
      className="w-60 flex-shrink-0 overflow-y-auto"
      style={{
        background: '#161b22',
        borderRight: '1px solid var(--node-border)',
      }}
    >
      <div className="p-3">
        <h3
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Nodes
        </h3>
        <div className="space-y-2">
          {PALETTE_ITEMS.map(({ type, label, description, icon: Icon }) => {
            const colors = NODE_COLORS[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                data-testid={`palette-node-${type}`}
                className="rounded-lg cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                style={{
                  background: 'var(--node-bg)',
                  border: '1px solid var(--node-border)',
                  borderLeft: `3px solid ${colors.header}`,
                }}
              >
                <div className="p-2.5 flex items-start gap-2.5">
                  <Icon size={16} data-testid="palette-color-indicator" style={{ color: colors.header, marginTop: 1, flexShrink: 0 }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {label}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {description}
                    </div>
                  </div>
                  <button
                    ref={(el) => setInfoButtonRef(type, el)}
                    data-testid={`palette-info-${type}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setInfoOpen(infoOpen === type ? null : type);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    className="p-0.5 rounded hover:bg-[var(--node-border)] transition-colors flex-shrink-0 cursor-pointer"
                    style={{ color: infoOpen === type ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    <Info size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {infoOpen && infoOpen !== 'comment' && (
            <NodeInfoPopover
              nodeType={infoOpen}
              anchorRef={{ current: infoButtonRefs.current.get(infoOpen) ?? null }}
              onClose={() => setInfoOpen(null)}
            />
          )}
        </div>

        <div className="mt-4 mb-4" style={{ borderTop: '1px solid var(--node-border)' }} />

        <h3
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Notes
        </h3>
        <div className="space-y-2">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'comment')}
            data-testid="palette-node-comment"
            className="rounded-lg cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
            style={{
              background: 'var(--node-bg)',
              border: '1px solid var(--node-border)',
              borderLeft: '3px solid #eab308',
            }}
          >
            <div className="p-2.5 flex items-start gap-2.5">
              <StickyNote size={16} data-testid="palette-color-indicator" style={{ color: '#eab308', marginTop: 1, flexShrink: 0 }} />
              <div className="min-w-0">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Note
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Freeform annotation or reminder
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3
          className="text-[10px] font-semibold uppercase tracking-widest mt-6 mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Templates
        </h3>
        <div className="space-y-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => loadTemplate(template)}
              data-testid={TEMPLATE_TEST_IDS[template.id]}
              className="w-full text-left rounded-lg transition-all hover:scale-[1.02] cursor-pointer"
              style={{
                background: 'var(--node-bg)',
                border: '1px solid var(--node-border)',
                padding: 0,
              }}
            >
              <div className="p-2.5 flex items-start gap-2.5">
                <span className="text-base flex-shrink-0" style={{ marginTop: 1 }}>
                  {template.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {template.name}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {template.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
