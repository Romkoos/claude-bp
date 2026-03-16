import { Plus, Trash2 } from 'lucide-react';

interface KeyValueEditorProps {
  pairs: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const entries = Object.entries(pairs);

  const updateKey = (oldKey: string, newKey: string) => {
    const newPairs: Record<string, string> = {};
    for (const [k, v] of Object.entries(pairs)) {
      newPairs[k === oldKey ? newKey : k] = v;
    }
    onChange(newPairs);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...pairs, [key]: value });
  };

  const addPair = () => {
    const key = `key_${entries.length}`;
    onChange({ ...pairs, [key]: '' });
  };

  const removePair = (key: string) => {
    const newPairs = { ...pairs };
    delete newPairs[key];
    onChange(newPairs);
  };

  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1.5 items-center">
          <input
            value={key}
            onChange={(e) => updateKey(key, e.target.value)}
            placeholder={keyPlaceholder}
            className="bp-input flex-1 font-mono text-xs"
          />
          <input
            value={value}
            onChange={(e) => updateValue(key, e.target.value)}
            placeholder={valuePlaceholder}
            className="bp-input flex-1 text-xs"
          />
          <button
            onClick={() => removePair(key)}
            className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={addPair}
        className="flex items-center gap-1 text-xs py-1"
        style={{ color: 'var(--text-muted)' }}
      >
        <Plus size={12} /> Add pair
      </button>
    </div>
  );
}
