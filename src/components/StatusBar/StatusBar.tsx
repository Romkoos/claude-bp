import { useGraphStore } from '../../store/useGraphStore';

export function StatusBar() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const configName = useGraphStore((s) => s.configName);
  const validationResults = useGraphStore((s) => s.validationResults);

  const errors = validationResults.filter((r) => r.level === 'error').length;
  const warnings = validationResults.filter((r) => r.level === 'warning').length;

  return (
    <div
      className="h-7 flex items-center px-4 flex-shrink-0 text-[11px]"
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
      <div>
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
    </div>
  );
}
