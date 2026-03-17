import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutsOverlay } from './ShortcutsOverlay';

describe('ShortcutsOverlay', () => {
  it('renders nothing when not open', () => {
    render(<ShortcutsOverlay isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('shortcuts-overlay')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(<ShortcutsOverlay isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId('shortcuts-overlay')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('shows shortcut groups', () => {
    render(<ShortcutsOverlay isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Canvas')).toBeInTheDocument();
    expect(screen.getByText('Nodes')).toBeInTheDocument();
    // 'Export' appears as both group title and shortcut description
    expect(screen.getAllByText('Export').length).toBeGreaterThanOrEqual(1);
  });

  it('shows individual shortcuts', () => {
    render(<ShortcutsOverlay isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Z')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('shortcuts-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
