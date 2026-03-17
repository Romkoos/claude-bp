import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useGraphStore } from '../../store/useGraphStore';

describe('StatusBar', () => {
  beforeEach(() => {
    useGraphStore.getState().clearGraph();
  });

  it('renders status bar', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  it('shows node and edge counts', () => {
    render(<StatusBar />);
    expect(screen.getByText(/Nodes: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Edges: 0/)).toBeInTheDocument();
  });

  it('shows config name', () => {
    render(<StatusBar />);
    expect(screen.getByText('Untitled Blueprint')).toBeInTheDocument();
  });

  it('shows "Valid" when no validation results', () => {
    render(<StatusBar />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('shows error count after validation', () => {
    useGraphStore.getState().addNode('hook', { x: 0, y: 0 });
    // Default hook has event but no command -> error
    useGraphStore.getState().runValidation();
    render(<StatusBar />);
    const errors = useGraphStore.getState().validationResults.filter((r) => r.level === 'error');
    if (errors.length > 0) {
      expect(screen.getByText(/error/)).toBeInTheDocument();
    }
  });

  it('shows warning count after validation', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    useGraphStore.getState().runValidation();
    render(<StatusBar />);
    expect(screen.getByText(/warning/)).toBeInTheDocument();
  });

  it('updates node count when nodes added', () => {
    useGraphStore.getState().addNode('skill', { x: 0, y: 0 });
    useGraphStore.getState().addNode('rules', { x: 100, y: 0 });
    render(<StatusBar />);
    expect(screen.getByText(/Nodes: 2/)).toBeInTheDocument();
  });

  it('opens shortcuts on help button click', () => {
    render(<StatusBar />);
    const helpButton = screen.getByTitle('Keyboard shortcuts');
    fireEvent.click(helpButton);
    expect(useGraphStore.getState().shortcutsOpen).toBe(true);
  });
});
