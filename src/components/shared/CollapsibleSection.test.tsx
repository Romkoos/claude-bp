import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders title', () => {
    render(<CollapsibleSection title="Test Section">Content</CollapsibleSection>);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('shows content by default (defaultOpen=true)', () => {
    render(<CollapsibleSection title="Section">Content here</CollapsibleSection>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('hides content when defaultOpen=false', () => {
    render(<CollapsibleSection title="Section" defaultOpen={false}>Hidden</CollapsibleSection>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('toggles content on click', () => {
    render(<CollapsibleSection title="Section">Toggle me</CollapsibleSection>);
    expect(screen.getByText('Toggle me')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('section-toggle'));
    expect(screen.queryByText('Toggle me')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('section-toggle'));
    expect(screen.getByText('Toggle me')).toBeInTheDocument();
  });

  it('renders with testId', () => {
    render(<CollapsibleSection title="S" testId="my-section">C</CollapsibleSection>);
    expect(screen.getByTestId('my-section')).toBeInTheDocument();
  });
});
