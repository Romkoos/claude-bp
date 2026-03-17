import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillEditor } from './SkillEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createSkillData } from '../../constants/nodeDefaults';

describe('SkillEditor', () => {
  const nodeId = 'test-skill';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'skill', position: { x: 0, y: 0 }, data: createSkillData() },
    ]);
  });

  it('renders skill editor', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('skill-editor')).toBeInTheDocument();
  });

  it('shows name field', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-skill-name')).toBeInTheDocument();
  });

  it('shows description field', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-skill-description')).toBeInTheDocument();
  });

  it('shows context selector', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-skill-context')).toBeInTheDocument();
  });

  it('shows instructions field', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-skill-instructions')).toBeInTheDocument();
  });

  it('shows allowed tools section', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-skill-allowed-tools')).toBeInTheDocument();
  });

  it('updates name on change', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('skill-name');
    fireEvent.change(input, { target: { value: 'deploy' } });
    const nodeData = useGraphStore.getState().nodes[0].data as Record<string, unknown>;
    const fm = nodeData.frontmatter as Record<string, unknown>;
    expect(fm.name).toBe('deploy');
  });

  it('shows agent selector when context is fork', () => {
    const data = {
      ...createSkillData(),
      frontmatter: { ...createSkillData().frontmatter, context: 'fork' as const },
    };
    render(<SkillEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-skill-agent')).toBeInTheDocument();
  });

  it('hides agent selector when context is conversation', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    expect(screen.queryByTestId('field-skill-agent')).not.toBeInTheDocument();
  });

  it('updates instructions on change', () => {
    render(<SkillEditor nodeId={nodeId} data={createSkillData() as unknown as Record<string, unknown>} />);
    const textarea = screen.getByPlaceholderText('Skill instructions...');
    fireEvent.change(textarea, { target: { value: 'Do the thing' } });
    expect(useGraphStore.getState().nodes[0].data.instructions).toBe('Do the thing');
  });
});
