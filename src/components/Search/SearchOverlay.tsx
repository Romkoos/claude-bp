import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import {
  Search,
  ScrollText,
  Zap,
  Bot,
  Webhook,
  Wrench,
  Globe,
  Package,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';
import { NODE_COLORS } from '../../constants/theme';
import type { BlueprintNodeType } from '../../types/nodes';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  node: Node;
  matchedField: string;
  matchedText: string;
  isLabelMatch: boolean;
}

const NODE_TYPE_ICONS: Record<string, LucideIcon> = {
  rules: ScrollText,
  skill: Zap,
  subagent: Bot,
  hook: Webhook,
  tool: Wrench,
  mcp: Globe,
  plugin: Package,
  comment: StickyNote,
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

function getSearchableFields(node: Node): Array<{ field: string; value: string; isLabel: boolean }> {
  const fields: Array<{ field: string; value: string; isLabel: boolean }> = [];
  const data = node.data as Record<string, unknown>;

  // Common: label and type name
  if (data.label && typeof data.label === 'string') {
    fields.push({ field: 'label', value: data.label, isLabel: true });
  }
  if (node.type) {
    fields.push({ field: 'type', value: node.type, isLabel: true });
  }

  // Type-specific fields
  switch (node.type) {
    case 'skill': {
      const fm = data.frontmatter as Record<string, unknown> | undefined;
      if (fm?.name && typeof fm.name === 'string') {
        fields.push({ field: 'name', value: fm.name, isLabel: true });
      }
      if (fm?.description && typeof fm.description === 'string') {
        fields.push({ field: 'description', value: fm.description, isLabel: false });
      }
      if (data.instructions && typeof data.instructions === 'string') {
        fields.push({ field: 'instructions', value: data.instructions, isLabel: false });
      }
      break;
    }
    case 'subagent': {
      if (data.name && typeof data.name === 'string') {
        fields.push({ field: 'name', value: data.name, isLabel: true });
      }
      if (data.systemPrompt && typeof data.systemPrompt === 'string') {
        fields.push({ field: 'systemPrompt', value: data.systemPrompt, isLabel: false });
      }
      break;
    }
    case 'hook': {
      if (data.event && typeof data.event === 'string') {
        fields.push({ field: 'event', value: data.event, isLabel: false });
      }
      if (data.matcher && typeof data.matcher === 'string') {
        fields.push({ field: 'matcher', value: data.matcher, isLabel: false });
      }
      break;
    }
    case 'mcp': {
      if (data.serverName && typeof data.serverName === 'string') {
        fields.push({ field: 'serverName', value: data.serverName, isLabel: false });
      }
      break;
    }
    case 'rules': {
      if (data.content && typeof data.content === 'string') {
        fields.push({ field: 'content', value: data.content, isLabel: false });
      }
      break;
    }
  }

  return fields;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);
  const { setCenter, getZoom } = useReactFlow();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchResult[] = [];

    for (const node of nodes) {
      const fields = getSearchableFields(node);
      let bestMatch: SearchResult | null = null;

      for (const { field, value, isLabel } of fields) {
        if (value.toLowerCase().includes(q)) {
          // Prefer label matches over content matches
          if (!bestMatch || (isLabel && !bestMatch.isLabelMatch)) {
            bestMatch = {
              node,
              matchedField: field,
              matchedText: value,
              isLabelMatch: isLabel,
            };
          }
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
      }
    }

    // Sort: label matches first, then content matches
    matches.sort((a, b) => {
      if (a.isLabelMatch && !b.isLabelMatch) return -1;
      if (!a.isLabelMatch && b.isLabelMatch) return 1;
      return 0;
    });

    return matches.slice(0, 10);
  }, [query, nodes]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Small delay to ensure the overlay is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      const { node } = result;
      onClose();
      selectNode(node.id);
      const x = node.position.x + (node.measured?.width ?? 300) / 2;
      const y = node.position.y + (node.measured?.height ?? 200) / 2;
      setCenter(x, y, { zoom: getZoom(), duration: 300 });
    },
    [onClose, selectNode, setCenter, getZoom],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[activeIndex]) {
            handleSelect(results[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, activeIndex, handleSelect, onClose],
  );

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.children[activeIndex] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="search-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '20vh',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'var(--node-bg)',
          border: '1px solid var(--node-border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--node-border)',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            data-testid="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            style={{
              flex: 1,
              background: '#0d1117',
              border: '1px solid #2d333b',
              borderRadius: 6,
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* Results */}
        {query.trim() && (
          <div
            ref={resultsRef}
            style={{
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            {results.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                No results found
              </div>
            ) : (
              results.map((result, index) => {
                const nodeType = (result.node.type ?? 'rules') as BlueprintNodeType;
                const Icon = NODE_TYPE_ICONS[nodeType] ?? ScrollText;
                const colors = NODE_COLORS[nodeType];
                const label =
                  (result.node.data as Record<string, unknown>).label as string || nodeType;

                return (
                  <div
                    key={result.node.id}
                    data-testid="search-result"
                    onClick={() => handleSelect(result)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      background:
                        index === activeIndex
                          ? 'rgba(45, 51, 59, 0.8)'
                          : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <Icon
                      size={16}
                      style={{ color: colors?.header ?? 'var(--text-secondary)', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: (colors?.header ?? '#64748b') + '30',
                        color: colors?.header ?? 'var(--text-secondary)',
                        flexShrink: 0,
                        fontWeight: 500,
                      }}
                    >
                      {nodeType}
                    </span>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 180,
                        flexShrink: 1,
                      }}
                      title={result.matchedText}
                    >
                      {truncate(result.matchedText, 60)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--node-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span>
            {query.trim()
              ? `${results.length} result${results.length !== 1 ? 's' : ''}`
              : 'Type to search'}
          </span>
          <span>
            <kbd style={{ fontSize: 11, opacity: 0.7 }}>↑↓</kbd> navigate{' '}
            <kbd style={{ fontSize: 11, opacity: 0.7 }}>↵</kbd> select{' '}
            <kbd style={{ fontSize: 11, opacity: 0.7 }}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
