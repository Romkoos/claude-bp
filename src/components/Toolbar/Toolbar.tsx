import { useRef } from 'react';
import {
  ShieldCheck, LayoutGrid, Save, Upload, Trash2, Undo2, Redo2,
  FolderInput, FileArchive, Search, Play, Square, HelpCircle,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from 'zustand';
import { useGraphStore } from '../../store/useGraphStore';
import { downloadJSON } from '../../serialization/jsonExporter';
import { importFromZip } from '../../serialization/fileSystemImporter';
import type { GraphSchema } from '../../types/graph';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const { getViewport, fitView } = useReactFlow();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const exportJSON = useGraphStore((s) => s.exportJSON);
  const importJSON = useGraphStore((s) => s.importJSON);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const runValidation = useGraphStore((s) => s.runValidation);
  const autoLayout = useGraphStore((s) => s.autoLayout);
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const setExportPreviewOpen = useGraphStore((s) => s.setExportPreviewOpen);
  const simulationActive = useGraphStore((s) => s.simulationActive);
  const runSimulation = useGraphStore((s) => s.runSimulation);
  const stopSimulation = useGraphStore((s) => s.stopSimulation);
  const setShortcutsOpen = useGraphStore((s) => s.setShortcutsOpen);

  const canUndo = useStore(useGraphStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(useGraphStore.temporal, (s) => s.futureStates.length > 0);
  const undo = useStore(useGraphStore.temporal, (s) => s.undo);
  const redo = useStore(useGraphStore.temporal, (s) => s.redo);

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

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromZip(file);

      if (result.warnings.length > 0) {
        const msg = 'Import warnings:\n' + result.warnings.map((w) => `- ${w}`).join('\n');
        if (!window.confirm(msg + '\n\nContinue with import?')) return;
      }

      if (nodes.length > 0 || edges.length > 0) {
        if (!window.confirm('This will replace the current graph. Continue?')) return;
      }

      useGraphStore.setState({ nodes: result.nodes, edges: result.edges });
      setTimeout(() => {
        autoLayout('LR');
        setTimeout(() => fitView({ padding: 0.2 }), 400);
      }, 50);
    } catch {
      window.alert('Failed to import ZIP file.');
    }

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
      data-testid="toolbar"
      style={{
        background: '#161b22',
        borderBottom: '1px solid var(--node-border)',
      }}
    >
      {/* Left: Title & stats */}
      <div className="flex items-center gap-2 mr-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Claude Blueprint
          </span>
          <span className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
            {nodes.length} nodes &middot; {edges.length} edges
          </span>
        </div>
      </div>

      <Separator />

      {/* File group */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={Save} label="Save" title="Save (Ctrl+S)" onClick={handleSave} testId="toolbar-save" />
        <ToolbarButton icon={Upload} label="Load" title="Load" onClick={() => fileInputRef.current?.click()} testId="toolbar-load" />
        <ToolbarButton icon={FolderInput} label="Import" title="Import (Ctrl+I)" onClick={() => zipInputRef.current?.click()} testId="toolbar-import" />
        <ToolbarButton icon={FileArchive} label="Export" title="Export (Ctrl+E)" onClick={() => setExportPreviewOpen(true)} testId="toolbar-export" />
      </div>

      <Separator />

      {/* Edit group */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={Undo2} label="Undo" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} testId="toolbar-undo" />
        <ToolbarButton icon={Redo2} label="Redo" title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo} testId="toolbar-redo" />
        <ToolbarButton icon={Trash2} label="Clear" title="Clear" onClick={handleClear} danger testId="toolbar-clear" />
      </div>

      <Separator />

      {/* View group */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={Search} label="Search" title="Search (Ctrl+K)" onClick={() => setSearchOpen(true)} testId="toolbar-search" />
        <ToolbarButton icon={LayoutGrid} label="Layout" title="Auto-layout" onClick={() => autoLayout('LR')} testId="toolbar-layout" />
        <ToolbarButton icon={ShieldCheck} label="Validate" title="Validate" onClick={runValidation} testId="toolbar-validate" />
        <ToolbarButton icon={HelpCircle} label="Help" title="Keyboard Shortcuts (?)" onClick={() => setShortcutsOpen(true)} testId="toolbar-shortcuts" />
      </div>

      <Separator />

      {/* Run group */}
      <div className="flex items-center gap-0.5">
        {simulationActive ? (
          <ToolbarButton icon={Square} label="Stop" title="Stop Simulation" onClick={stopSimulation} danger testId="toolbar-simulate-stop" />
        ) : (
          <ToolbarButton icon={Play} label="Play" title="Run Simulation" onClick={runSimulation} testId="toolbar-simulate" />
        )}
      </div>

      <div className="flex-1" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoad}
        className="hidden"
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip"
        onChange={handleImportZip}
        className="hidden"
      />
    </div>
  );
}

function Separator() {
  return <div className="w-px h-5 mx-2" style={{ background: 'var(--node-border)' }} />;
}

function ToolbarButton({
  icon: Icon,
  label,
  title,
  onClick,
  danger,
  disabled,
  testId,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  title?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      disabled={disabled}
      data-testid={testId}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
      style={{
        color: danger ? '#ef4444' : 'var(--text-secondary)',
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
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
