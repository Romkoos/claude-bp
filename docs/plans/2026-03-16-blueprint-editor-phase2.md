# Blueprint Editor Phase 2 — Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 new node types (Tool, MCP Server, Plugin), auto-layout with dagre, 4 preset templates, undo/redo toolbar buttons, and extended validation — all integrated seamlessly into the existing Phase 1 codebase.

**Architecture:** Extend existing patterns — new node components follow the BaseNode/RulesNode pattern, new data types extend BaseNodeData, pin definitions added to NODE_PIN_DEFINITIONS, store actions extended with layout/plugin grouping. Dagre handles auto-layout, templates are static graph definitions loaded via importJSON.

**Tech Stack:** React 19, @xyflow/react 12, Zustand 5 + Zundo 2, @dagrejs/dagre, lucide-react, Tailwind CSS 4, TypeScript 5.9, Vite 8

---

## Task 1: Install dagre dependency

**Files:**
- Modify: `package.json`

**Step 1: Install @dagrejs/dagre**

Run: `npm install @dagrejs/dagre`

**Step 2: Install dagre type definitions**

Run: `npm install -D @types/@dagrejs/dagre` — if this fails, types may be bundled. Check with `npm ls @dagrejs/dagre`.

**Step 3: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dagrejs/dagre for auto-layout"
```

---

## Task 2: Extend type system with Tool, MCP, Plugin types

**Files:**
- Modify: `src/types/nodes.ts` (add 3 interfaces + extend BlueprintNodeType)

**Step 1: Add the 3 new data interfaces and extend BlueprintNodeType**

In `src/types/nodes.ts`, change line 1:
```typescript
export type BlueprintNodeType = 'rules' | 'skill' | 'subagent' | 'hook' | 'tool' | 'mcp' | 'plugin';
```

Then append after `HookNodeData` (after line 60):

```typescript
export interface ToolNodeData extends BaseNodeData {
  toolName: string;
  pattern: string;
  builtin: boolean;
  description: string;
}

export interface McpNodeData extends BaseNodeData {
  serverName: string;
  connection: {
    type: 'url' | 'stdio';
    url: string;
    command: string;
    args: string[];
  };
  env: Record<string, string>;
  providedTools: Array<{ name: string; description: string }>;
}

export interface PluginNodeData extends BaseNodeData {
  pluginName: string;
  version: string;
  description: string;
  installScript: string;
}
```

**Step 2: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds. There will be TS errors in `theme.ts` and `nodeDefaults.ts` because `NODE_COLORS` and `NODE_PIN_DEFINITIONS` are typed `Record<BlueprintNodeType, ...>` and now require the 3 new keys. These will be fixed in Tasks 3-4.

If build fails due to those Record checks, that's expected — proceed to Task 3.

**Step 3: Commit**

```bash
git add src/types/nodes.ts
git commit -m "feat: add Tool, MCP, Plugin node type definitions"
```

---

## Task 3: Add theme colors and pin definitions for new nodes

**Files:**
- Modify: `src/constants/theme.ts:3-8` (add 3 color entries)
- Modify: `src/constants/nodeDefaults.ts:1-97` (add imports, pin defs, factory functions)
- Modify: `src/index.css:22-26` (add CSS variables)

**Step 1: Add CSS variables for new node colors**

In `src/index.css`, after `--node-hook: #f59e0b;` (line 25), add:

```css
  --node-tool: #f97316;
  --node-mcp: #06b6d4;
  --node-plugin: #f43f5e;
```

**Step 2: Add NODE_COLORS entries**

In `src/constants/theme.ts`, add 3 entries inside NODE_COLORS (after hook line 7):

```typescript
  tool:     { header: '#f97316', headerDark: '#ea580c', glow: '#f9731640' },
  mcp:      { header: '#06b6d4', headerDark: '#0891b2', glow: '#06b6d440' },
  plugin:   { header: '#f43f5e', headerDark: '#e11d48', glow: '#f43f5e40' },
```

**Step 3: Add pin definitions and factory functions**

In `src/constants/nodeDefaults.ts`:

1. Update the import on line 2 to include new types:
```typescript
import type { BlueprintNodeType, RulesNodeData, SkillNodeData, SubagentNodeData, HookNodeData, ToolNodeData, McpNodeData, PluginNodeData } from '../types/nodes';
```

2. Add pin definitions inside `NODE_PIN_DEFINITIONS` after the `hook` entry (after line 30):
```typescript
  tool: [
    { id: 'in_used_by',     type: PinType.ToolAccess, direction: PinDirection.In, label: 'used by' },
    { id: 'in_provided_by', type: PinType.ToolAccess, direction: PinDirection.In, label: 'provided by' },
  ],
  mcp: [
    { id: 'out_tools',   type: PinType.ToolAccess, direction: PinDirection.Out, label: 'provides tools' },
    { id: 'out_context',  type: PinType.Context,   direction: PinDirection.Out, label: 'provides context' },
  ],
  plugin: [
    { id: 'out_bundle', type: PinType.Bundle, direction: PinDirection.Out, label: 'exports' },
  ],
```

3. Add factory functions after `createHookData()`:
```typescript
export function createToolData(): ToolNodeData {
  return {
    label: 'New Tool',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    toolName: 'Bash',
    pattern: '',
    builtin: true,
    description: '',
  };
}

export function createMcpData(): McpNodeData {
  return {
    label: 'New MCP Server',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    serverName: '',
    connection: {
      type: 'url',
      url: '',
      command: '',
      args: [],
    },
    env: {},
    providedTools: [],
  };
}

export function createPluginData(): PluginNodeData {
  return {
    label: 'New Plugin',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    pluginName: '',
    version: '1.0.0',
    description: '',
    installScript: '',
  };
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build may still fail if validate.ts has Record<BlueprintNodeType,...> issues. Fix in Task 8. If build passes, great.

**Step 5: Commit**

```bash
git add src/constants/theme.ts src/constants/nodeDefaults.ts src/index.css
git commit -m "feat: add colors, pins, and factories for Tool/MCP/Plugin nodes"
```

---

## Task 4: Update store with new factories and plugin actions

**Files:**
- Modify: `src/store/useGraphStore.ts`

**Step 1: Update imports**

Add the 3 new factory imports on line 14:
```typescript
import { NODE_PIN_DEFINITIONS, createRulesData, createSkillData, createSubagentData, createHookData, createToolData, createMcpData, createPluginData } from '../constants/nodeDefaults';
```

**Step 2: Add factories to DATA_FACTORIES**

Extend the `DATA_FACTORIES` object (lines 20-25):
```typescript
const DATA_FACTORIES: Record<BlueprintNodeType, () => any> = {
  rules: createRulesData,
  skill: createSkillData,
  subagent: createSubagentData,
  hook: createHookData,
  tool: createToolData,
  mcp: createMcpData,
  plugin: createPluginData,
};
```

**Step 3: Add groupIntoPlugin and removeFromPlugin actions**

Add to the `GraphStore` interface (after `disconnectNode`):
```typescript
  groupIntoPlugin: (nodeIds: string[]) => void;
  removeFromPlugin: (nodeId: string) => void;
