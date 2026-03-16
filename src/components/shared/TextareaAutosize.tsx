import { useRef, useEffect } from 'react';

interface TextareaAutosizeProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
  maxRows?: number;
  className?: string;
}

export function TextareaAutosize({
  value,
  onChange,
  placeholder,
  mono = false,
  maxRows = 10,
  className = '',
}: TextareaAutosizeProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bp-textarea ${mono ? 'font-mono' : ''} ${className}`}
      rows={1}
    />
  );
}
