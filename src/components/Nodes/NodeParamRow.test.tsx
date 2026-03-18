import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeParamBlock, NodeParamRow } from './NodeParamRow';

describe('NodeParamRow', () => {
  it('renders label and string value', () => {
    render(<NodeParamRow label="Tool" value="Read" />);
    expect(screen.getByText('Tool')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('renders label and numeric value', () => {
    render(<NodeParamRow label="Priority" value={5} />);
    expect(screen.getByText('Priority')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders boolean true as Yes', () => {
    render(<NodeParamRow label="Built-in" value={true} />);
    expect(screen.getByText('Yes')).toBeTruthy();
  });

  it('renders boolean false as No', () => {
    render(<NodeParamRow label="Built-in" value={false} />);
    expect(screen.getByText('No')).toBeTruthy();
  });

  it('returns null for undefined value', () => {
    const { container } = render(<NodeParamRow label="Pattern" value={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for empty string value', () => {
    const { container } = render(<NodeParamRow label="Pattern" value="" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null for null value', () => {
    const { container } = render(<NodeParamRow label="Mode" value={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('has correct data-testid', () => {
    render(<NodeParamRow label="Tool Name" value="Read" />);
    expect(screen.getByTestId('node-param-tool-name')).toBeTruthy();
  });

  it('applies node-param-value class for text overflow', () => {
    render(<NodeParamRow label="URL" value="http://very-long-url.example.com/path" />);
    const valueEl = screen.getByText('http://very-long-url.example.com/path');
    expect(valueEl.className).toContain('node-param-value');
  });
});

describe('NodeParamBlock', () => {
  it('renders children inside a styled container', () => {
    render(
      <NodeParamBlock>
        <NodeParamRow label="Name" value="test" />
      </NodeParamBlock>
    );
    expect(screen.getByTestId('node-param-block')).toBeTruthy();
    expect(screen.getByTestId('node-param-block').className).toContain('node-param-block');
  });

  it('has correct data-testid', () => {
    render(
      <NodeParamBlock>
        <span>child</span>
      </NodeParamBlock>
    );
    expect(screen.getByTestId('node-param-block')).toBeTruthy();
  });
});
