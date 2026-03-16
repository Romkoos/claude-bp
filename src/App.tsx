import { ReactFlowProvider } from '@xyflow/react';
import { CANVAS_BG } from './constants/theme';
import { useGraphStore } from './store/useGraphStore';
import { Toolbar } from './components/Toolbar/Toolbar';
import { NodePalette } from './components/Palette/NodePalette';
import { BlueprintCanvas } from './components/Canvas/BlueprintCanvas';
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel';
import { StatusBar } from './components/StatusBar/StatusBar';

function App() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

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
      </div>
    </ReactFlowProvider>
  );
}

export default App;
