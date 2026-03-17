import { createContext, useContext } from 'react';

export interface ModalOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ModalContextValue {
  confirm: (options: ModalOptions | string) => Promise<boolean>;
  alert: (options: Omit<ModalOptions, 'cancelLabel'> | string) => Promise<void>;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
