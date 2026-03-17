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

  it('shows permission mode selector', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-subagent-permission-mode')).toBeInTheDocument();
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
    const textarea = screen.getByPlaceholderText('When Claude should delegate to this subagent...');
    fireEvent.change(textarea, { target: { value: 'Reviews PRs' } });
    expect(useGraphStore.getState().nodes[0].data.description).toBe('Reviews PRs');
  });

  it('shows bypassPermissions warning when selected', () => {
    const data = { ...createSubagentData(), permissionMode: 'bypassPermissions' as const };
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'subagent', position: { x: 0, y: 0 }, data },
    ]);
    render(<SubagentEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('bypass-permissions-warning')).toBeInTheDocument();
    expect(screen.getByTestId('bypass-permissions-warning').textContent).toContain('extreme caution');
  });

  it('does not show bypassPermissions warning for other modes', () => {
    const data = { ...createSubagentData(), permissionMode: 'default' as const };
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'subagent', position: { x: 0, y: 0 }, data },
    ]);
    render(<SubagentEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.queryByTestId('bypass-permissions-warning')).toBeNull();
  });

  it('shows background checkbox', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-subagent-background')).toBeInTheDocument();
  });

  it('shows isolation selector', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-subagent-isolation')).toBeInTheDocument();
  });

  it('shows model selector with correct options', () => {
    render(<SubagentEditor nodeId={nodeId} data={createSubagentData() as unknown as Record<string, unknown>} />);
    const select = screen.getByTestId('field-subagent-model');
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll('option')).toHaveLength(4); // inherit, sonnet, opus, haiku
  });
});