```

Add implementations inside the store (after `disconnectNode` implementation):

```typescript
groupIntoPlugin: (nodeIds) => {
  const { nodes } = get();
  const selectedNodes = nodes.filter((n) => nodeIds.includes(n.id) && !n.parentId);
  if (selectedNodes.length === 0) return;

  // Calculate bounding box
  const padding = 60;
  const headerHeight = 50;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of selectedNodes) {
    const w = (n.measured?.width ?? n.width ?? 300) as number;
    const h = (n.measured?.height ?? n.height ?? 200) as number;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }

  const pluginId = generateId();
  const pluginX = minX - padding;
  const pluginY = minY - padding - headerHeight;

  const pluginNode: Node = {
    id: pluginId,
    type: 'plugin',
    position: { x: pluginX, y: pluginY },
    data: createPluginData(),
    style: {
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2 + headerHeight,
    },
  };

  const updatedNodes = nodes.map((n) => {
    if (nodeIds.includes(n.id) && !n.parentId) {
      return {
        ...n,
        parentId: pluginId,
        position: {
          x: n.position.x - pluginX,
          y: n.position.y - pluginY,
        },
      };
    }
    return n;
  });

  set({ nodes: [pluginNode, ...updatedNodes] });
},

removeFromPlugin: (nodeId) => {
  const { nodes } = get();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !node.parentId) return;

  const parentNode = nodes.find((n) => n.id === node.parentId);
  if (!parentNode) return;

  set({
    nodes: nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            parentId: undefined,
            position: {
              x: n.position.x + parentNode.position.x,
              y: n.position.y + parentNode.position.y,
            },
          }
        : n
    ),
  });
},
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Passes (or minor issues from validate.ts DEFAULT_LABELS — fix in Task 8).

**Step 5: Commit**

```bash
git add src/store/useGraphStore.ts
git commit -m "feat: add plugin group/ungroup actions and new node factories to store"
```

---

## Task 5: Create ToolNode component and ToolEditor

**Files:**
- Create: `src/components/Nodes/ToolNode.tsx`
- Create: `src/components/PropertiesPanel/ToolEditor.tsx`

**Step 1: Create ToolNode.tsx**

```typescript
import { type NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';
import type { ToolNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

const COMMON_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'Task', 'Agent'];

export function ToolNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  return (
    <BaseNode
      id={id}
      nodeType="tool"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.tool}
      icon={Wrench}
      selected={selected}
    >
      <div className="space-y-1.5 text-xs">
        {/* Compact */}
        <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
          {nodeData.toolName || 'unnamed'}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {nodeData.pattern && (
            <span className="bp-badge font-mono" style={{ background: '#f9731630', color: '#fdba74' }}>
              {nodeData.pattern}
            </span>
          )}
          {nodeData.builtin && (
            <span className="bp-badge" style={{ background: '#64748b30', color: '#94a3b8' }}>
              built-in
            </span>
          )}
        </div>

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <select
              value={COMMON_TOOLS.includes(nodeData.toolName) ? nodeData.toolName : '__custom'}
              onChange={(e) => {
                if (e.target.value !== '__custom') {
                  updateNodeData(id, { toolName: e.target.value });
                }
              }}
              className="bp-select text-xs"
            >
              {COMMON_TOOLS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__custom">Custom...</option>
            </select>
            {!COMMON_TOOLS.includes(nodeData.toolName) && (
              <input
                value={nodeData.toolName}
                onChange={(e) => updateNodeData(id, { toolName: e.target.value })}
                placeholder="Custom tool name..."
                className="bp-input text-xs font-mono"
              />
            )}
            <input
              value={nodeData.pattern}
              onChange={(e) => updateNodeData(id, { pattern: e.target.value })}
              placeholder="No restriction"
              className="bp-input text-xs font-mono"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nodeData.builtin}
                onChange={(e) => updateNodeData(id, { builtin: e.target.checked })}
                className="accent-[#f97316]"
              />
              <span style={{ color: 'var(--text-secondary)' }}>Built-in tool</span>
            </label>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
```

**Step 2: Create ToolEditor.tsx**

```typescript
import { useGraphStore } from '../../store/useGraphStore';
import type { ToolNodeData } from '../../types/nodes';
import { CollapsibleSection } from '../shared/CollapsibleSection';

const COMMON_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'Task', 'Agent'];

interface ToolEditorProps {
  nodeId: string;
  data: Record<string, unknown>;
}

export function ToolEditor({ nodeId, data }: ToolEditorProps) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const toolData = data as unknown as ToolNodeData;

  return (
    <div className="space-y-3">
      <CollapsibleSection title="Tool Configuration" defaultOpen>
        <div className="space-y-2">
          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Tool Name</label>
          <select
            value={COMMON_TOOLS.includes(toolData.toolName) ? toolData.toolName : '__custom'}
            onChange={(e) => {
              if (e.target.value !== '__custom') {
                updateNodeData(nodeId, { toolName: e.target.value });
              } else {
                updateNodeData(nodeId, { toolName: '' });
              }
            }}
            className="bp-select text-xs"
          >
            {COMMON_TOOLS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="__custom">Custom...</option>
          </select>
          {!COMMON_TOOLS.includes(toolData.toolName) && (
            <input
              value={toolData.toolName}
              onChange={(e) => updateNodeData(nodeId, { toolName: e.target.value })}
              placeholder="Custom tool name..."
              className="bp-input text-xs font-mono"
            />
          )}

          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Pattern Restriction</label>
          <input
            value={toolData.pattern}
            onChange={(e) => updateNodeData(nodeId, { pattern: e.target.value })}
            placeholder="No restriction (e.g. git:*, npm:*)"
            className="bp-input text-xs font-mono"
          />

          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={toolData.builtin}
              onChange={(e) => updateNodeData(nodeId, { builtin: e.target.checked })}
              className="accent-[#f97316]"
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Built-in tool</span>
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Description">
        <textarea
          value={toolData.description}
          onChange={(e) => updateNodeData(nodeId, { description: e.target.value })}
          placeholder="What does this tool do..."
          className="bp-textarea text-xs"
          rows={3}
        />
      </CollapsibleSection>
    </div>
  );
}
```

**Step 3: Verify files created**

Run: `npm run build`
Expected: May not pass yet (not registered in canvas). That's fine — registration happens in Task 8.

**Step 4: Commit**

```bash
git add src/components/Nodes/ToolNode.tsx src/components/PropertiesPanel/ToolEditor.tsx
git commit -m "feat: add ToolNode component and ToolEditor properties panel"
```

---

## Task 6: Create McpNode component and McpEditor

**Files:**
- Create: `src/components/Nodes/McpNode.tsx`
- Create: `src/components/PropertiesPanel/McpEditor.tsx`

**Step 1: Create McpNode.tsx**

