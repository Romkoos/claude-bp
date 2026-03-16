import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = 'Select...' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(filter.toLowerCase()) && !selected.includes(o)
  );

  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="bp-input flex flex-wrap gap-1 items-center min-h-[34px] cursor-pointer"
      >
        {selected.length === 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{placeholder}</span>
        )}
        {selected.map((s) => (
          <span
            key={s}
            className="bp-badge"
            style={{ background: '#2d333b', color: 'var(--text-primary)' }}
          >
            {s}
            <button
              onClick={(e) => { e.stopPropagation(); toggle(s); }}
              className="ml-1 hover:opacity-70"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <ChevronDown size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
      </div>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border overflow-hidden"
          style={{ background: 'var(--node-bg)', borderColor: 'var(--node-border)' }}
        >
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="bp-input rounded-none border-0 border-b"
            style={{ borderColor: 'var(--node-border)' }}
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                No options
              </div>
            )}
            {filtered.map((o) => (
              <div
                key={o}
                onClick={() => { toggle(o); setFilter(''); }}
                className="px-3 py-1.5 text-sm cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = 'var(--node-border)';
                  (e.target as HTMLElement).style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent';
                  (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                }}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
