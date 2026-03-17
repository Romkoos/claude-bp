import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubagentEditor } from './SubagentEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createSubagentData } from '../../constants/nodeDefaults';

describe('SubagentEditor', () => {
  const nodeId = 'test-subagent';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'subagent', position: { x: 0, y: 0 }, data: createSubagentData() },
    ]);
  });

  it('renders subagent editor', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('subagent-editor')).toBeInTheDocument();
  });

  it('shows agent type selector', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-subagent-agent-type')).toBeInTheDocument();
  });

  it('shows system prompt field', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-subagent-system-prompt')).toBeInTheDocument();
  });

  it('updates name on change', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('Agent name...');
    fireEvent.change(input, { target: { value: 'Code Reviewer' } });
    expect(useGraphStore.getState().nodes[0].data.name).toBe('Code Reviewer');
  });

  it('updates system prompt on change', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    const textarea = screen.getByPlaceholderText('System prompt...');
    fireEvent.change(textarea, { target: { value: 'Review code carefully' } });
    expect(useGraphStore.getState().nodes[0].data.systemPrompt).toBe('Review code carefully');
  });

  it('updates description on change', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    const textarea = screen.getByPlaceholderText('What this agent does...');
    fireEvent.change(textarea, { target: { value: 'Reviews PRs' } });
    expect(useGraphStore.getState().nodes[0].data.description).toBe('Reviews PRs');
  });
});