```typescript
import { type NodeProps } from '@xyflow/react';
import { Plug } from 'lucide-react';
import type { McpNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';

export function McpNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as McpNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);

  const updateConnection = (updates: Partial<McpNodeData['connection']>) => {
    updateNodeData(id, {
      connection: { ...nodeData.connection, ...updates },
    });
  };

  return (
    <BaseNode
      id={id}
      nodeType="mcp"
      data={nodeData}
      pins={NODE_PIN_DEFINITIONS.mcp}
      icon={Plug}
      selected={selected}
    >
      <div className="space-y-1.5 text-xs">
        {/* Compact */}
        <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
          {nodeData.serverName || 'unnamed server'}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span
            className="bp-badge"
            style={{
              background: nodeData.connection.type === 'url' ? '#06b6d430' : '#8b5cf630',
              color: nodeData.connection.type === 'url' ? '#67e8f9' : '#c4b5fd',
            }}
          >
            {nodeData.connection.type}
          </span>
          {nodeData.providedTools.length > 0 && (
            <span className="bp-badge" style={{ background: '#f9731630', color: '#fdba74' }}>
              {nodeData.providedTools.length} tool{nodeData.providedTools.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expanded */}
        {!nodeData.collapsed && (
          <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--node-border)' }}>
            <input
              value={nodeData.serverName}
              onChange={(e) => updateNodeData(id, { serverName: e.target.value })}
              placeholder="Server name..."
              className="bp-input text-xs"
            />
            <select
              value={nodeData.connection.type}
              onChange={(e) => updateConnection({ type: e.target.value as 'url' | 'stdio' })}
              className="bp-select text-xs"
            >
              <option value="url">URL</option>
              <option value="stdio">stdio</option>
            </select>
            {nodeData.connection.type === 'url' ? (
              <input
                value={nodeData.connection.url}
                onChange={(e) => updateConnection({ url: e.target.value })}
                placeholder="https://..."
                className="bp-input text-xs font-mono"
              />
            ) : (
              <>
                <input
                  value={nodeData.connection.command}
                  onChange={(e) => updateConnection({ command: e.target.value })}
                  placeholder="Command..."
                  className="bp-input text-xs font-mono"
                />
                <input
                  value={nodeData.connection.args.join(', ')}
                  onChange={(e) =>
                    updateConnection({ args: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                  }
                  placeholder="Args (comma-separated)..."
                  className="bp-input text-xs font-mono"
                />
              </>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
```

**Step 2: Create McpEditor.tsx**

```typescript
import { Plus, Trash2 } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';
import type { McpNodeData } from '../../types/nodes';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { KeyValueEditor } from '../shared/KeyValueEditor';

interface McpEditorProps {
  nodeId: string;
  data: Record<string, unknown>;
}

export function McpEditor({ nodeId, data }: McpEditorProps) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const mcpData = data as unknown as McpNodeData;

  const updateConnection = (updates: Partial<McpNodeData['connection']>) => {
    updateNodeData(nodeId, {
      connection: { ...mcpData.connection, ...updates },
    });
  };

  const addTool = () => {
    updateNodeData(nodeId, {
      providedTools: [...mcpData.providedTools, { name: '', description: '' }],
    });
  };

  const updateTool = (index: number, updates: Partial<{ name: string; description: string }>) => {
    const tools = [...mcpData.providedTools];
    tools[index] = { ...tools[index], ...updates };
    updateNodeData(nodeId, { providedTools: tools });
  };

  const removeTool = (index: number) => {
    updateNodeData(nodeId, {
      providedTools: mcpData.providedTools.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <CollapsibleSection title="Server Configuration" defaultOpen>
        <div className="space-y-2">
          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Server Name</label>
          <input
            value={mcpData.serverName}
            onChange={(e) => updateNodeData(nodeId, { serverName: e.target.value })}
            placeholder="my-server"
            className="bp-input text-xs"
          />

          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Connection Type</label>
          <select
            value={mcpData.connection.type}
            onChange={(e) => updateConnection({ type: e.target.value as 'url' | 'stdio' })}
            className="bp-select text-xs"
          >
            <option value="url">URL</option>
            <option value="stdio">stdio</option>
          </select>

          {mcpData.connection.type === 'url' ? (
            <>
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>URL</label>
              <input
                value={mcpData.connection.url}
                onChange={(e) => updateConnection({ url: e.target.value })}
                placeholder="https://..."
                className="bp-input text-xs font-mono"
              />
            </>
          ) : (
            <>
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Command</label>
              <input
                value={mcpData.connection.command}
                onChange={(e) => updateConnection({ command: e.target.value })}
                placeholder="npx, python, etc."
                className="bp-input text-xs font-mono"
              />
              <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Arguments</label>
              <input
                value={mcpData.connection.args.join(', ')}
                onChange={(e) =>
                  updateConnection({ args: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="arg1, arg2..."
                className="bp-input text-xs font-mono"
              />
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Environment Variables">
        <KeyValueEditor
          pairs={mcpData.env}
          onChange={(env) => updateNodeData(nodeId, { env })}
          keyPlaceholder="ENV_VAR"
          valuePlaceholder="value"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Provided Tools">
        <div className="space-y-2">
          {mcpData.providedTools.map((tool, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <div className="flex-1 space-y-1">
                <input
                  value={tool.name}
                  onChange={(e) => updateTool(i, { name: e.target.value })}
                  placeholder="Tool name"
                  className="bp-input text-xs font-mono"
                />
                <input
                  value={tool.description}
                  onChange={(e) => updateTool(i, { description: e.target.value })}
                  placeholder="Description..."
                  className="bp-input text-xs"
                />
              </div>
              <button
                onClick={() => removeTool(i)}
                className="p-1.5 rounded hover:bg-[#ef44441a] transition-colors mt-0.5"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addTool}
            className="flex items-center gap-1 text-xs py-1.5 px-2 rounded transition-colors w-full justify-center"
            style={{ color: 'var(--text-secondary)', border: '1px dashed var(--node-border)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#06b6d4'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--node-border)'; }}
          >
            <Plus size={12} /> Add Tool
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/Nodes/McpNode.tsx src/components/PropertiesPanel/McpEditor.tsx
git commit -m "feat: add McpNode component and McpEditor properties panel"
```

---

## Task 7: Create PluginNode component and PluginEditor

**Files:**
- Create: `src/components/Nodes/PluginNode.tsx`
- Create: `src/components/PropertiesPanel/PluginEditor.tsx`

**Step 1: Create PluginNode.tsx**

The Plugin node is different — it's a group container with dashed border, larger size, and special visual treatment. It does NOT use BaseNode because it needs a completely different layout (container for children).

```typescript
import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Package, ChevronDown, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import type { PluginNodeData } from '../../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../../constants/nodeDefaults';
import { PinDirection } from '../../types/pins';
import { TypedHandle } from '../Pins/TypedHandle';
import { useGraphStore } from '../../store/useGraphStore';

function PluginNodeInner({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as PluginNodeData;
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const nodes = useGraphStore((s) => s.nodes);
  const pins = NODE_PIN_DEFINITIONS.plugin;
  const outputPins = pins.filter((p) => p.direction === PinDirection.Out);

  const children = nodes.filter((n) => n.parentId === id);
  const hasErrors = nodeData.validation.errors.length > 0;
  const hasWarnings = nodeData.validation.warnings.length > 0;

  // Count children by type
  const counts: Record<string, number> = {};
  children.forEach((c) => {
    const t = c.type || 'unknown';
    counts[t] = (counts[t] || 0) + 1;
  });
  const countStr = Object.entries(counts)
    .map(([t, n]) => `${n} ${t}${n > 1 ? 's' : ''}`)
    .join(', ');

  return (
    <div
      className="blueprint-node rounded-lg overflow-visible"
      style={{
        border: `2px dashed ${selected ? '#f43f5e' : '#f43f5e40'}`,
        background: '#f43f5e08',
        minWidth: 400,
        minHeight: 200,
        width: '100%',
        height: '100%',
        boxShadow: selected ? '0 0 20px #f43f5e40' : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: '#f43f5e15',
          borderBottom: '1px dashed #f43f5e30',
        }}
      >
        <Package size={16} style={{ color: '#f43f5e' }} />
        <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
          {nodeData.label}
        </span>
        {nodeData.version && (
          <span className="bp-badge" style={{ background: '#f43f5e20', color: '#fb7185' }}>
            v{nodeData.version}
          </span>
        )}
        {countStr && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {countStr}
          </span>
        )}
        {hasErrors && <AlertCircle size={14} style={{ color: '#ef4444' }} />}
        {!hasErrors && hasWarnings && <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateNodeData(id, { collapsed: !nodeData.collapsed });
          }}
          className="p-0.5 rounded hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          {nodeData.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Output pins on header */}
        {outputPins.map((pin) => (
          <TypedHandle key={pin.id} pin={pin} />
        ))}
      </div>

      {/* Expanded details */}
      {!nodeData.collapsed && (
        <div className="px-3 py-2 space-y-1.5 text-xs" style={{ borderBottom: '1px dashed #f43f5e20' }}>
          <input
            value={nodeData.pluginName}
            onChange={(e) => updateNodeData(id, { pluginName: e.target.value })}
            placeholder="Plugin name..."
            className="bp-input text-xs"
          />
          <input
            value={nodeData.version}
            onChange={(e) => updateNodeData(id, { version: e.target.value })}
            placeholder="1.0.0"
            className="bp-input text-xs font-mono"
          />
        </div>
      )}
    </div>
  );
}

export const PluginNode = memo(PluginNodeInner);
```

