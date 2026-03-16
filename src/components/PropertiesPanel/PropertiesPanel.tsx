import { FileText, Zap, Bot, Webhook, Wrench, Plug, Package, Trash2, type LucideIcon } from 'lucide-react';
import type { BlueprintNodeType } from '../../types/nodes';
import { NODE_COLORS } from '../../constants/theme';
import { useGraphStore } from '../../store/useGraphStore';
import { RulesEditor } from './RulesEditor';
import { SkillEditor } from './SkillEditor';
import { SubagentEditor } from './SubagentEditor';
import { HookEditor } from './HookEditor';
import { ToolEditor } from './ToolEditor';
import { McpEditor } from './McpEditor';
import { PluginEditor } from './PluginEditor';

const NODE_ICONS: Record<BlueprintNodeType, LucideIcon> = {
  rules: FileText,
  skill: Zap,
  subagent: Bot,
  hook: Webhook,
  tool: Wrench,
  mcp: Plug,
  plugin: Package,
};

const NODE_TYPE_LABELS: Record<BlueprintNodeType, string> = {
  rules: 'CLAUDE.md',
  skill: 'Skill',
  subagent: 'Subagent',
  hook: 'Hook',
  tool: 'Tool',
  mcp: 'MCP Server',
  plugin: 'Plugin',
};

export function PropertiesPanel() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const nodes = useGraphStore((s) => s.nodes);
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const deleteNode = useGraphStore((s) => s.deleteNode);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const nodeType = node.type as BlueprintNodeType;
  const Icon = NODE_ICONS[nodeType];
  const colors = NODE_COLORS[nodeType];
  const data = node.data as Record<string, unknown>;
  const label = data.label as string;

  const handleDelete = () => {
    if (window.confirm(`Delete "${label}"?`)) {
      deleteNode(node.id);
    }
  };

  return (
    <div
      className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: '#161b22',
        borderLeft: '1px solid var(--node-border)',
      }}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--node-border)' }}>
        <Icon size={16} style={{ color: colors.header }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {NODE_TYPE_LABELS[nodeType]}
          </div>
          <input
            value={label}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            className="bg-transparent border-none outline-none text-sm font-medium w-full p-0"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-3">
        {nodeType === 'rules' && <RulesEditor nodeId={node.id} data={data} />}
        {nodeType === 'skill' && <SkillEditor nodeId={node.id} data={data} />}
        {nodeType === 'subagent' && <SubagentEditor nodeId={node.id} data={data} />}
        {nodeType === 'hook' && <HookEditor nodeId={node.id} data={data} />}
        {nodeType === 'tool' && <ToolEditor nodeId={node.id} data={data} />}
        {nodeType === 'mcp' && <McpEditor nodeId={node.id} data={data} />}
        {nodeType === 'plugin' && <PluginEditor nodeId={node.id} data={data} />}
      </div>

      {/* Delete button */}
      <div className="p-3" style={{ borderTop: '1px solid var(--node-border)' }}>
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-colors"
          style={{
            color: '#ef4444',
            background: '#ef44441a',
            border: '1px solid #ef444430',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#ef444430'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#ef44441a'; }}
        >
          <Trash2 size={12} />
          Delete Node
        </button>
      </div>
    </div>
  );
}
