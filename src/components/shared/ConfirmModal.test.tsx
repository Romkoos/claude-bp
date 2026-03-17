import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  it('renders nothing when not open', () => {
    render(
      <ConfirmModal isOpen={false} message="Test" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <ConfirmModal isOpen={true} message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('shows title when provided', () => {
    render(
      <ConfirmModal isOpen={true} title="Confirm" message="Test" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal isOpen={true} message="Test" onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal isOpen={true} message="Test" onConfirm={() => {}} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when backdrop clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal isOpen={true} message="Test" onConfirm={() => {}} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByTestId('confirm-modal-backdrop'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal isOpen={true} message="Test" onConfirm={() => {}} onCancel={onCancel} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('hides cancel button in alertOnly mode', () => {
    render(
      <ConfirmModal isOpen={true} message="Alert!" alertOnly={true} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.queryByTestId('confirm-modal-cancel')).not.toBeInTheDocument();
  });

  it('uses custom labels', () => {
    render(
      <ConfirmModal
        isOpen={true}
        message="Test"
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('renders with danger styling', () => {
    render(
      <ConfirmModal isOpen={true} message="Test" danger={true} onConfirm={() => {}} onCancel={() => {}} />
    );
    const confirmBtn = screen.getByTestId('confirm-modal-confirm');
    // jsdom converts hex to rgb
    expect(confirmBtn.style.background).toContain('rgb(239, 68, 68)');
  });
});
