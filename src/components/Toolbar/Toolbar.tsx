import { useRef } from 'react';
import { ShieldCheck, LayoutGrid, Save, Upload, Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../../store/useGraphStore';
import { downloadJSON } from '../../serialization/jsonExporter';
import type { GraphSchema } from '../../types/graph';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getViewport, fitView } = useReactFlow();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const exportJSON = useGraphStore((s) => s.exportJSON);
  const importJSON = useGraphStore((s) => s.importJSON);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const runValidation = useGraphStore((s) => s.runValidation);

  const handleSave = () => {
    const graph = exportJSON(getViewport());
    downloadJSON(graph);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const schema = JSON.parse(json) as GraphSchema;
        if (schema.version && schema.nodes && schema.edges) {
          importJSON(schema);
          setTimeout(() => fitView({ padding: 0.2 }), 100);
        }
      } catch {
        // ignore invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (nodes.length === 0 && edges.length === 0) return;
    if (window.confirm('Clear the entire canvas? This cannot be undone.')) {
      clearGraph();
    }
  };

  return (
    <div
      className="h-11 flex items-center px-4 flex-shrink-0"
      style={{
        background: '#161b22',
        borderBottom: '1px solid var(--node-border)',
      }}
    >
      {/* Left: Title */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Claude Blueprint
        </span>
      </div>

      {/* Center: Counts */}
      <div className="flex-1 flex justify-center">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {nodes.length} nodes &middot; {edges.length} edges
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <ToolbarButton icon={ShieldCheck} label="Validate" onClick={runValidation} />
        <ToolbarButton icon={LayoutGrid} label="Auto-layout" onClick={() => {}} />
        <ToolbarButton icon={Save} label="Save" onClick={handleSave} />
        <ToolbarButton icon={Upload} label="Load" onClick={() => fileInputRef.current?.click()} />
        <ToolbarButton icon={Trash2} label="Clear" onClick={handleClear} danger />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoad}
        className="hidden"
      />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
      style={{ color: danger ? '#ef4444' : 'var(--text-secondary)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--node-border)';
        if (!danger) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = danger ? '#ef4444' : 'var(--text-secondary)';
      }}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
