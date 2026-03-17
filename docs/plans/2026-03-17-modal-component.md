# Modal Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all `window.confirm` / `window.alert` calls with a custom modal component matching the app's dark theme.

**Architecture:** A React context + hook (`useModal`) provides promise-based `confirm()` and `alert()` methods. A single `<ModalProvider>` wraps the app and renders `<ConfirmModal>` when needed. Callers `await` the result — minimal diff at call sites.

**Tech Stack:** React (context, portals), TypeScript, Tailwind CSS, existing CSS variables

---

### Task 1: Create ConfirmModal component

**Files:**
- Create: `src/components/shared/ConfirmModal.tsx`

**Step 1: Create the modal component**

```tsx
import { useEffect, useRef } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** If true, only show OK button (alert mode) */
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
          <div
            className="px-5 pt-4 pb-0"
          >
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/shared/ConfirmModal.tsx
git commit -m "feat: add ConfirmModal component"
```

---

### Task 2: Create ModalProvider context and useModal hook

**Files:**
- Create: `src/components/shared/ModalProvider.tsx`

**Step 1: Create the provider with promise-based API**

```tsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmModal } from './ConfirmModal';

interface ModalOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ModalContextValue {
  confirm: (options: ModalOptions | string) => Promise<boolean>;
  alert: (options: Omit<ModalOptions, 'cancelLabel'> | string) => Promise<void>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/shared/ModalProvider.tsx
git commit -m "feat: add ModalProvider context and useModal hook"
```

---

### Task 3: Wire ModalProvider into App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Wrap app content with ModalProvider**

Add import:
```tsx
import { ModalProvider } from './components/shared/ModalProvider';
```

Wrap the existing JSX inside `<ReactFlowProvider>` with `<ModalProvider>`:
```tsx
<ReactFlowProvider>
  <ModalProvider>
    <div ...>
      {/* existing content */}
    </div>
  </ModalProvider>
</ReactFlowProvider>
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire ModalProvider into App root"
```

---

### Task 4: Replace system dialogs in Toolbar.tsx

**Files:**
- Modify: `src/components/Toolbar/Toolbar.tsx`

**Step 1: Replace all window.confirm/alert calls**

Add `useModal` import and call at top of `Toolbar` component:
```tsx
import { useModal } from '../shared/ModalProvider';
// inside Toolbar():
const modal = useModal();
```

Replace `handleImportZip`:
```tsx
const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await importFromZip(file);

    if (result.warnings.length > 0) {
      const msg = 'Import warnings:\n' + result.warnings.map((w) => `- ${w}`).join('\n');
      if (!await modal.confirm({ title: 'Import Warnings', message: msg + '\n\nContinue with import?' })) return;
    }

    if (nodes.length > 0 || edges.length > 0) {
      if (!await modal.confirm({ title: 'Replace Graph', message: 'This will replace the current graph. Continue?', danger: true })) return;
    }

    useGraphStore.setState({ nodes: result.nodes, edges: result.edges });
    setTimeout(() => {
      autoLayout('LR');
      setTimeout(() => fitView({ padding: 0.2 }), 400);
    }, 50);
  } catch {
    await modal.alert({ title: 'Import Error', message: 'Failed to import ZIP file.', danger: true });
  }

  e.target.value = '';
};
```

Replace `handleClear`:
```tsx
const handleClear = async () => {
  if (nodes.length === 0 && edges.length === 0) return;
  if (await modal.confirm({ title: 'Clear Canvas', message: 'Clear the entire canvas? This cannot be undone.', danger: true, confirmLabel: 'Clear' })) {
    clearGraph();
  }
};
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/Toolbar/Toolbar.tsx
git commit -m "refactor: replace system dialogs in Toolbar with modal"
```

---

### Task 5: Replace system dialogs in PropertiesPanel.tsx

**Files:**
- Modify: `src/components/PropertiesPanel/PropertiesPanel.tsx`

**Step 1: Replace window.confirm call**

Add `useModal` import and call at top of `PropertiesPanel` component:
```tsx
import { useModal } from '../shared/ModalProvider';
// inside PropertiesPanel():
const modal = useModal();
```

Replace `handleDelete`:
```tsx
const handleDelete = async () => {
  if (await modal.confirm({ title: 'Delete Node', message: `Delete "${label}"?`, danger: true, confirmLabel: 'Delete' })) {
    deleteNode(node.id);
  }
};
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/PropertiesPanel/PropertiesPanel.tsx
git commit -m "refactor: replace system confirm in PropertiesPanel with modal"
```

---

### Task 6: Replace system dialog in NodePalette.tsx

**Files:**
- Modify: `src/components/Palette/NodePalette.tsx`

**Step 1: Replace window.confirm call**

Add `useModal` import and call at top of `NodePalette` component:
```tsx
import { useModal } from '../shared/ModalProvider';
// inside NodePalette():
const modal = useModal();
```

Replace `loadTemplate`:
```tsx
const loadTemplate = async (template: typeof TEMPLATES[0]) => {
  if (!await modal.confirm({ title: 'Load Template', message: `Load "${template.name}"? This will replace the current graph.`, danger: true, confirmLabel: 'Load' })) return;
  importJSON({
    version: '1.0.0',
    metadata: {
      name: template.name,
      description: template.description,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    nodes: template.graph.nodes,
    edges: template.graph.edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  setTimeout(() => fitView({ padding: 0.2 }), 100);
};
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/Palette/NodePalette.tsx
git commit -m "refactor: replace system confirm in NodePalette with modal"
```

---

### Task 7: Final verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 2: Lint check**

Run: `npm run lint`
Expected: no errors

**Step 3: Build check**

Run: `npm run build`
Expected: successful build

**Step 4: Grep for remaining system dialogs**

Run: `grep -rn "window\.\(alert\|confirm\|prompt\)" src/`
Expected: no matches
