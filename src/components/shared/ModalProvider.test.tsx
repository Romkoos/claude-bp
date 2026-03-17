import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ModalProvider } from './ModalProvider';
import { useModal } from './useModal';

function TestConsumer() {
  const { confirm, alert } = useModal();

  return (
    <div>
      <button onClick={() => confirm('Are you sure?')}>Confirm</button>
      <button onClick={() => confirm({ title: 'Delete', message: 'Remove item?', danger: true })}>
        Danger Confirm
      </button>
      <button onClick={() => alert('Done!')}>Alert</button>
    </div>
  );
}

describe('ModalProvider', () => {
  it('provides modal context', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('opens confirm modal on confirm()', async () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'));
    });
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-modal-cancel')).toBeInTheDocument();
  });

  it('opens alert modal on alert()', async () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Alert'));
    });
    expect(screen.getByText('Done!')).toBeInTheDocument();
    // Alert mode should not show cancel
    expect(screen.queryByTestId('confirm-modal-cancel')).not.toBeInTheDocument();
  });

  it('closes modal on confirm button', async () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'));
    });
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-modal-confirm'));
    });
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('closes modal on cancel button', async () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-modal-cancel'));
    });
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('opens danger confirm with title', async () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByText('Danger Confirm'));
    });
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Remove item?')).toBeInTheDocument();
  });
});
