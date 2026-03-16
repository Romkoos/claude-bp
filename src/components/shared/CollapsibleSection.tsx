import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId?: string;
}

export function CollapsibleSection({ title, defaultOpen = true, children, testId }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-3" data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        data-testid="section-toggle"
        className="flex items-center gap-1.5 w-full text-left text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="space-y-2" data-testid="section-content">{children}</div>}
    </div>
  );
}
