import { HelpCircle } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';

export function StatusBar() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const configName = useGraphStore((s) => s.configName);
  const validationResults = useGraphStore((s) => s.validationResults);
  const setShortcutsOpen = useGraphStore((s) => s.setShortcutsOpen);

  const errors = validationResults.filter((r) => r.level === 'error').length;
  const warnings = validationResults.filter((r) => r.level === 'warning').length;

  return (
    <div
      className="h-7 flex items-center px-4 flex-shrink-0 text-[11px]"
      data-testid="status-bar"
      style={{
        background: '#161b22',
        borderTop: '1px solid var(--node-border)',
      }}
    >
      <div style={{ color: 'var(--text-muted)' }}>
        Nodes: {nodes.length} &nbsp;|&nbsp; Edges: {edges.length}
      </div>
      <div className="flex-1 text-center" style={{ color: 'var(--text-muted)' }}>
        {configName}
      </div>
      <div
        title={
          errors === 0 && warnings === 0
            ? undefined
            : validationResults.map((r) => `[${r.level}] ${r.message}`).join('\n')
        }
      >
        {errors === 0 && warnings === 0 ? (
          <span style={{ color: '#22c55e' }}>Valid</span>
        ) : (
          <span>
            {errors > 0 && <span style={{ color: '#ef4444' }}>{errors} error{errors > 1 ? 's' : ''}</span>}
            {errors > 0 && warnings > 0 && <span style={{ color: 'var(--text-muted)' }}>, </span>}
            {warnings > 0 && <span style={{ color: '#f59e0b' }}>{warnings} warning{warnings > 1 ? 's' : ''}</span>}
          </span>
        )}
      </div>
      <button
        onClick={() => setShortcutsOpen(true)}
        title="Keyboard shortcuts"
        className="ml-2 p-0.5 rounded hover:bg-white/10 transition-colors"
        style={{ color: 'var(--text-muted)', lineHeight: 0 }}
      >
        <HelpCircle size={13} />
      </button>
    </div>
  );
}
