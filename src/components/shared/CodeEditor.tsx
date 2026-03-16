import { useRef, useCallback, useMemo, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'markdown' | 'yaml' | 'shell' | 'json';
  minLines?: number;
  maxLines?: number;
  placeholder?: string;
  readOnly?: boolean;
}

type HighlightRule = { pattern: RegExp; color: string };

const HIGHLIGHT_RULES: Record<string, HighlightRule[]> = {
  markdown: [
    { pattern: /^#{1,6}\s.+/gm, color: '#e6edf3' },
    { pattern: /^---$/gm, color: '#484f58' },
    { pattern: /`[^`]+`/g, color: '#22c55e' },
    { pattern: /^\s*-\s/gm, color: '#3b82f6' },
    { pattern: /^>\s/gm, color: '#eab308' },
  ],
  yaml: [
    { pattern: /^[a-zA-Z_-]+:/gm, color: '#06b6d4' },
    { pattern: /"[^"]*"|'[^']*'/g, color: '#22c55e' },
    { pattern: /#.*$/gm, color: '#484f58' },
    { pattern: /\btrue\b|\bfalse\b|\bnull\b/g, color: '#f97316' },
  ],
  shell: [
    { pattern: /^#.*$/gm, color: '#484f58' },
    { pattern: /\$[A-Z_]+/g, color: '#f97316' },
    { pattern: /"[^"]*"|'[^']*'/g, color: '#22c55e' },
    { pattern: /&&|\|\||;|>>|>|<|\|/g, color: '#ef4444' },
  ],
  json: [
    { pattern: /"[^"]*"\s*:/g, color: '#06b6d4' },
    { pattern: /"[^"]*"/g, color: '#22c55e' },
    { pattern: /\b\d+\.?\d*\b/g, color: '#f97316' },
    { pattern: /\btrue\b|\bfalse\b|\bnull\b/g, color: '#f97316' },
  ],
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlight(text: string, language: string): string {
  const rules = HIGHLIGHT_RULES[language] || [];
  const escaped = escapeHtml(text);

  // Build a list of colored ranges on the escaped string.
  // We need to map positions from original text to escaped text.
  // Strategy: tokenize the escaped text by applying rules in order,
  // earlier rules take priority (their spans are not overwritten).

  const len = escaped.length;
  // Track which characters are already claimed by a rule.
  const claimed = new Uint8Array(len);

  type Segment = { start: number; end: number; color: string };
  const segments: Segment[] = [];

  // We need to run regex on the *original* text (since regexes are authored
  // for source text, not HTML-escaped text), then map match positions to
  // the escaped string positions.

  // Build a mapping: original index -> escaped index
  const origToEsc: number[] = [];
  let ei = 0;
  for (let oi = 0; oi < text.length; oi++) {
    origToEsc.push(ei);
    const ch = text[oi];
    if (ch === '&') ei += 5; // &amp;
    else if (ch === '<') ei += 4; // &lt;
    else if (ch === '>') ei += 4; // &gt;
    else ei += 1;
  }
  origToEsc.push(ei); // sentinel for end-of-string

  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const escStart = origToEsc[m.index];
      const escEnd = origToEsc[m.index + m[0].length];

      // Check if any char in this range is already claimed
      let overlap = false;
      for (let i = escStart; i < escEnd; i++) {
        if (claimed[i]) { overlap = true; break; }
      }
      if (overlap) continue;

      // Claim the range
      for (let i = escStart; i < escEnd; i++) {
        claimed[i] = 1;
      }
      segments.push({ start: escStart, end: escEnd, color: rule.color });

      // Prevent infinite loops on zero-length matches
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  if (segments.length === 0) return escaped;

  // Sort segments by start position
  segments.sort((a, b) => a.start - b.start);

  // Build the result
  const parts: string[] = [];
  let cursor = 0;
  for (const seg of segments) {
    if (seg.start > cursor) {
      parts.push(escaped.slice(cursor, seg.start));
    }
    parts.push(`<span style="color:${seg.color}">${escaped.slice(seg.start, seg.end)}</span>`);
    cursor = seg.end;
  }
  if (cursor < len) {
    parts.push(escaped.slice(cursor));
  }

  return parts.join('');
}

const LINE_HEIGHT = 1.5;
const FONT_SIZE = 13;
const LINE_PX = FONT_SIZE * LINE_HEIGHT; // 19.5

const sharedStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: `${FONT_SIZE}px`,
  lineHeight: LINE_HEIGHT,
  padding: '8px 8px 8px 0',
  margin: 0,
  border: 'none',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
};

export function CodeEditor({
  value,
  onChange,
  language,
  minLines = 4,
  maxLines = 20,
  placeholder,
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<number | null>(null);

  const lineCount = (value.match(/\n/g) || []).length + 1;
  const visibleLines = Math.max(minLines, Math.min(lineCount, maxLines));
  const editorHeight = visibleLines * LINE_PX;
  const atMax = lineCount > maxLines;

  const highlighted = useMemo(() => highlight(value, language), [value, language]);

  const lineNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let i = 1; i <= lineCount; i++) nums.push(i);
    return nums;
  }, [lineCount]);

  // Restore cursor position after value change (for tab insertion)
  useEffect(() => {
    if (cursorRef.current !== null && textareaRef.current) {
      textareaRef.current.selectionStart = cursorRef.current;
      textareaRef.current.selectionEnd = cursorRef.current;
      cursorRef.current = null;
    }
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = value.slice(0, start) + '  ' + value.slice(end);
        cursorRef.current = start + 2;
        onChange(newValue);
      }
    },
    [value, onChange],
  );

  return (
    <div
      data-testid="code-editor"
      style={{
        position: 'relative',
        display: 'flex',
        background: '#0d1117',
        border: '1px solid var(--node-border, #2d333b)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {/* Line numbers gutter */}
      <div
        data-testid="code-editor-line-numbers"
        style={{
          width: '40px',
          flexShrink: 0,
          padding: '8px 4px 8px 0',
          textAlign: 'right',
          color: '#484f58',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: `${FONT_SIZE}px`,
          lineHeight: LINE_HEIGHT,
          userSelect: 'none',
          height: `${editorHeight}px`,
          overflowY: 'hidden',
          boxSizing: 'border-box',
        }}
        aria-hidden="true"
      >
        {lineNumbers.map((n) => (
          <div key={n}>{n}</div>
        ))}
      </div>

      {/* Editor area (highlight + textarea stacked) */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: `${editorHeight}px`,
          overflowY: atMax ? 'auto' : 'hidden',
        }}
      >
        {/* Highlight layer */}
        <pre
          aria-hidden="true"
          style={{
            ...sharedStyle,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
            color: '#c9d1d9',
            background: 'transparent',
            minHeight: '100%',
            boxSizing: 'border-box',
          }}
          dangerouslySetInnerHTML={{
            __html: highlighted + '\n',
          }}
        />

        {/* Textarea input layer */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            ...sharedStyle,
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#c9d1d9',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            const container = e.currentTarget.parentElement?.parentElement;
            if (container) container.style.borderColor = '#58a6ff';
          }}
          onBlur={(e) => {
            const container = e.currentTarget.parentElement?.parentElement;
            if (container) container.style.borderColor = 'var(--node-border, #2d333b)';
          }}
        />
      </div>
    </div>
  );
}
