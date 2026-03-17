import { useEffect, useRef } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  alertOnly?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false,
  alertOnly = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accentColor = danger ? '#ef4444' : '#58a6ff';

  return (
    <div
      data-testid="confirm-modal-backdrop"
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div
        data-testid="confirm-modal"
        className="rounded-lg shadow-xl w-full mx-4"
        style={{
          maxWidth: '400px',
          backgroundColor: 'var(--node-bg)',
          border: '1px solid var(--node-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-5 pt-4 pb-0">
            <h2
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
          </div>
        )}

        <div className="px-5 py-4">
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            {message}
          </p>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--node-border)' }}
        >
          {!alertOnly && (
            <button
              data-testid="confirm-modal-cancel"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--node-border)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--node-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            data-testid="confirm-modal-confirm"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              color: '#fff',
              background: accentColor,
              border: `1px solid ${accentColor}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.filter = 'none';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
