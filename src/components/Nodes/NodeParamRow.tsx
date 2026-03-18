import type { ReactNode } from 'react';

/* ── Wrapper for the whole param block ── */

interface NodeParamBlockProps {
  children: ReactNode;
}

export function NodeParamBlock({ children }: NodeParamBlockProps) {
  return (
    <div
      data-testid="node-param-block"
      className="node-param-block"
    >
      {children}
    </div>
  );
}

/* ── Single param row ── */

interface NodeParamRowProps {
  label: string;
  value?: string | number | boolean | null;
}

export function NodeParamRow({ label, value }: NodeParamRowProps) {
  if (value === undefined || value === null || value === '') return null;

  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

  return (
    <div
      className="node-param-row"
      data-testid={`node-param-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className="node-param-label">{label}</span>
      <span className="node-param-value">{displayValue}</span>
    </div>
  );
}
