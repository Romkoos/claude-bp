import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelect } from './MultiSelect';

describe('MultiSelect', () => {
  const options = ['Read', 'Write', 'Bash', 'Grep'];

  it('renders placeholder when nothing selected', () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('renders custom placeholder', () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} placeholder="Pick tools" />);
    expect(screen.getByText('Pick tools')).toBeInTheDocument();
  });

  it('renders selected items as badges', () => {
    render(<MultiSelect options={options} selected={['Read', 'Bash']} onChange={() => {}} />);
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Bash')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Select...'));
    expect(screen.getByPlaceholderText('Filter...')).toBeInTheDocument();
  });

  it('shows available options excluding selected', () => {
    render(<MultiSelect options={options} selected={['Read']} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Read'));
    // Read should not be in dropdown since it's already selected
    const dropdownItems = screen.getAllByText(/(Write|Bash|Grep)/);
    expect(dropdownItems.length).toBeGreaterThanOrEqual(3);
  });

  it('calls onChange when selecting an option', () => {
    const onChange = vi.fn();
    render(<MultiSelect options={options} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Select...'));
    fireEvent.click(screen.getByText('Read'));
    expect(onChange).toHaveBeenCalledWith(['Read']);
  });

  it('calls onChange when removing a selected item', () => {
    const onChange = vi.fn();
    render(<MultiSelect options={options} selected={['Read', 'Bash']} onChange={onChange} />);
    // Click the X button on 'Read' badge
    const badges = screen.getAllByRole('button');
    // Find the X button inside the Read badge
    const readBadge = screen.getByText('Read').closest('span');
    const xButton = readBadge?.querySelector('button');
    if (xButton) fireEvent.click(xButton);
    expect(onChange).toHaveBeenCalledWith(['Bash']);
  });

  it('filters options with input', () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Select...'));
    fireEvent.change(screen.getByPlaceholderText('Filter...'), { target: { value: 'Ba' } });
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });

  it('shows "No options" when filter matches nothing', () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Select...'));
    fireEvent.change(screen.getByPlaceholderText('Filter...'), { target: { value: 'zzz' } });
    expect(screen.getByText('No options')).toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <MultiSelect options={options} selected={[]} onChange={() => {}} />
      </div>
    );
    fireEvent.click(screen.getByText('Select...'));
    expect(screen.getByPlaceholderText('Filter...')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByPlaceholderText('Filter...')).not.toBeInTheDocument();
  });
});
