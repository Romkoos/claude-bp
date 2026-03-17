import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolEditor } from './ToolEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createToolData } from '../../constants/nodeDefaults';

describe('ToolEditor', () => {
  const nodeId = 'test-tool';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'tool', position: { x: 0, y: 0 }, data: createToolData() },
    ]);
  });

  it('renders tool editor', () => {
    render(<ToolEditor nodeId={nodeId} data={createToolData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('tool-editor')).toBeInTheDocument();
  });

  it('shows tool name selector', () => {
    render(<ToolEditor nodeId={nodeId} data={createToolData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-tool-name')).toBeInTheDocument();
  });

  it('shows pattern field', () => {
    render(<ToolEditor nodeId={nodeId} data={createToolData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-tool-pattern')).toBeInTheDocument();
  });

  it('shows builtin checkbox', () => {
    render(<ToolEditor nodeId={nodeId} data={createToolData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-tool-builtin')).toBeInTheDocument();
  });

  it('updates pattern on change', () => {
    render(<ToolEditor nodeId={nodeId} data={createToolData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('No restriction');
    fireEvent.change(input, { target: { value: 'npm:*' } });
    expect(useGraphStore.getState().nodes[0].data.pattern).toBe('npm:*');
  });

  it('shows custom tool name field for unknown tools', () => {
    const data = { ...createToolData(), toolName: 'MyCustomTool' };
    render(<ToolEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByPlaceholderText('Enter tool name...')).toBeInTheDocument();
  });
});
