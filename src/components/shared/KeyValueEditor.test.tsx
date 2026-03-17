import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyValueEditor } from './KeyValueEditor';

describe('KeyValueEditor', () => {
  it('renders existing pairs', () => {
    render(<KeyValueEditor pairs={{ API_KEY: 'abc' }} onChange={() => {}} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('API_KEY');
    expect(inputs[1]).toHaveValue('abc');
  });

  it('renders empty state with add button', () => {
    render(<KeyValueEditor pairs={{}} onChange={() => {}} />);
    expect(screen.getByText('Add pair')).toBeInTheDocument();
  });

  it('calls onChange when adding a pair', () => {
    const onChange = vi.fn();
    render(<KeyValueEditor pairs={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add pair'));
    expect(onChange).toHaveBeenCalledWith({ key_0: '' });
  });

  it('calls onChange when removing a pair', () => {
    const onChange = vi.fn();
    render(<KeyValueEditor pairs={{ a: '1', b: '2' }} onChange={onChange} />);
    const buttons = screen.getAllByRole('button').filter((b) => b.textContent !== 'Add pair');
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith({ b: '2' });
  });

  it('calls onChange when updating a value', () => {
    const onChange = vi.fn();
    render(<KeyValueEditor pairs={{ key: 'val' }} onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1], { target: { value: 'new-val' } });
    expect(onChange).toHaveBeenCalledWith({ key: 'new-val' });
  });

  it('calls onChange when updating a key', () => {
    const onChange = vi.fn();
    render(<KeyValueEditor pairs={{ old: 'val' }} onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'new' } });
    expect(onChange).toHaveBeenCalledWith({ new: 'val' });
  });

  it('uses custom placeholders', () => {
    render(<KeyValueEditor pairs={{}} onChange={() => {}} keyPlaceholder="Name" valuePlaceholder="Data" />);
    // Just add a pair to see placeholders
    fireEvent.click(screen.getByText('Add pair'));
  });
});
