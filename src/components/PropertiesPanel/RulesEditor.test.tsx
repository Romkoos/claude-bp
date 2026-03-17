import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RulesEditor } from './RulesEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createRulesData } from '../../constants/nodeDefaults';

describe('RulesEditor', () => {
  const nodeId = 'test-rules';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'rules', position: { x: 0, y: 0 }, data: createRulesData() },
    ]);
  });

  it('renders rules editor', () => {
    render(<RulesEditor nodeId={nodeId} data={createRulesData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('rules-editor')).toBeInTheDocument();
  });

  it('shows scope selector', () => {
    render(<RulesEditor nodeId={nodeId} data={createRulesData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-rules-scope')).toBeInTheDocument();
  });

  it('shows content editor', () => {
    render(<RulesEditor nodeId={nodeId} data={createRulesData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-rules-content')).toBeInTheDocument();
  });

  it('changes scope to subfolder shows path field', () => {
    const data = { ...createRulesData(), scope: 'subfolder' as const, path: 'src' };
    render(<RulesEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByPlaceholderText('e.g. src/components')).toBeInTheDocument();
  });

  it('updates content on change', () => {
    render(<RulesEditor nodeId={nodeId} data={createRulesData() as unknown as Record<string, unknown>} />);
    const textarea = screen.getByPlaceholderText('Rules content...');
    fireEvent.change(textarea, { target: { value: '# New Rules' } });
    expect(useGraphStore.getState().nodes[0].data.content).toBe('# New Rules');
  });
});
