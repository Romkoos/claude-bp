import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';
import { PinDirection, PinType } from '../../types/pins';

function resetStore() {
  useGraphStore.getState().clearGraph();
}

const testPins = [
  { id: 'in_exec', type: PinType.Exec, direction: PinDirection.In, label: 'In' },
];

describe('BaseNode plugin link indicator', () => {
  beforeEach(() => resetStore());

  it('shows link icon when node has a parent plugin', () => {
    useGraphStore.setState({
      nodes: [
        {
          id: 'plugin-1',
          type: 'plugin',
          position: { x: 0, y: 0 },
          data: { label: 'My Plugin', collapsed: false, validation: { errors: [], warnings: [] } },
        },
        {
          id: 'child-1',
          type: 'skill',
          position: { x: 50, y: 50 },
          parentId: 'plugin-1',
          data: { label: 'Child Skill', collapsed: false, validation: { errors: [], warnings: [] } },
        },
      ],
    });

    render(
      <ReactFlowProvider>
        <BaseNode
          id="child-1"
          nodeType="skill"
          data={{ label: 'Child Skill', collapsed: false, validation: { errors: [], warnings: [] } }}
          pins={testPins}
          icon={() => <span>icon</span>}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByTestId('plugin-link-indicator')).toBeTruthy();
    expect(screen.getByTestId('plugin-link-indicator').getAttribute('title')).toBe('My Plugin');
  });

  it('does not show link icon when node has no parent', () => {
    useGraphStore.setState({
      nodes: [
        {
          id: 'node-1',
          type: 'skill',
          position: { x: 100, y: 100 },
          data: { label: 'Standalone', collapsed: false, validation: { errors: [], warnings: [] } },
        },
      ],
    });

    render(
      <ReactFlowProvider>
        <BaseNode
          id="node-1"
          nodeType="skill"
          data={{ label: 'Standalone', collapsed: false, validation: { errors: [], warnings: [] } }}
          pins={testPins}
          icon={() => <span>icon</span>}
        />
      </ReactFlowProvider>
    );

    expect(screen.queryByTestId('plugin-link-indicator')).toBeNull();
  });
});
