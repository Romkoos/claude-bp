import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginEditor } from './PluginEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createPluginData, createSkillData } from '../../constants/nodeDefaults';

describe('PluginEditor', () => {
  const nodeId = 'test-plugin';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'plugin', position: { x: 0, y: 0 }, data: createPluginData() },
    ]);
  });

  it('renders plugin editor with empty children message', () => {
    render(<PluginEditor nodeId={nodeId} data={createPluginData() as unknown as Record<string, unknown>} />);
    expect(screen.getByText(/Drag nodes into the plugin/)).toBeInTheDocument();
  });

  it('updates plugin name on change', () => {
    render(<PluginEditor nodeId={nodeId} data={createPluginData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('my-plugin');
    fireEvent.change(input, { target: { value: 'auth-plugin' } });
    expect(useGraphStore.getState().nodes[0].data.pluginName).toBe('auth-plugin');
  });

  it('updates version on change', () => {
    render(<PluginEditor nodeId={nodeId} data={createPluginData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('1.0.0');
    fireEvent.change(input, { target: { value: '2.0.0' } });
    expect(useGraphStore.getState().nodes[0].data.version).toBe('2.0.0');
  });

  it('shows children when present', () => {
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'plugin', position: { x: 0, y: 0 }, data: createPluginData() },
      { id: 'child1', type: 'skill', position: { x: 10, y: 10 }, data: { ...createSkillData(), label: 'Child Skill' }, parentId: nodeId },
    ]);
    render(<PluginEditor nodeId={nodeId} data={createPluginData() as unknown as Record<string, unknown>} />);
    expect(screen.getByText('Child Skill')).toBeInTheDocument();
  });
});
