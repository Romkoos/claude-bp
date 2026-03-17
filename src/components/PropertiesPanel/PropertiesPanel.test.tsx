import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useGraphStore } from '../../store/useGraphStore';
import { ModalProvider } from '../shared/ModalProvider';

function renderWithProvider() {
  return render(
    <ModalProvider>
      <PropertiesPanel />
    </ModalProvider>
  );
}

describe('PropertiesPanel', () => {
  beforeEach(() => {
    useGraphStore.getState().clearGraph();
  });

  it('renders nothing when no node selected', () => {
    const { container } = renderWithProvider();
    expect(container.querySelector('[data-testid="properties-panel"]')).not.toBeInTheDocument();
  });

  it('renders panel when a node is selected', () => {
    useGraphStore.getState().addNode('rules', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    expect(screen.getByText('CLAUDE.md')).toBeInTheDocument();
  });

  it('shows correct type label for skill', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByText('Skill')).toBeInTheDocument();
  });

  it('shows correct type label for hook', () => {
    useGraphStore.getState().addNode('hook', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByText('Hook')).toBeInTheDocument();
  });

  it('shows correct type label for subagent', () => {
    useGraphStore.getState().addNode('subagent', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByText('Subagent')).toBeInTheDocument();
  });

  it('shows correct type label for tool', () => {
    useGraphStore.getState().addNode('tool', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByText('Tool')).toBeInTheDocument();
  });

  it('shows correct type label for mcp', () => {
    useGraphStore.getState().addNode('mcp', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByText('MCP Server')).toBeInTheDocument();
  });

  it('shows correct type label for plugin', () => {
    useGraphStore.getState().addNode('plugin', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByText('Plugin')).toBeInTheDocument();
  });

  it('updates label on input change', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    const input = screen.getByDisplayValue('New Skill');
    fireEvent.change(input, { target: { value: 'My Skill' } });
    expect(useGraphStore.getState().nodes[0].data.label).toBe('My Skill');
  });

  it('shows delete button', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    const nodeId = useGraphStore.getState().nodes[0].id;
    useGraphStore.getState().selectNode(nodeId);
    renderWithProvider();
    expect(screen.getByTestId('delete-node-button')).toBeInTheDocument();
  });
});