**Step 2: Create PluginEditor.tsx**

```typescript
import { useGraphStore } from '../../store/useGraphStore';
import type { PluginNodeData } from '../../types/nodes';
import { CollapsibleSection } from '../shared/CollapsibleSection';

interface PluginEditorProps {
  nodeId: string;
  data: Record<string, unknown>;
}

export function PluginEditor({ nodeId, data }: PluginEditorProps) {
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const nodes = useGraphStore((s) => s.nodes);
  const pluginData = data as unknown as PluginNodeData;

  const children = nodes.filter((n) => n.parentId === nodeId);

  return (
    <div className="space-y-3">
      <CollapsibleSection title="Plugin Configuration" defaultOpen>
        <div className="space-y-2">
          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Plugin Name</label>
          <input
            value={pluginData.pluginName}
            onChange={(e) => updateNodeData(nodeId, { pluginName: e.target.value })}
            placeholder="my-plugin"
            className="bp-input text-xs"
          />

          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Version</label>
          <input
            value={pluginData.version}
            onChange={(e) => updateNodeData(nodeId, { version: e.target.value })}
            placeholder="1.0.0"
            className="bp-input text-xs font-mono"
          />

          <label className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Description</label>
          <textarea
            value={pluginData.description}
            onChange={(e) => updateNodeData(nodeId, { description: e.target.value })}
            placeholder="What this plugin bundles..."
            className="bp-textarea text-xs"
            rows={3}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Install Script">
        <textarea
          value={pluginData.installScript}
          onChange={(e) => updateNodeData(nodeId, { installScript: e.target.value })}
          placeholder="npm install ...\ncp -r templates/ ..."
          className="bp-textarea text-xs font-mono"
          rows={4}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Children" defaultOpen>
        {children.length === 0 ? (
          <div className="text-[11px] text-center py-3" style={{ color: 'var(--text-muted)' }}>
            Drag nodes into the plugin container to group them
          </div>
        ) : (
          <div className="space-y-1">
            {children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                style={{ background: '#0d1117', border: '1px solid var(--node-border)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{child.type}</span>
                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                  {(child.data as { label?: string }).label || 'Untitled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/Nodes/PluginNode.tsx src/components/PropertiesPanel/PluginEditor.tsx
git commit -m "feat: add PluginNode group container and PluginEditor properties panel"
```

---

## Task 8: Register new nodes in Canvas, Palette, PropertiesPanel, and Validation

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx`
- Modify: `src/components/Palette/NodePalette.tsx`
- Modify: `src/components/PropertiesPanel/PropertiesPanel.tsx`
- Modify: `src/validation/validate.ts`

**Step 1: Register in BlueprintCanvas.tsx**

Add imports (after line 22):
```typescript
import { ToolNode } from '../Nodes/ToolNode';
import { McpNode } from '../Nodes/McpNode';
import { PluginNode } from '../Nodes/PluginNode';
```

Update `nodeTypes` (lines 25-30):
```typescript
const nodeTypes: NodeTypes = {
  rules: RulesNode,
  skill: SkillNode,
  subagent: SubagentNode,
  hook: HookNode,
  tool: ToolNode,
  mcp: McpNode,
  plugin: PluginNode,
};
```

**Step 2: Register in NodePalette.tsx**

Add imports: `Wrench, Plug, Package` from lucide-react (update line 1).

Add 3 items to `PALETTE_ITEMS` array (after hook):
```typescript
  { type: 'tool', label: 'Tool', description: 'Atomic tool unit (Read, Write, Bash, etc.)', icon: Wrench },
  { type: 'mcp', label: 'MCP Server', description: 'External service via MCP protocol', icon: Plug },
  { type: 'plugin', label: 'Plugin', description: 'Bundle container for skills, agents, hooks', icon: Package },
```

**Step 3: Register in PropertiesPanel.tsx**

Add imports:
```typescript
import { Wrench, Plug, Package } from 'lucide-react';
import { ToolEditor } from './ToolEditor';
import { McpEditor } from './McpEditor';
import { PluginEditor } from './PluginEditor';
```

Update `NODE_ICONS`:
```typescript
const NODE_ICONS: Record<BlueprintNodeType, LucideIcon> = {
  rules: FileText,
  skill: Zap,
  subagent: Bot,
  hook: Webhook,
  tool: Wrench,
  mcp: Plug,
  plugin: Package,
};
```

Update `NODE_TYPE_LABELS`:
```typescript
const NODE_TYPE_LABELS: Record<BlueprintNodeType, string> = {
  rules: 'CLAUDE.md',
  skill: 'Skill',
  subagent: 'Subagent',
  hook: 'Hook',
  tool: 'Tool',
  mcp: 'MCP Server',
  plugin: 'Plugin',
};
```

Add editor routing in the JSX (after hook editor line 74):
```tsx
{nodeType === 'tool' && <ToolEditor nodeId={node.id} data={data} />}
{nodeType === 'mcp' && <McpEditor nodeId={node.id} data={data} />}
{nodeType === 'plugin' && <PluginEditor nodeId={node.id} data={data} />}
```

**Step 4: Update validation DEFAULT_LABELS**

In `src/validation/validate.ts`, update the DEFAULT_LABELS and add imports:

```typescript
import type { BlueprintNodeType, SkillNodeData, HookNodeData, SubagentNodeData, ToolNodeData, McpNodeData } from '../types/nodes';

const DEFAULT_LABELS: Record<BlueprintNodeType, string> = {
  rules: 'CLAUDE.md',
  skill: 'New Skill',
  subagent: 'New Subagent',
  hook: 'New Hook',
  tool: 'New Tool',
  mcp: 'New MCP Server',
  plugin: 'New Plugin',
};
```

Add new validation rules inside the `for (const node of nodes)` loop:

```typescript
    if (nodeType === 'tool') {
      const toolData = data as unknown as ToolNodeData;
      if (!toolData.toolName.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'Tool must have a name' });
      }
    }

    if (nodeType === 'mcp') {
      const mcpData = data as unknown as McpNodeData;
      if (!mcpData.serverName.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'MCP server must have a name' });
      }
      if (mcpData.connection.type === 'url' && !mcpData.connection.url.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'MCP URL server must have a URL' });
      }
      if (mcpData.connection.type === 'stdio' && !mcpData.connection.command.trim()) {
        results.push({ nodeId: node.id, level: 'error', message: 'MCP stdio server must have a command' });
      }
    }

    if (nodeType === 'plugin') {
      const childCount = nodes.filter((n) => n.parentId === node.id).length;
      if (childCount === 0) {
        results.push({ nodeId: node.id, level: 'warning', message: 'Plugin has no children — consider adding skills, agents, or hooks' });
      }
    }
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 6: Test in browser**

