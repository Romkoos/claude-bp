import { useState, useCallback, useRef } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { ModalContext } from './useModal';
import type { ModalOptions } from './useModal';

interface ModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  alertOnly: boolean;
}

const CLOSED_STATE: ModalState = {
  isOpen: false,
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  danger: false,
  alertOnly: false,
};

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>(CLOSED_STATE);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(CLOSED_STATE);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(CLOSED_STATE);
  }, []);

  const confirm = useCallback((options: ModalOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'OK',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        danger: opts.danger ?? false,
        alertOnly: false,
      });
    });
  }, []);

  const alert = useCallback((options: Omit<ModalOptions, 'cancelLabel'> | string): Promise<void> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
      setState({
        isOpen: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'OK',
        cancelLabel: 'Cancel',
        danger: opts.danger ?? false,
        alertOnly: true,
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        danger={state.danger}
        alertOnly={state.alertOnly}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ModalContext.Provider>
  );
}
