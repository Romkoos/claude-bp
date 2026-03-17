import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  key: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const leftColumn: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { key: 'Ctrl+S', description: 'Save' },
      { key: 'Ctrl+Z', description: 'Undo' },
      { key: 'Ctrl+Y', description: 'Redo' },
      { key: 'Ctrl+K', description: 'Search' },
      { key: '?', description: 'Shortcuts' },
      { key: 'Escape', description: 'Deselect' },
      { key: 'Ctrl+,', description: 'Settings' },
    ],
  },
  {
    title: 'Export',
    shortcuts: [
      { key: 'Ctrl+E', description: 'Export' },
      { key: 'Ctrl+I', description: 'Import' },
    ],
  },
];

const rightColumn: ShortcutGroup[] = [
  {
    title: 'Canvas',
    shortcuts: [
      { key: 'Delete', description: 'Remove' },
      { key: 'Ctrl+A', description: 'Select all' },
      { key: 'Ctrl+D', description: 'Duplicate' },
      { key: 'Space', description: 'Pan mode' },
      { key: 'Scroll', description: 'Zoom' },
      { key: 'F', description: 'Fit view' },
    ],
  },
  {
    title: 'Nodes',
    shortcuts: [
      { key: 'E', description: 'Expand' },
      { key: 'C', description: 'Collapse' },
      { key: 'Ctrl+G', description: 'Group' },
    ],
  },
];

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span
        className="text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        {shortcut.description}
      </span>
      <kbd
        className="text-xs font-mono px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: '#2d333b',
          color: 'var(--text-primary)',
        }}
      >
        {shortcut.key}
      </kbd>
    </div>
  );
}

function ShortcutGroupSection({ group }: { group: ShortcutGroup }) {
  return (
    <div className="mb-4">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {group.title}
      </h3>
      <div>
        {group.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.key} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

export function ShortcutsOverlay({ isOpen, onClose }: ShortcutsOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="shortcuts-overlay"
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl w-full mx-4"
        style={{
          maxWidth: '560px',
          backgroundColor: 'var(--node-bg)',
          border: '1px solid var(--node-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--node-border)' }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-6 px-5 py-4">
          <div>
            {leftColumn.map((group) => (
              <ShortcutGroupSection key={group.title} group={group} />
            ))}
          </div>
          <div>
            {rightColumn.map((group) => (
              <ShortcutGroupSection key={group.title} group={group} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
