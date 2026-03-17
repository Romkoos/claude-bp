import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../test/xyflow-mock';
import { NodePalette } from './NodePalette';
import { useGraphStore } from '../../store/useGraphStore';
import { ModalContext } from '../shared/useModal';

const mockModal = {
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn().mockResolvedValue(undefined),
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ModalContext.Provider value={mockModal}>
      {ui}
    </ModalContext.Provider>
  );
}

describe('NodePalette', () => {
  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setPaletteCollapsed(false);
  });

  it('renders expanded palette by default', () => {
    renderWithProviders(<NodePalette />);
    expect(screen.getByTestId('node-palette')).toBeInTheDocument();
    expect(screen.getByText('Nodes')).toBeInTheDocument();
    expect(screen.getByTestId('node-palette').getAttribute('data-collapsed')).toBeNull();
  });

  it('renders all node types in expanded view', () => {
    renderWithProviders(<NodePalette />);
    expect(screen.getByTestId('palette-node-rules')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-skill')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-subagent')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-hook')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-tool')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-mcp')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-plugin')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-comment')).toBeInTheDocument();
  });

  it('collapses when toggle button is clicked', () => {
    renderWithProviders(<NodePalette />);
    fireEvent.click(screen.getByTestId('palette-toggle'));
    expect(useGraphStore.getState().paletteCollapsed).toBe(true);
  });

  it('renders collapsed palette with data-collapsed attribute', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    expect(screen.getByTestId('node-palette').getAttribute('data-collapsed')).toBe('true');
  });

  it('renders all node types in collapsed view', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    expect(screen.getByTestId('palette-node-rules')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-skill')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-subagent')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-hook')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-tool')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-mcp')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-plugin')).toBeInTheDocument();
    expect(screen.getByTestId('palette-node-comment')).toBeInTheDocument();
  });

  it('hides labels and descriptions in collapsed view', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    expect(screen.queryByText('Nodes')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Templates')).not.toBeInTheDocument();
  });

  it('expands when toggle button is clicked in collapsed view', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    fireEvent.click(screen.getByTestId('palette-toggle'));
    expect(useGraphStore.getState().paletteCollapsed).toBe(false);
  });

  it('has narrower width when collapsed', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    const palette = screen.getByTestId('node-palette');
    expect(palette.style.width).toBe('48px');
  });

  it('renders template buttons in collapsed view', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    expect(screen.getByTestId('template-pr-review')).toBeInTheDocument();
    expect(screen.getByTestId('template-multi-research')).toBeInTheDocument();
    expect(screen.getByTestId('template-safe-deploy')).toBeInTheDocument();
    expect(screen.getByTestId('template-starter')).toBeInTheDocument();
  });

  it('nodes are draggable in collapsed view', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    const skillNode = screen.getByTestId('palette-node-skill');
    expect(skillNode.getAttribute('draggable')).toBe('true');
  });

  it('shows tooltip titles in collapsed view', () => {
    useGraphStore.getState().setPaletteCollapsed(true);
    renderWithProviders(<NodePalette />);
    const skillNode = screen.getByTestId('palette-node-skill');
    expect(skillNode.getAttribute('title')).toBe('Skill');
  });
});
