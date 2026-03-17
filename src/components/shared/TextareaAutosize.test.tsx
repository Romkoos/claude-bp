import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextareaAutosize } from './TextareaAutosize';

describe('TextareaAutosize', () => {
  it('renders with value', () => {
    render(<TextareaAutosize value="Hello" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello');
  });

  it('renders with placeholder', () => {
    render(<TextareaAutosize value="" onChange={() => {}} placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('calls onChange on input', () => {
    const onChange = vi.fn();
    render(<TextareaAutosize value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
    expect(onChange).toHaveBeenCalledWith('new');
  });

  it('applies mono class when mono=true', () => {
    render(<TextareaAutosize value="" onChange={() => {}} mono={true} />);
    expect(screen.getByRole('textbox').className).toContain('font-mono');
  });

  it('applies custom className', () => {
    render(<TextareaAutosize value="" onChange={() => {}} className="custom-class" />);
    expect(screen.getByRole('textbox').className).toContain('custom-class');
  });
});
