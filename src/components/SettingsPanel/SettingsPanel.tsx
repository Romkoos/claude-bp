import { Settings, X } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';

export function SettingsPanel() {
  const showMinimap = useGraphStore((s) => s.showMinimap);
  const setShowMinimap = useGraphStore((s) => s.setShowMinimap);
  const setSettingsOpen = useGraphStore((s) => s.setSettingsOpen);

  return (
    <div
      data-testid="settings-panel"
      className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: '#161b22',
        borderLeft: '1px solid var(--node-border)',
      }}
    >
      {/* Header */}
      <div
        className="p-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--node-border)' }}
      >
        <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
        <span
          className="flex-1 text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </span>
        <button
          onClick={() => setSettingsOpen(false)}
          data-testid="settings-close"
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Canvas section */}
        <div className="mb-4">
          <h3
            className="text-[10px] uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Canvas
          </h3>

          {/* Minimap toggle */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Show minimap
            </span>
            <button
              data-testid="toggle-minimap"
              onClick={() => setShowMinimap(!showMinimap)}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{
                background: showMinimap ? '#3b82f6' : '#2d333b',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{
                  transform: showMinimap ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
