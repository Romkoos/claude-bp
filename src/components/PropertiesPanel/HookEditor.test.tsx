import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HookEditor } from './HookEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createHookData } from '../../constants/nodeDefaults';

describe('HookEditor', () => {
  const nodeId = 'test-hook';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'hook', position: { x: 0, y: 0 }, data: createHookData() },
    ]);
  });

  it('renders hook editor', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('hook-editor')).toBeInTheDocument();
  });

  it('shows event selector', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-hook-event')).toBeInTheDocument();
  });

  it('shows matcher input', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-hook-matcher')).toBeInTheDocument();
  });

  it('shows command input', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-hook-command')).toBeInTheDocument();
  });

  it('shows decision selector', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-hook-decision')).toBeInTheDocument();
  });

  it('updates command on change', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText("echo 'hook fired'");
    fireEvent.change(input, { target: { value: 'npm test' } });
    expect(useGraphStore.getState().nodes[0].data.command).toBe('npm test');
  });

  it('shows reason field when decision is not none', () => {
    const data = { ...createHookData(), decision: { type: 'deny' as const, reason: '', modifyInput: false } };
    render(<HookEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByPlaceholderText('Reason for decision...')).toBeInTheDocument();
  });

  it('hides reason field when decision is none', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    expect(screen.queryByPlaceholderText('Reason for decision...')).not.toBeInTheDocument();
  });

  it('updates event on change', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    const select = screen.getByTestId('field-hook-event').querySelector('select')!;
    fireEvent.change(select, { target: { value: 'SessionStart' } });
    expect(useGraphStore.getState().nodes[0].data.event).toBe('SessionStart');
  });

  it('updates matcher on change', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    const input = screen.getByTestId('field-hook-matcher').querySelector('input')!;
    fireEvent.change(input, { target: { value: 'Bash' } });
    expect(useGraphStore.getState().nodes[0].data.matcher).toBe('Bash');
  });

  it('updates hook type on change', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects[1]; // Second select is hook type
    fireEvent.change(typeSelect, { target: { value: 'http' } });
    expect(useGraphStore.getState().nodes[0].data.hookType).toBe('http');
  });

  it('updates timeout on change', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    const input = screen.getByDisplayValue('60000');
    fireEvent.change(input, { target: { value: '5000' } });
    expect(useGraphStore.getState().nodes[0].data.timeoutMs).toBe(5000);
  });

  it('shows modify input checkbox when decision is not none', () => {
    const data = { ...createHookData(), decision: { type: 'deny' as const, reason: '', modifyInput: false } };
    render(<HookEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByText('Modify input')).toBeInTheDocument();
  });

  it('shows inject system message after expanding Advanced section', () => {
    render(<HookEditor nodeId={nodeId} data={createHookData() as unknown as Record<string, unknown>} />);
    // Advanced section is collapsed by default
    const advancedToggle = screen.getByText('Advanced');
    fireEvent.click(advancedToggle);
    expect(screen.getByPlaceholderText('System message to inject...')).toBeInTheDocument();
    expect(screen.getByText('Continue after hook')).toBeInTheDocument();
  });
});
