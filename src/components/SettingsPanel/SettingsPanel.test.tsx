import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { useGraphStore } from '../../store/useGraphStore';

describe('SettingsPanel', () => {
  beforeEach(() => {
    useGraphStore.setState({ settingsOpen: true, showMinimap: true });
  });

  it('renders settings panel', () => {
    render(<SettingsPanel />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows minimap toggle', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Show minimap')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-minimap')).toBeInTheDocument();
  });

  it('toggles minimap', () => {
    render(<SettingsPanel />);
    expect(useGraphStore.getState().showMinimap).toBe(true);
    fireEvent.click(screen.getByTestId('toggle-minimap'));
    expect(useGraphStore.getState().showMinimap).toBe(false);
    fireEvent.click(screen.getByTestId('toggle-minimap'));
    expect(useGraphStore.getState().showMinimap).toBe(true);
  });

  it('closes settings panel', () => {
    render(<SettingsPanel />);
    fireEvent.click(screen.getByTestId('settings-close'));
    expect(useGraphStore.getState().settingsOpen).toBe(false);
  });

  it('shows Canvas section header', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Canvas')).toBeInTheDocument();
  });
});