Run: `npm run dev`
- Verify 7 node types in palette (4 original + 3 new)
- Drag each new type onto canvas — renders correctly
- Click each — PropertiesPanel shows correct editor
- Edit fields — node updates live
- Run Validate — new rules fire

**Step 7: Commit**

```bash
git add src/components/Canvas/BlueprintCanvas.tsx src/components/Palette/NodePalette.tsx src/components/PropertiesPanel/PropertiesPanel.tsx src/validation/validate.ts
git commit -m "feat: register Tool/MCP/Plugin nodes in canvas, palette, panel, and validation"
```

---

## Task 9: Add auto-layout with dagre

**Files:**
- Create: `src/utils/layout.ts`
- Modify: `src/store/useGraphStore.ts` (add `autoLayout` action + `layouting` flag)
- Modify: `src/components/Toolbar/Toolbar.tsx` (wire up auto-layout button)
- Modify: `src/index.css` (add transition class)

**Step 1: Create layout.ts**

```typescript
import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction: 'TB' | 'LR' | 'BT' | 'RL';
  nodeSpacing: number;
  rankSpacing: number;
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = { direction: 'LR', nodeSpacing: 80, rankSpacing: 200 }
): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: options.direction,
    nodesep: options.nodeSpacing,
    ranksep: options.rankSpacing,
    marginx: 50,
    marginy: 50,
  });

  // Only layout top-level nodes (not plugin children)
  nodes.forEach((node) => {
    if (!node.parentId) {
      g.setNode(node.id, {
        width: (node.measured?.width ?? node.width ?? 300) as number,
        height: (node.measured?.height ?? node.height ?? 200) as number,
      });
    }
  });

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (sourceNode && targetNode && !sourceNode.parentId && !targetNode.parentId) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  return nodes.map((node) => {
    if (node.parentId) return node;

    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
    };
  });
}
```

**Step 2: Add autoLayout action and layouting flag to store**

In `src/store/useGraphStore.ts`:

Add import:
```typescript
import { applyDagreLayout } from '../utils/layout';
```

Add to GraphStore interface:
```typescript
  layouting: boolean;
  autoLayout: (direction?: 'TB' | 'LR' | 'BT' | 'RL') => void;
```

Add initial state:
```typescript
layouting: false,
```

Add implementation:
```typescript
autoLayout: (direction = 'LR') => {
  const { nodes, edges } = get();
  if (nodes.length === 0) return;
  const layoutedNodes = applyDagreLayout(nodes, edges, {
    direction,
    nodeSpacing: 80,
    rankSpacing: 200,
  });
  set({ nodes: layoutedNodes, layouting: true });
  setTimeout(() => set({ layouting: false }), 350);
},
```

