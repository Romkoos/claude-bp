import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpEditor } from './McpEditor';
import { useGraphStore } from '../../store/useGraphStore';
import { createMcpData } from '../../constants/nodeDefaults';

describe('McpEditor', () => {
  const nodeId = 'test-mcp';

  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setNodes([
      { id: nodeId, type: 'mcp', position: { x: 0, y: 0 }, data: createMcpData() },
    ]);
  });

  it('renders mcp editor', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('mcp-editor')).toBeInTheDocument();
  });

  it('shows server name field', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-mcp-server-name')).toBeInTheDocument();
  });

  it('shows connection type selector', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-mcp-connection-type')).toBeInTheDocument();
  });

  it('shows URL field for url connection type', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    expect(screen.getByPlaceholderText('http://localhost:3000/mcp')).toBeInTheDocument();
  });

  it('shows command field for stdio connection type', () => {
    const data = { ...createMcpData(), connection: { ...createMcpData().connection, type: 'stdio' as const } };
    render(<McpEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    expect(screen.getByTestId('field-mcp-command')).toBeInTheDocument();
    expect(screen.getByTestId('field-mcp-args')).toBeInTheDocument();
  });

  it('updates server name on change', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('my-mcp-server');
    fireEvent.change(input, { target: { value: 'test-server' } });
    expect(useGraphStore.getState().nodes[0].data.serverName).toBe('test-server');
  });

  it('updates url on change', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('http://localhost:3000/mcp');
    fireEvent.change(input, { target: { value: 'http://example.com/mcp' } });
    expect((useGraphStore.getState().nodes[0].data as Record<string, unknown>).connection).toEqual(
      expect.objectContaining({ url: 'http://example.com/mcp' })
    );
  });

  it('updates connection type on change', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    const select = screen.getByTestId('field-mcp-connection-type').querySelector('select')!;
    fireEvent.change(select, { target: { value: 'stdio' } });
    expect((useGraphStore.getState().nodes[0].data as Record<string, unknown>).connection).toEqual(
      expect.objectContaining({ type: 'stdio' })
    );
  });

  it('updates command for stdio type', () => {
    const data = { ...createMcpData(), connection: { ...createMcpData().connection, type: 'stdio' as const } };
    render(<McpEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('npx -y @modelcontextprotocol/server');
    fireEvent.change(input, { target: { value: 'node server.js' } });
    expect((useGraphStore.getState().nodes[0].data as Record<string, unknown>).connection).toEqual(
      expect.objectContaining({ command: 'node server.js' })
    );
  });

  it('updates args for stdio type', () => {
    const data = { ...createMcpData(), connection: { ...createMcpData().connection, type: 'stdio' as const } };
    render(<McpEditor nodeId={nodeId} data={data as unknown as Record<string, unknown>} />);
    const input = screen.getByPlaceholderText('--port, 3000');
    fireEvent.change(input, { target: { value: '--port, 3000' } });
    expect((useGraphStore.getState().nodes[0].data as Record<string, unknown>).connection).toEqual(
      expect.objectContaining({ args: ['--port', '3000'] })
    );
  });

  it('shows add tool button after expanding Provided Tools section', () => {
    render(<McpEditor nodeId={nodeId} data={createMcpData() as unknown as Record<string, unknown>} />);
    // Provided Tools section is collapsed by default
    const toggleBtn = screen.getByText('Provided Tools');
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Add tool')).toBeInTheDocument();
  });
});
