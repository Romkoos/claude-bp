import { ReactFlowProvider } from '@xyflow/react';
import { CANVAS_BG } from './constants/theme';
import { useGraphStore } from './store/useGraphStore';
import { Toolbar } from './components/Toolbar/Toolbar';
import { NodePalette } from './components/Palette/NodePalette';
import { BlueprintCanvas } from './components/Canvas/BlueprintCanvas';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { ExportPreview } from './components/ExportPreview/ExportPreview';
import { SearchOverlay } from './components/Search/SearchOverlay';
import { ShortcutsOverlay } from './components/shared/ShortcutsOverlay';

function App() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const exportPreviewOpen = useGraphStore((s) => s.exportPreviewOpen);
  const searchOpen = useGraphStore((s) => s.searchOpen);
  const shortcutsOpen = useGraphStore((s) => s.shortcutsOpen);
  const setExportPreviewOpen = useGraphStore((s) => s.setExportPreviewOpen);
  const setSearchOpen = useGraphStore((s) => s.setSearchOpen);
  const setShortcutsOpen = useGraphStore((s) => s.setShortcutsOpen);

  return (
    <ReactFlowProvider>
      <div
        className="h-screen w-screen flex flex-col"
        style={{ background: CANVAS_BG, fontFamily: "'Inter', sans-serif" }}
      >
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <BlueprintCanvas />
          {selectedNodeId && <PropertiesPanel />}
        </div>
        <StatusBar />
        <ExportPreview isOpen={exportPreviewOpen} onClose={() => setExportPreviewOpen(false)} />
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <ShortcutsOverlay isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
