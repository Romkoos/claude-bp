import { FileText, Zap, Bot, Webhook, Wrench, Plug, Package, type LucideIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { BlueprintNodeType } from '../../types/nodes';
import { NODE_COLORS } from '../../constants/theme';
import { TEMPLATES } from '../../constants/templates';
import { useGraphStore } from '../../store/useGraphStore';

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
  const { fitView } = useReactFlow();

  const onDragStart = (event: React.DragEvent, nodeType: BlueprintNodeType) => {
    event.dataTransfer.setData('application/blueprint-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    if (!window.confirm(`Load "${template.name}"? This will replace the current graph.`)) return;
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
                className="rounded-lg cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                style={{
                  background: 'var(--node-bg)',
                  border: '1px solid var(--node-border)',
                  borderLeft: `3px solid ${colors.header}`,
                }}
              >
                <div className="p-2.5 flex items-start gap-2.5">
                  <Icon size={16} style={{ color: colors.header, marginTop: 1, flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {label}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