Add `layouting` to partialize exclusion — it should NOT be in the temporal partialize (it's UI state, already excluded since partialize only includes `nodes` and `edges`). No change needed.

**Step 3: Add CSS transition for layout animation**

In `src/index.css`, add after `.blueprint-node` block:

```css
.layouting .react-flow__node {
  transition: transform 0.3s ease-in-out;
}
```

**Step 4: Wire up Toolbar auto-layout button**

In `src/components/Toolbar/Toolbar.tsx`:

Add state for direction dropdown:
```typescript
import { useState, useRef } from 'react';
```

Add store selectors:
```typescript
const autoLayout = useGraphStore((s) => s.autoLayout);
const layouting = useGraphStore((s) => s.layouting);
```

Replace the empty onClick on the Auto-layout button. Add a dropdown approach — simplest is to just wire the button to call `autoLayout('LR')` directly, with a secondary click option. For now, just wire it:

```typescript
<ToolbarButton icon={LayoutGrid} label="Auto-layout" onClick={() => autoLayout('LR')} />
```

**Step 5: Apply layouting class to ReactFlow container**

In `src/components/Canvas/BlueprintCanvas.tsx`:

Add store selector:
```typescript
const layouting = useGraphStore((s) => s.layouting);
```

Add `fitView` call after layout (in useEffect):
```typescript
const { fitView } = useReactFlow();

useEffect(() => {
  if (layouting) {
    const timer = setTimeout(() => fitView({ padding: 0.2 }), 350);
    return () => clearTimeout(timer);
  }
}, [layouting, fitView]);
```

Add className to the ReactFlow wrapper div:
```tsx
<div ref={reactFlowRef} className={`flex-1 relative ${layouting ? 'layouting' : ''}`}>
```

**Step 6: Verify build and test**

Run: `npm run build` then `npm run dev`
- Add several nodes with edges
- Click Auto-layout
- Nodes should smoothly animate into a left-to-right layout
- fitView should center the view after layout

**Step 7: Commit**

```bash
git add src/utils/layout.ts src/store/useGraphStore.ts src/components/Toolbar/Toolbar.tsx src/components/Canvas/BlueprintCanvas.tsx src/index.css
git commit -m "feat: add dagre-based auto-layout with smooth animation"
```

---

## Task 10: Add templates

**Files:**
- Create: `src/constants/templates.ts`
- Modify: `src/components/Palette/NodePalette.tsx`

**Step 1: Create templates.ts**

This file defines 4 template graph configurations. Copy the full template definitions from the Phase 2 spec document (`docs/claude-blueprint-phase2-prompt.md`, sections on templates 1-4).

```typescript
import type { Node, Edge } from '@xyflow/react';
import { createRulesData, createSkillData, createSubagentData, createHookData } from './nodeDefaults';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'pipeline' | 'research' | 'safety' | 'starter';
  graph: {
    nodes: Node[];
    edges: Edge[];
  };
}

const prReviewPipeline: Template = {
  id: 'pr-review',
  name: 'PR Review Pipeline',
  description: 'Automated PR review with code exploration and security checks',
  icon: '🔍',
  category: 'pipeline',
  graph: {
    nodes: [
      {
        id: 'tmpl_rules',
        type: 'rules',
        position: { x: 0, y: 150 },
        data: {
          ...createRulesData(),
          label: 'Project Rules',
          content: '# Code Standards\n\n- Follow existing patterns\n- All functions must have JSDoc\n- No console.log in production code',
        },
      },
      {
        id: 'tmpl_fetch_skill',
        type: 'skill',
        position: { x: 300, y: 0 },
        data: {
          ...createSkillData(),
          label: 'Fetch PR Data',
          frontmatter: {
            name: 'fetch-pr',
            description: 'Fetch pull request diff and comments',
            context: 'fork' as const,
            agent: 'Explore',
            allowedTools: ['Read', 'Grep', 'Glob', 'Bash(gh:*)'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Fetch PR Context\n\nGather all PR data for review.',
          dynamicInjections: ['!`gh pr diff`', '!`gh pr view --comments`'],
        },
      },
      {
        id: 'tmpl_reviewer',
        type: 'subagent',
        position: { x: 650, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Code Reviewer',
          name: 'code-reviewer',
          agentType: 'Explore',
          allowedTools: ['Read', 'Grep', 'Glob'],
          systemPrompt: 'You are a senior code reviewer. Analyze the PR diff for:\n1. Logic errors\n2. Security issues\n3. Performance problems\n4. Style violations\n\nBe thorough but constructive.',
        },
      },
      {
        id: 'tmpl_security_hook',
        type: 'hook',
        position: { x: 650, y: 300 },
        data: {
          ...createHookData(),
          label: 'Security Check',
          event: 'PreToolUse' as const,
          matcher: 'Bash',
          command: './hooks/security-check.sh',
          decision: { type: 'deny' as const, reason: 'Blocked by security policy', modifyInput: false },
        },
      },
      {
        id: 'tmpl_write_skill',
        type: 'skill',
        position: { x: 1000, y: 0 },
        data: {
          ...createSkillData(),
          label: 'Write Review',
          frontmatter: {
            name: 'write-review',
            description: 'Compile review findings into a PR comment',
            context: 'conversation' as const,
            agent: 'inherit',
            allowedTools: ['Write', 'Bash(gh:*)'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Write Review Comment\n\nCompile all findings into a structured review comment and post to the PR.',
        },
      },
    ],
    edges: [
      { id: 'tmpl_e1', source: 'tmpl_rules', sourceHandle: 'out_context', target: 'tmpl_fetch_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'context' } },
      { id: 'tmpl_e2', source: 'tmpl_fetch_skill', sourceHandle: 'out_exec', target: 'tmpl_reviewer', targetHandle: 'in_exec', type: 'typed', data: { pinType: 'exec' } },
      { id: 'tmpl_e3', source: 'tmpl_fetch_skill', sourceHandle: 'out_delegation', target: 'tmpl_reviewer', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_e4', source: 'tmpl_reviewer', sourceHandle: 'out_result', target: 'tmpl_write_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
      { id: 'tmpl_e5', source: 'tmpl_reviewer', sourceHandle: 'out_exec', target: 'tmpl_write_skill', targetHandle: 'in_exec', type: 'typed', data: { pinType: 'exec' } },
      { id: 'tmpl_e6', source: 'tmpl_security_hook', sourceHandle: 'out_decision', target: 'tmpl_reviewer', targetHandle: 'in_trigger', type: 'typed', data: { pinType: 'decision' } },
    ],
  },
};

const multiAgentResearch: Template = {
  id: 'multi-research',
  name: 'Multi-Agent Research',
  description: '3 parallel research agents merging findings into a single document',
  icon: '🔬',
  category: 'research',
  graph: {
    nodes: [
      {
        id: 'tmpl_research_skill',
        type: 'skill',
        position: { x: 0, y: 150 },
        data: {
          ...createSkillData(),
          label: 'Research Topic',
          frontmatter: {
            name: 'research',
            description: 'Research a topic by spawning parallel agents',
            context: 'conversation' as const,
            agent: 'inherit',
            allowedTools: ['Read', 'WebSearch', 'Task'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Research Pipeline\n\nSpawn 3 parallel agents to research from different angles.',
        },
      },
      {
        id: 'tmpl_web_agent',
        type: 'subagent',
        position: { x: 400, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Web Docs Agent',
          name: 'web-docs',
          agentType: 'general-purpose' as const,
          allowedTools: ['WebSearch', 'Read'],
          systemPrompt: 'Search official documentation and find best practices, recommended patterns, and relevant GitHub discussions.',
        },
      },
      {
        id: 'tmpl_so_agent',
        type: 'subagent',
        position: { x: 400, y: 200 },
        data: {
          ...createSubagentData(),
          label: 'StackOverflow Agent',
          name: 'stackoverflow',
          agentType: 'general-purpose' as const,
          allowedTools: ['WebSearch', 'Read'],
          systemPrompt: 'Search StackOverflow for similar problems. Find highly-voted answers. Note common pitfalls.',
        },
      },
      {
        id: 'tmpl_explore_agent',
        type: 'subagent',
        position: { x: 400, y: 400 },
        data: {
          ...createSubagentData(),
          label: 'Codebase Explorer',
          name: 'codebase-explorer',
          agentType: 'Explore' as const,
          allowedTools: ['Read', 'Grep', 'Glob'],
          systemPrompt: 'Search the codebase for related patterns, existing solutions, and relevant files.',
        },
      },
      {
        id: 'tmpl_merge_skill',
        type: 'skill',
        position: { x: 800, y: 150 },
        data: {
          ...createSkillData(),
          label: 'Merge Findings',
          frontmatter: {
            name: 'merge-findings',
            description: 'Compile research from all agents into a report',
            context: 'conversation' as const,
            agent: 'inherit',
            allowedTools: ['Write'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Merge Research\n\nCombine all agent findings into docs/research/<topic>.md',
        },
      },
    ],
    edges: [
      { id: 'tmpl_r1', source: 'tmpl_research_skill', sourceHandle: 'out_delegation', target: 'tmpl_web_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_r2', source: 'tmpl_research_skill', sourceHandle: 'out_delegation', target: 'tmpl_so_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_r3', source: 'tmpl_research_skill', sourceHandle: 'out_delegation', target: 'tmpl_explore_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_r4', source: 'tmpl_web_agent', sourceHandle: 'out_result', target: 'tmpl_merge_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
      { id: 'tmpl_r5', source: 'tmpl_so_agent', sourceHandle: 'out_result', target: 'tmpl_merge_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
      { id: 'tmpl_r6', source: 'tmpl_explore_agent', sourceHandle: 'out_result', target: 'tmpl_merge_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'result' } },
    ],
  },
};

const safeDeployment: Template = {
  id: 'safe-deploy',
  name: 'Safe Deployment',
  description: 'Guarded deployment with test runner, security hooks, and notifications',
  icon: '🛡️',
  category: 'safety',
  graph: {
    nodes: [
      {
        id: 'tmpl_session_hook',
        type: 'hook',
        position: { x: 0, y: 0 },
        data: {
          ...createHookData(),
          label: 'Load Environment',
          event: 'SessionStart' as const,
          matcher: '*',
          command: 'echo "Loading deploy environment..." && cat .env.deploy',
          decision: { type: 'none' as const, reason: '', modifyInput: false },
        },
      },
      {
        id: 'tmpl_deploy_skill',
        type: 'skill',
        position: { x: 300, y: 100 },
        data: {
          ...createSkillData(),
          label: 'Deploy',
          frontmatter: {
            name: 'deploy',
            description: 'Run deployment pipeline with safety checks',
            context: 'conversation' as const,
            agent: 'inherit',
            allowedTools: ['Bash(deploy:*)', 'Read', 'Write'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Deployment\n\n1. Run tests\n2. Build\n3. Deploy to staging\n4. Smoke test\n5. Promote to production',
        },
      },
      {
        id: 'tmpl_test_agent',
        type: 'subagent',
        position: { x: 650, y: 0 },
        data: {
          ...createSubagentData(),
          label: 'Test Runner',
          name: 'test-runner',
          agentType: 'general-purpose' as const,
          allowedTools: ['Bash(npm test:*)', 'Bash(pytest:*)', 'Read'],
          systemPrompt: 'Run the full test suite. Report any failures with file paths and error messages.',
        },
      },
      {
        id: 'tmpl_bash_guard',
        type: 'hook',
        position: { x: 650, y: 250 },
        data: {
          ...createHookData(),
          label: 'Bash Guard',
          event: 'PreToolUse' as const,
          matcher: 'Bash',
          command: './hooks/validate-deploy-commands.sh',
          decision: { type: 'deny' as const, reason: 'Command not in deployment allowlist', modifyInput: false },
        },
      },
      {
        id: 'tmpl_stop_hook',
        type: 'hook',
        position: { x: 1000, y: 100 },
        data: {
          ...createHookData(),
          label: 'Notify on Complete',
          event: 'Stop' as const,
          matcher: '*',
          command: 'echo "Deploy complete!"',
          decision: { type: 'none' as const, reason: '', modifyInput: false },
        },
      },
    ],
    edges: [
      { id: 'tmpl_d1', source: 'tmpl_session_hook', sourceHandle: 'out_context', target: 'tmpl_deploy_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'context' } },
      { id: 'tmpl_d2', source: 'tmpl_deploy_skill', sourceHandle: 'out_delegation', target: 'tmpl_test_agent', targetHandle: 'in_delegation', type: 'typed', data: { pinType: 'delegation' } },
      { id: 'tmpl_d3', source: 'tmpl_deploy_skill', sourceHandle: 'out_exec', target: 'tmpl_test_agent', targetHandle: 'in_exec', type: 'typed', data: { pinType: 'exec' } },
      { id: 'tmpl_d4', source: 'tmpl_bash_guard', sourceHandle: 'out_decision', target: 'tmpl_test_agent', targetHandle: 'in_trigger', type: 'typed', data: { pinType: 'decision' } },
      { id: 'tmpl_d5', source: 'tmpl_test_agent', sourceHandle: 'out_exec', target: 'tmpl_stop_hook', targetHandle: 'in_trigger', type: 'typed', data: { pinType: 'trigger' } },
    ],
  },
};

const starterConfig: Template = {
  id: 'starter',
  name: 'Starter Config',
  description: 'Minimal starting point with project rules and one skill',
  icon: '🚀',
  category: 'starter',
  graph: {
    nodes: [
      {
        id: 'tmpl_starter_rules',
        type: 'rules',
        position: { x: 0, y: 100 },
        data: {
          ...createRulesData(),
          label: 'Project Rules',
          content: '# My Project\n\n## Tech Stack\n- \n\n## Conventions\n- \n\n## Commands\n- Build: `npm run build`\n- Test: `npm test`\n- Lint: `npm run lint`',
        },
      },
      {
        id: 'tmpl_starter_skill',
        type: 'skill',
        position: { x: 400, y: 100 },
        data: {
          ...createSkillData(),
          label: 'My First Skill',
          frontmatter: {
            name: 'my-skill',
            description: 'Describe when this skill should be used',
            context: 'conversation' as const,
            agent: 'inherit',
            allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
            model: 'inherit',
            version: '1.0.0',
          },
          instructions: '## Instructions\n\nDescribe what this skill does step by step.',
        },
      },
    ],
    edges: [
      { id: 'tmpl_s1', source: 'tmpl_starter_rules', sourceHandle: 'out_context', target: 'tmpl_starter_skill', targetHandle: 'in_context', type: 'typed', data: { pinType: 'context' } },
    ],
  },
};

export const TEMPLATES: Template[] = [
  prReviewPipeline,
  multiAgentResearch,
  safeDeployment,
  starterConfig,
];
```

**Step 2: Integrate templates into NodePalette.tsx**

Replace the "Coming in Phase 2" placeholder block with:

```typescript
import { TEMPLATES } from '../../constants/templates';
import { useGraphStore } from '../../store/useGraphStore';
import { useReactFlow } from '@xyflow/react';
```

Add inside the component:
```typescript
const importJSON = useGraphStore((s) => s.importJSON);
const { fitView } = useReactFlow();

const loadTemplate = (template: typeof TEMPLATES[0]) => {
  if (!window.confirm(`Load "${template.name}"? This will replace the current graph.`)) return;
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

Replace the "Coming in Phase 2" div with:
```tsx
<div className="space-y-1.5">
  {TEMPLATES.map((template) => (
    <button
      key={template.id}
      onClick={() => loadTemplate(template)}
      className="w-full text-left px-2.5 py-2 rounded-lg transition-colors"
      style={{ border: '1px solid transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--node-border)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--node-border)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
      }}
    >
      <div className="flex items-center gap-2">
        <span>{template.icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {template.name}
        </span>
      </div>
      <p className="text-[10px] mt-0.5 ml-6" style={{ color: 'var(--text-muted)' }}>
        {template.description}
      </p>
    </button>
  ))}
</div>
```

**Step 3: Verify and test**

Run: `npm run build` then `npm run dev`
- 4 templates visible in palette sidebar
- Click template → confirmation dialog
- On confirm → graph loads, nodes and edges render, fitView centers

**Step 4: Commit**

```bash
git add src/constants/templates.ts src/components/Palette/NodePalette.tsx
git commit -m "feat: add 4 preset templates (PR Review, Research, Deploy, Starter)"
```

---

## Task 11: Add undo/redo toolbar buttons

**Files:**
- Modify: `src/components/Toolbar/Toolbar.tsx`

**Step 1: Add undo/redo buttons to toolbar**

Add imports:
```typescript
import { ShieldCheck, LayoutGrid, Save, Upload, Trash2, Undo2, Redo2 } from 'lucide-react';
```

Add temporal store usage inside the Toolbar component:
```typescript
const canUndo = useGraphStore.temporal.getState().pastStates.length > 0;
const canRedo = useGraphStore.temporal.getState().futureStates.length > 0;
const undo = () => useGraphStore.temporal.getState().undo();
const redo = () => useGraphStore.temporal.getState().redo();
```

**Note:** The above won't be reactive. For reactivity, use `useMemo` with a subscription or access the temporal store via `useStore`. A simpler approach — since the toolbar re-renders on store changes anyway — is to use the temporal store's state through zustand:

```typescript
import { useStore } from 'zustand';

// Inside Toolbar:
const canUndo = useStore(useGraphStore.temporal, (s) => s.pastStates.length > 0);
const canRedo = useStore(useGraphStore.temporal, (s) => s.futureStates.length > 0);
const undo = useStore(useGraphStore.temporal, (s) => s.undo);
const redo = useStore(useGraphStore.temporal, (s) => s.redo);
```

Add buttons in the actions area, before Validate:
```tsx
<ToolbarButton icon={Undo2} label="Undo" onClick={undo} disabled={!canUndo} />
<ToolbarButton icon={Redo2} label="Redo" onClick={redo} disabled={!canRedo} />
<div className="w-px h-5 mx-1" style={{ background: 'var(--node-border)' }} />
```

Update `ToolbarButton` to accept `disabled` prop:
```typescript
function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
      style={{
        color: danger ? '#ef4444' : 'var(--text-secondary)',
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).style.background = 'var(--node-border)';
        if (!danger) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = danger ? '#ef4444' : 'var(--text-secondary)';
      }}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
```

**Step 2: Verify and test**

Run: `npm run dev`
- Undo/Redo buttons visible in toolbar
- Disabled when no history
- Add a node → Undo button becomes active → click → node removed
- Click Redo → node restored

**Step 3: Commit**

```bash
git add src/components/Toolbar/Toolbar.tsx
git commit -m "feat: add undo/redo toolbar buttons with reactive state"
```

---

## Task 12: Extend context menu with new options

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx`

**Step 1: Add "Group into Plugin" and "Remove from Plugin" to node context menu**

In the context menu JSX, after "Disconnect all" and before "Delete", add a divider and two conditional items:

```tsx
{/* Divider */}
<div style={{ height: 1, background: 'var(--node-border)', margin: '4px 0' }} />

{/* Group into Plugin — only if node is NOT in a plugin */}
{!contextMenuNode?.parentId && (
  <div
    className="context-menu-item"
    onClick={() => {
      groupIntoPlugin([contextMenu.nodeId]);
      setContextMenu(null);
    }}
  >
    Group into Plugin
  </div>
)}

{/* Remove from Plugin — only if node IS in a plugin */}
{contextMenuNode?.parentId && (
  <div
    className="context-menu-item"
    onClick={() => {
      removeFromPlugin(contextMenu.nodeId);
      setContextMenu(null);
    }}
  >
    Remove from Plugin
  </div>
)}
```

Add store selectors:
```typescript
const groupIntoPlugin = useGraphStore((s) => s.groupIntoPlugin);
const removeFromPlugin = useGraphStore((s) => s.removeFromPlugin);
```

Derive contextMenuNode:
```typescript
const contextMenuNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;
```

**Step 2: Add canvas right-click context menu for adding nodes + auto-layout**

Currently only node right-click is handled. Add canvas right-click (`onPaneContextMenu`) that allows adding nodes at click position:

Add state for canvas context menu:
```typescript
const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
```

Add handler:
```typescript
const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
  event.preventDefault();
  setCanvasMenu({ x: event.clientX, y: event.clientY });
}, []);
```

Add to `<ReactFlow>` props:
```tsx
onPaneContextMenu={onPaneContextMenu}
```

Add canvas context menu JSX (after the node context menu):
```tsx
{canvasMenu && (
  <div
    className="context-menu"
    style={{ left: canvasMenu.x, top: canvasMenu.y }}
    onClick={(e) => e.stopPropagation()}
  >
    {(['rules', 'skill', 'subagent', 'hook', 'tool', 'mcp', 'plugin'] as BlueprintNodeType[]).map((type) => (
      <div
        key={type}
        className="context-menu-item"
        onClick={() => {
          const position = screenToFlowPosition({ x: canvasMenu.x, y: canvasMenu.y });
          addNode(type, position);
          setCanvasMenu(null);
        }}
      >
        Add {type.charAt(0).toUpperCase() + type.slice(1)} node
      </div>
    ))}
    <div style={{ height: 1, background: 'var(--node-border)', margin: '4px 0' }} />
    <div
      className="context-menu-item"
      onClick={() => {
        autoLayout('LR');
        setCanvasMenu(null);
      }}
    >
      Auto-layout
    </div>
  </div>
)}
```

Add store selectors for autoLayout:
```typescript
const autoLayout = useGraphStore((s) => s.autoLayout);
```

Close canvas menu on click and escape (add to existing handlers):
```typescript
// In handleClick:
const handleClick = () => { setContextMenu(null); setCanvasMenu(null); };
// In handleKeyDown Escape:
if (e.key === 'Escape') { setContextMenu(null); setCanvasMenu(null); }
```

**Step 3: Verify and test**

Run: `npm run dev`
- Right-click canvas → shows "Add X node" for all 7 types + "Auto-layout"
- Right-click node → shows Duplicate, Disconnect, Group into Plugin (if not in plugin), Delete
- Group into Plugin → creates plugin container around the node

**Step 4: Commit**

```bash
git add src/components/Canvas/BlueprintCanvas.tsx
git commit -m "feat: extend context menus with new nodes, plugin grouping, and auto-layout"
```

---

## Task 13: Extended validation — semantic checks

**Files:**
- Modify: `src/validation/validate.ts`

**Step 1: Add circular delegation detection and duplicate skill name detection**

Add these checks after the existing validation loop (or as part of a new section after the `for` loop closes):

```typescript
  // Circular delegation detection
  const delegationGraph = new Map<string, string[]>();
  edges
    .filter((e) => e.data?.pinType === 'delegation')
    .forEach((e) => {
      const targets = delegationGraph.get(e.source) ?? [];
      targets.push(e.target);
      delegationGraph.set(e.source, targets);
    });

  const visited = new Set<string>();
  const stack = new Set<string>();

  function detectCycle(nodeId: string, path: string[]): void {
    if (stack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart);
      const labels = cycle.map((id) => {
        const n = nodes.find((nd) => nd.id === id);
        return (n?.data as { label?: string })?.label || id;
      });
      results.push({
        nodeId: cycle[0],
        level: 'warning',
        message: `Circular delegation: ${labels.join(' → ')} → ${labels[0]}`,
      });
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);
    (delegationGraph.get(nodeId) ?? []).forEach((next) => detectCycle(next, [...path]));
    stack.delete(nodeId);
  }

  nodes.forEach((n) => {
    if (!visited.has(n.id)) detectCycle(n.id, []);
  });

  // Duplicate skill names
  const skillNodes = nodes.filter((n) => n.type === 'skill');
  const skillNameMap = new Map<string, string[]>();
  skillNodes.forEach((n) => {
    const name = (n.data as unknown as SkillNodeData).frontmatter.name;
    if (name) {
      const ids = skillNameMap.get(name) ?? [];
      ids.push(n.id);
      skillNameMap.set(name, ids);
    }
  });
  skillNameMap.forEach((ids, name) => {
    if (ids.length > 1) {
      ids.forEach((id) => {
        results.push({
          nodeId: id,
          level: 'warning',
          message: `Duplicate skill name "${name}" — will conflict in .claude/skills/`,
        });
      });
    }
  });
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Passes.

**Step 3: Test validation**

Run: `npm run dev`
- Create two skills with the same name → Validate → should show duplicate warning
- Create circular delegation (Skill A delegates to Subagent B, Subagent B spawns Skill A) → Validate → should show cycle warning

**Step 4: Commit**

```bash
git add src/validation/validate.ts
git commit -m "feat: add circular delegation and duplicate skill name validation"
```

---

## Task 14: Final build verification and polish

**Files:**
- Review all modified files for any remaining issues

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors.

**Step 2: Full manual test**

Run: `npm run dev` and verify the entire Phase 2 checklist:

- [ ] Tool node: orange header, wrench icon, compact/expanded views
- [ ] MCP Server node: cyan header, plug icon, conditional connection fields
- [ ] Plugin node: dashed rose container that can hold child nodes
- [ ] "Group into Plugin" context menu works
- [ ] "Remove from Plugin" detaches a node
- [ ] All 3 new types have Properties Panel editors
- [ ] All 3 new types appear in Node Palette
- [ ] Auto-layout arranges nodes (LR)
- [ ] Layout animates smoothly
- [ ] Plugin children excluded from layout
- [ ] 4 templates visible, load correctly
- [ ] Ctrl+Z undoes, Ctrl+Y redoes
- [ ] Undo/Redo toolbar buttons work
- [ ] MCP/Tool/Plugin validation rules fire
- [ ] Circular delegation warning works
- [ ] Duplicate skill name warning works
- [ ] Context menu shows new node types + auto-layout
- [ ] MiniMap colors match new node types
- [ ] All Phase 1 functionality still works

**Step 3: Fix any issues found**

Address each issue as a targeted fix.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 2 polish and verification"
```

---

## Execution Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install dagre | package.json |
| 2 | Type definitions | types/nodes.ts |
| 3 | Theme + pins + factories | theme.ts, nodeDefaults.ts, index.css |
| 4 | Store actions | useGraphStore.ts |
| 5 | ToolNode + ToolEditor | 2 new files |
| 6 | McpNode + McpEditor | 2 new files |
| 7 | PluginNode + PluginEditor | 2 new files |
| 8 | Registration + validation | Canvas, Palette, Panel, validate.ts |
| 9 | Auto-layout | layout.ts, store, toolbar, canvas, css |
| 10 | Templates | templates.ts, NodePalette |
| 11 | Undo/Redo buttons | Toolbar.tsx |
| 12 | Context menu | BlueprintCanvas.tsx |
| 13 | Extended validation | validate.ts |
| 14 | Verification | All files |
