# IMPLEMENTATION PROMPT: Claude Code Blueprint Editor — Phase 1 (MVP)

## Context

You are building a **visual blueprint editor** for the Claude Code ecosystem. It is inspired by UE5 Blueprints, Blender Shader Nodes, and n8n. Users work on a dark canvas: they drag nodes from a palette, connect typed pins with colored Bezier edges, edit parameters inline, and save/load configurations as JSON.

This is Phase 1 (MVP). Focus on a fully functional core with 4 node types, typed pin system, inline editing, validation, and JSON persistence. Do NOT implement MCP Server, Tool, or Plugin nodes yet — those come in Phase 2.

---

## Tech Stack

- **React 18+** with hooks
- **@xyflow/react** (React Flow 12+) — canvas, nodes, edges, minimap, controls, background
- **Tailwind CSS** — utility-first styling
- **lucide-react** — icons
- **TypeScript** — strict types for all data structures
- Project scaffolded with **Vite** (`npm create vite@latest claude-blueprint -- --template react-ts`)

Install:
```bash
npm install @xyflow/react lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

Tailwind v4 with Vite plugin — follow the current Tailwind docs for setup.

---

## Project Structure

```
src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root layout: Palette | Canvas | PropertiesPanel
├── index.css                         # Tailwind directives + custom CSS variables + React Flow overrides
│
├── types/
│   ├── nodes.ts                      # Node type definitions (RulesNodeData, SkillNodeData, etc.)
│   ├── edges.ts                      # Edge type definitions
│   ├── pins.ts                       # Pin type enum, pin config per node type
│   └── graph.ts                      # Top-level graph schema (for save/load)
│
├── constants/
│   ├── pinTypes.ts                   # Pin type enum, colors, compatibility matrix
│   ├── nodeDefaults.ts               # Default data factories for each node type
│   └── theme.ts                      # Color palette, node colors by type
│
├── store/
│   └── useGraphStore.ts              # Zustand store: nodes, edges, selectedNode, actions
│                                     # (If zustand is not desired, use React context + useReducer)
│
├── components/
│   ├── Canvas/
│   │   └── BlueprintCanvas.tsx       # <ReactFlow> wrapper with config, edge types, background
│   │
│   ├── Palette/
│   │   └── NodePalette.tsx           # Left sidebar: draggable node type cards
│   │
│   ├── PropertiesPanel/
│   │   ├── PropertiesPanel.tsx       # Right sidebar: renders editor for selected node
│   │   ├── RulesEditor.tsx           # Editor for CLAUDE.md node
│   │   ├── SkillEditor.tsx           # Editor for Skill node
│   │   ├── SubagentEditor.tsx        # Editor for Subagent node
│   │   └── HookEditor.tsx           # Editor for Hook node
│   │
│   ├── Nodes/
│   │   ├── BaseNode.tsx              # Shared node shell: header stripe, pins, collapse toggle
│   │   ├── RulesNode.tsx             # CLAUDE.md node (compact + expanded view)
│   │   ├── SkillNode.tsx             # Skill node
│   │   ├── SubagentNode.tsx          # Subagent node
│   │   └── HookNode.tsx             # Hook node
│   │
│   ├── Pins/
│   │   └── TypedHandle.tsx           # Custom <Handle> with color, label, type-checking glow
│   │
│   ├── Edges/
│   │   └── TypedEdge.tsx             # Custom edge: color + style + animation by pin type
│   │
│   ├── Toolbar/
│   │   └── Toolbar.tsx               # Top bar: Save, Load, Export, Auto-layout, Validate
│   │
│   ├── StatusBar/
│   │   └── StatusBar.tsx             # Bottom bar: node count, edge count, validation summary
│   │
│   └── shared/
│       ├── CollapsibleSection.tsx     # Accordion section for editors
│       ├── MultiSelect.tsx            # Multi-select checklist (for allowed-tools)
│       ├── KeyValueEditor.tsx         # Key-value pair editor (for env vars, etc.)
│       └── TextareaAutosize.tsx       # Auto-growing textarea
│
├── validation/
│   └── validate.ts                   # Graph validation: structural checks, returns errors/warnings
│
├── serialization/
│   └── jsonExporter.ts               # Save graph to JSON, load from JSON, auto-save
│
└── utils/
    ├── layout.ts                     # Auto-layout with dagre (optional in Phase 1)
    ├── idGenerator.ts                # UUID generator for nodes/edges
    └── pinCompatibility.ts           # Check if two pins can connect
```

---

## Data Types (TypeScript)

### Pin System

```typescript
// types/pins.ts

export enum PinType {
  Exec = 'exec',
  Context = 'context',
  Delegation = 'delegation',
  Trigger = 'trigger',
  ToolAccess = 'tool-access',
  Result = 'result',
  Decision = 'decision',
  Bundle = 'bundle',
}

export enum PinDirection {
  In = 'in',
  Out = 'out',
}

export interface PinDefinition {
  id: string;              // e.g. "out_delegation"
  type: PinType;
  direction: PinDirection;
  label: string;           // e.g. "delegates to"
  multiple?: boolean;      // can accept multiple connections (default: true)
}
```

### Pin Colors (constants/pinTypes.ts)

```typescript
export const PIN_COLORS: Record<PinType, string> = {
  [PinType.Exec]:       '#ffffff',
  [PinType.Context]:    '#94a3b8', // slate-400
  [PinType.Delegation]: '#3b82f6', // blue-500
  [PinType.Trigger]:    '#eab308', // yellow-500
  [PinType.ToolAccess]: '#f97316', // orange-500
  [PinType.Result]:     '#22c55e', // green-500
  [PinType.Decision]:   '#ef4444', // red-500
  [PinType.Bundle]:     '#f43f5e', // rose-500
};
```

### Pin Compatibility Matrix (utils/pinCompatibility.ts)

```typescript
// A source pin can connect to a target pin ONLY if they share the same PinType.
// Additionally: source must be PinDirection.Out, target must be PinDirection.In.
export function canConnect(sourcePin: PinDefinition, targetPin: PinDefinition): boolean {
  return (
    sourcePin.direction === PinDirection.Out &&
    targetPin.direction === PinDirection.In &&
    sourcePin.type === targetPin.type
  );
}
```

### Node Data Types

```typescript
// types/nodes.ts

export type BlueprintNodeType = 'rules' | 'skill' | 'subagent' | 'hook';
// Phase 2 will add: 'mcp' | 'tool' | 'plugin'

export interface BaseNodeData {
  label: string;
  collapsed: boolean;
  validation: {
    errors: string[];
    warnings: string[];
  };
}

export interface RulesNodeData extends BaseNodeData {
  scope: 'root' | 'subfolder';
  path: string;
  content: string;
  priority: number;
}

export interface SkillNodeData extends BaseNodeData {
  frontmatter: {
    name: string;
    description: string;
    context: 'conversation' | 'fork';
    agent: 'inherit' | 'Explore' | 'Plan' | 'general-purpose' | string;
    allowedTools: string[];
    model: 'inherit' | 'claude-opus-4' | 'claude-sonnet-4' | string;
    version: string;
  };
  scopedHooks: ScopedHook[];
  instructions: string;
  dynamicInjections: string[];
  referenceFiles: string[];
}

export interface SubagentNodeData extends BaseNodeData {
  name: string;
  description: string;
  agentType: 'Explore' | 'Plan' | 'general-purpose' | 'custom';
  model: 'inherit' | 'claude-opus-4' | 'claude-sonnet-4' | string;
  allowedTools: string[];
  maxTurns: number | null;
  systemPrompt: string;
  scopedHooks: ScopedHook[];
  skills: string[];
}

export interface HookNodeData extends BaseNodeData {
  event: HookEvent;
  matcher: string;
  hookType: 'command' | 'http';
  command: string;
  timeoutMs: number;
  decision: {
    type: 'none' | 'block' | 'allow' | 'deny' | 'escalate';
    reason: string;
    modifyInput: boolean;
  };
  injectSystemMessage: string;
  continueAfter: boolean;
}

export interface ScopedHook {
  event: HookEvent;
  matcher: string;
  type: 'command' | 'http';
  command: string;
}

export type HookEvent =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PermissionRequest'
  | 'Stop'
  | 'SubagentStop'
  | 'SubagentSpawn'
  | 'PreCompact'
  | 'ConfigChange'
  | 'ContextUpdate';
```

### Pin Definitions Per Node Type

```typescript
// constants/nodeDefaults.ts — include pin definitions

export const NODE_PIN_DEFINITIONS: Record<BlueprintNodeType, PinDefinition[]> = {
  rules: [
    { id: 'out_context', type: PinType.Context, direction: PinDirection.Out, label: 'provides context' },
  ],
  skill: [
    { id: 'in_context',    type: PinType.Context,    direction: PinDirection.In,  label: 'receives context' },
    { id: 'in_trigger',    type: PinType.Trigger,    direction: PinDirection.In,  label: 'triggered by' },
    { id: 'in_exec',       type: PinType.Exec,       direction: PinDirection.In,  label: 'exec in' },
    { id: 'out_delegation',type: PinType.Delegation,  direction: PinDirection.Out, label: 'delegates to' },
    { id: 'out_tools',     type: PinType.ToolAccess,  direction: PinDirection.Out, label: 'uses tools' },
    { id: 'out_context',   type: PinType.Context,    direction: PinDirection.Out, label: 'provides context' },
    { id: 'out_exec',      type: PinType.Exec,       direction: PinDirection.Out, label: 'exec out' },
  ],
  subagent: [
    { id: 'in_delegation', type: PinType.Delegation,  direction: PinDirection.In,  label: 'delegated from' },
    { id: 'in_context',    type: PinType.Context,    direction: PinDirection.In,  label: 'receives context' },
    { id: 'in_exec',       type: PinType.Exec,       direction: PinDirection.In,  label: 'exec in' },
    { id: 'out_result',    type: PinType.Result,     direction: PinDirection.Out, label: 'returns result' },
    { id: 'out_tools',     type: PinType.ToolAccess,  direction: PinDirection.Out, label: 'uses tools' },
    { id: 'out_spawn',     type: PinType.Delegation,  direction: PinDirection.Out, label: 'spawns' },
    { id: 'out_exec',      type: PinType.Exec,       direction: PinDirection.Out, label: 'exec out' },
  ],
  hook: [
    { id: 'in_trigger',    type: PinType.Trigger,    direction: PinDirection.In,  label: 'listens to' },
    { id: 'out_decision',  type: PinType.Decision,   direction: PinDirection.Out, label: 'blocks/allows' },
    { id: 'out_context',   type: PinType.Context,    direction: PinDirection.Out, label: 'injects context' },
  ],
};
```

### Edge Data

```typescript
// types/edges.ts

export interface BlueprintEdgeData {
  pinType: PinType;
  label?: string;
  params?: Record<string, unknown>;
}
```

### Graph Schema (for save/load)

```typescript
// types/graph.ts

export interface GraphSchema {
  version: string;
  metadata: {
    name: string;
    description: string;
    created: string;
    modified: string;
  };
  nodes: Node[];      // React Flow node objects
  edges: Edge[];      // React Flow edge objects
  viewport: { x: number; y: number; zoom: number };
}
```

---

## Node Color Palette

```typescript
// constants/theme.ts

export const NODE_COLORS: Record<BlueprintNodeType, { header: string; headerDark: string; glow: string }> = {
  rules:    { header: '#64748b', headerDark: '#475569', glow: '#64748b40' },
  skill:    { header: '#10b981', headerDark: '#059669', glow: '#10b98140' },
  subagent: { header: '#8b5cf6', headerDark: '#7c3aed', glow: '#8b5cf640' },
  hook:     { header: '#f59e0b', headerDark: '#d97706', glow: '#f59e0b40' },
};

export const CANVAS_BG = '#0d1117';
export const NODE_BG = '#1c2028';
export const NODE_BORDER = '#2d333b';
export const TEXT_PRIMARY = '#e6edf3';
export const TEXT_SECONDARY = '#8b949e';
export const TEXT_MUTED = '#484f58';
```

---

## Component Implementation Details

### 1. `App.tsx` — Root Layout

```
<div className="h-screen w-screen flex flex-col" style={{ background: CANVAS_BG }}>
  <Toolbar />
  <div className="flex flex-1 overflow-hidden">
    <NodePalette />                      {/* w-60, left sidebar */}
    <BlueprintCanvas className="flex-1" />
    {selectedNode && <PropertiesPanel />} {/* w-80, right sidebar */}
  </div>
  <StatusBar />
</div>
```

### 2. `NodePalette.tsx` — Left Sidebar

- Fixed width (w-60), dark background slightly lighter than canvas
- Section header "NODES" in uppercase, muted text
- For each node type: a draggable card showing:
  - Colored left border (node type color)
  - Icon + type name
  - Short description
- **Drag behavior**: use `onDragStart` with `event.dataTransfer.setData('application/blueprint-node', nodeType)`.
  On the canvas, handle `onDrop` + `onDragOver` to create a new node at drop position.
- Below nodes: "TEMPLATES" section (Phase 2 — render as disabled/coming soon for now)

### 3. `BlueprintCanvas.tsx` — Main Canvas

```tsx
import { ReactFlow, Background, MiniMap, Controls, BackgroundVariant } from '@xyflow/react';

// Register custom node types
const nodeTypes = {
  rules: RulesNode,
  skill: SkillNode,
  subagent: SubagentNode,
  hook: HookNode,
};

// Register custom edge type
const edgeTypes = {
  typed: TypedEdge,
};

// Default edge options
const defaultEdgeOptions = {
  type: 'typed',
};
```

Canvas configuration:
- `Background`: variant={BackgroundVariant.Dots}, color="#2d333b", gap={20}
- `MiniMap`: bottom-right, dark styled, node colors mapped by type
- `Controls`: bottom-right (above minimap), dark styled
- `colorMode="dark"`
- `snapToGrid={true}`, `snapGrid={[20, 20]}`
- `fitView` on initial load
- `onConnect`: validate pin compatibility before creating edge. If incompatible, do not create.
- `onDrop` / `onDragOver`: create new node from palette drag
- `isValidConnection`: check pin type compatibility (use canConnect util)
- `onNodeClick`: set selectedNode in store (opens PropertiesPanel)
- `onPaneClick`: clear selectedNode (closes PropertiesPanel)
- Context menu: implement with a custom component positioned at right-click coordinates.
  Options: "Delete node", "Duplicate node", "Disconnect all edges".

### 4. `BaseNode.tsx` — Shared Node Shell

This is the core reusable wrapper for all node types. Every custom node component wraps its content in `<BaseNode>`.

Structure:
```
┌─────────────────────────────────────────┐
│ ██████ COLORED HEADER STRIPE ██████████ │ ← 4px tall, node type color
├─────────────────────────────────────────┤
│ [icon] Node Label           [▾ collapse]│ ← header row
├──────┬──────────────────────────┬───────┤
│ ● in │    Compact content       │ out ● │ ← pins on sides, content in middle
│ ● in │    (key params shown)    │ out ● │
│      │                          │ out ● │
├──────┴──────────────────────────┴───────┤
│ ⚠️ 1 warning                            │ ← validation footer (if any)
└─────────────────────────────────────────┘
```

Props:
- `nodeType: BlueprintNodeType`
- `data: BaseNodeData` (+ type-specific)
- `pins: PinDefinition[]`
- `icon: LucideIcon`
- `children: ReactNode` (the inline content)
- `selected: boolean`

Behavior:
- **Collapse toggle**: clicking the chevron toggles `data.collapsed`. When collapsed, only header + pins are visible.
- **Selection glow**: when `selected`, the node gets a box-shadow in the node type's glow color.
- **Validation badge**: if `data.validation.errors.length > 0`, show a red ❌ badge on the header. If only warnings, show amber ⚠️.
- **Width**: min-width 280px, max-width 400px. Nodes should feel substantial but not huge.

### 5. `TypedHandle.tsx` — Custom Pin

```tsx
import { Handle, Position } from '@xyflow/react';

interface TypedHandleProps {
  pin: PinDefinition;
  style?: React.CSSProperties;
}
```

Render:
- `<Handle>` with `type={pin.direction === 'in' ? 'target' : 'source'}` and `id={pin.id}`
- Position: `Position.Left` for inputs, `Position.Right` for outputs
- **Visual**: a circle (w-3 h-3) filled with the pin type's color
- **Label**: small text next to the circle (left-aligned for inputs, right-aligned for outputs)
- **Hover**: slight scale-up + glow effect in pin color
- **Connected state**: filled circle. **Unconnected**: ring (border only).

Vertical arrangement of pins: inputs stacked on the left, outputs stacked on the right.
The Handle position offsets should be computed to space pins evenly along the node height.

### 6. `TypedEdge.tsx` — Custom Edge

```tsx
import { BaseEdge, getBezierPath, EdgeProps } from '@xyflow/react';
```

Behavior:
- Read `data.pinType` to determine visual style.
- **Color**: from `PIN_COLORS[data.pinType]`
- **Stroke width**: 2px (default), 3px for exec
- **Dash array**: "5,5" for context and tool-access, solid for others
- **Animation**: for exec and trigger edges, apply CSS animation:
  ```css
  @keyframes edge-flow {
    from { stroke-dashoffset: 24; }
    to { stroke-dashoffset: 0; }
  }
  .animated-edge {
    stroke-dasharray: 12;
    animation: edge-flow 1s linear infinite;
  }
  ```
- **Label**: if `data.label` exists, render it as a small tag on the edge midpoint.

### 7. Custom Node Components (RulesNode, SkillNode, SubagentNode, HookNode)

Each wraps `<BaseNode>` and renders inline content.

**CRITICAL: Inline content must be COMPACT by default.** Show only the most important 1-3 fields directly on the node. Full editing happens in the PropertiesPanel (right sidebar).

#### `RulesNode.tsx` — CLAUDE.md
Compact view:
- Scope badge: "root" or path
- First 2 lines of content (truncated with "...")

Expanded view:
- Scope dropdown
- Path input (visible if subfolder)
- Content textarea (max 4 lines visible, scrollable)
- Priority input

#### `SkillNode.tsx` — Skill
Compact view:
- `name` as subtitle under header
- `context` badge: "conversation" or "fork"
- `agent` badge (if fork): "Explore" / "Plan" / etc.

Expanded view:
- Name input
- Description textarea (2 lines)
- Context dropdown
- Agent dropdown (visible if context=fork)
- Allowed tools multi-select (compact chips)

#### `SubagentNode.tsx` — Subagent
Compact view:
- `name` as subtitle
- `agentType` badge
- `model` badge (if not inherit)

Expanded view:
- Name input
- Agent type dropdown
- Model dropdown
- Allowed tools multi-select (compact chips)
- System prompt textarea (2 lines, truncated)

#### `HookNode.tsx` — Hook
Compact view:
- `event` as subtitle (e.g. "PreToolUse")
- `matcher` as small mono text (e.g. "Bash")
- Decision badge: colored dot (green=allow, red=deny, gray=none)

Expanded view:
- Event dropdown
- Matcher input
- Hook type dropdown (command / http)
- Command input
- Decision type dropdown
- Reason input (visible if decision ≠ none)

### 8. `PropertiesPanel.tsx` — Right Sidebar

- Fixed width (w-80), dark background
- Header: node icon + type + name (editable)
- Body: full editor for ALL parameters of the selected node, organized in collapsible sections (use `CollapsibleSection` component)
- Each node type has its own editor component (RulesEditor, SkillEditor, SubagentEditor, HookEditor)
- Changes update the store immediately (controlled inputs bound to store)
- **Delete node** button at bottom (red, with confirmation)

### 9. `Toolbar.tsx` — Top Bar

Left section:
- App title/logo: "Claude Blueprint" in a distinctive font

Center section:
- Node count, edge count (small muted text)

Right section (buttons):
- **Validate** (lucide: `ShieldCheck`): runs validation, updates all nodes
- **Auto-layout** (lucide: `LayoutGrid`): applies dagre layout (can be basic in MVP)
- **Save** (lucide: `Save`): exports graph as JSON, triggers browser download
- **Load** (lucide: `Upload`): opens file input, parses JSON, loads graph
- **Clear** (lucide: `Trash2`): clears canvas (with confirmation dialog)

### 10. `StatusBar.tsx` — Bottom Bar

- Background slightly lighter than canvas
- Left: "Nodes: {count} | Edges: {count}"
- Center: current config name (from metadata)
- Right: validation summary "✅ Valid" or "❌ {n} errors, ⚠️ {n} warnings"
  Clicking the validation summary could scroll/highlight the first problematic node (nice-to-have).

---

## Validation Rules (MVP)

Implement in `validation/validate.ts`:

```typescript
export interface ValidationResult {
  nodeId: string;
  level: 'error' | 'warning';
  message: string;
}

export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  // ... checks below
  return results;
}
```

### Error checks (❌ — blocks export):
1. **Skill** with `context: "fork"` but `agent` is `"inherit"` or empty → "Forked skills must specify an agent type"
2. **Hook** with empty `event` → "Hook must have a lifecycle event"
3. **Hook** with empty `command` → "Hook must have a command"
4. **Subagent** with empty `systemPrompt` → "Subagent must have a system prompt"

### Warning checks (⚠️ — informational):
1. **Skill** with empty `description` → "Skill without description won't be auto-discovered"
2. **Subagent** with empty `allowedTools` → "Empty allowed tools inherits all tools — potential security risk"
3. **Orphan node** (no edges connected) → "Node is not connected to anything"
4. Any node where `data.label` is still the default → "Consider renaming from default"

After validation, update each node's `data.validation` field so the UI reflects it.

---

## Serialization (MVP)

### Save (jsonExporter.ts)

```typescript
export function exportGraph(nodes: Node[], edges: Edge[], viewport: Viewport): GraphSchema {
  return {
    version: '1.0.0',
    metadata: {
      name: 'Untitled Blueprint',
      description: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    nodes,
    edges,
    viewport,
  };
}

export function downloadJSON(graph: GraphSchema) {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${graph.metadata.name.replace(/\s+/g, '-').toLowerCase()}.blueprint.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Load

```typescript
export function importGraph(json: string): GraphSchema | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version && parsed.nodes && parsed.edges) {
      return parsed as GraphSchema;
    }
    return null;
  } catch {
    return null;
  }
}
```

In the Toolbar, the Load button opens a hidden `<input type="file" accept=".json">` and reads the file with FileReader.

---

## CSS / Styling Notes

### index.css

```css
@import "tailwindcss";

/* === Canvas overrides === */
:root {
  --canvas-bg: #0d1117;
  --node-bg: #1c2028;
  --node-border: #2d333b;
  --node-border-hover: #444c56;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #484f58;

  /* Pin type colors */
  --pin-exec: #ffffff;
  --pin-context: #94a3b8;
  --pin-delegation: #3b82f6;
  --pin-trigger: #eab308;
  --pin-tool-access: #f97316;
  --pin-result: #22c55e;
  --pin-decision: #ef4444;
  --pin-bundle: #f43f5e;

  /* Node header colors */
  --node-rules: #64748b;
  --node-skill: #10b981;
  --node-subagent: #8b5cf6;
  --node-hook: #f59e0b;
}

/* React Flow dark theme overrides */
.react-flow__background {
  background-color: var(--canvas-bg) !important;
}

.react-flow__minimap {
  background-color: #161b22 !important;
  border: 1px solid var(--node-border);
  border-radius: 8px;
}

.react-flow__controls {
  background: var(--node-bg);
  border: 1px solid var(--node-border);
  border-radius: 8px;
}

.react-flow__controls button {
  background: var(--node-bg);
  border-color: var(--node-border);
  color: var(--text-secondary);
}

.react-flow__controls button:hover {
  background: var(--node-border);
  color: var(--text-primary);
}

/* Edge animations */
@keyframes edge-flow {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}

@keyframes edge-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Node animations */
@keyframes node-appear {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.blueprint-node {
  animation: node-appear 0.2s ease-out;
}

/* Handle hover glow */
.react-flow__handle:hover {
  filter: drop-shadow(0 0 6px currentColor);
  transform: scale(1.3);
  transition: all 0.15s ease;
}
```

### Font loading

Use Google Fonts in index.html `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Use `font-family: 'Inter', sans-serif` as default body font.
Use `font-family: 'JetBrains Mono', monospace` for code fields (commands, patterns, system prompts).

---

## Interaction Flows

### Creating a Node
1. User drags a node type card from the Palette
2. Drops on canvas at desired position
3. `onDrop` handler creates a new node with default data (from `nodeDefaults.ts`) at the drop coordinates
4. Node appears with animation, pre-filled with sensible defaults
5. User clicks node to select → PropertiesPanel opens for full editing

### Connecting Pins
1. User starts dragging from an output pin (Handle)
2. As they hover over input pins, compatible pins highlight (glow in pin color), incompatible pins show no highlight
3. On release over a compatible pin: edge created with correct type and color
4. On release over incompatible pin or empty space: no edge created
5. `isValidConnection` callback enforces compatibility

### Editing a Node
1. **Inline** (on-canvas): expand the node, edit compact fields directly
2. **Properties Panel**: click node → full editor in right sidebar
3. Both are synced through the store — changes in either reflect immediately

### Saving / Loading
1. **Save**: Toolbar "Save" → `exportGraph()` → `downloadJSON()` → browser downloads `.blueprint.json`
2. **Load**: Toolbar "Load" → file picker → read file → `importGraph()` → replace store state → `fitView()`
3. **Auto-save** (nice-to-have): on every change, debounced 2s, save to a Zustand persist middleware or manual `sessionStorage`

### Validation
1. **Auto**: runs after every node/edge change (debounced 500ms)
2. **Manual**: Toolbar "Validate" button
3. Results update `data.validation` on each node → UI reflects errors/warnings
4. StatusBar shows summary count

---

## Edge Cases & Important Details

1. **React Flow `nodeTypes` must be defined OUTSIDE the component** (or memoized). Otherwise React Flow re-renders infinitely.

2. **Handle IDs must be unique per node**. Use the pin `id` field (e.g., "out_delegation").

3. **Edge type detection**: when `onConnect` fires, determine the pin types from the source handle ID and target handle ID. Look up the pin definitions for the source node type and target node type. Use the pin type to set the edge's `data.pinType` and visual style.

4. **Node resizing**: set `style={{ width }}` on nodes dynamically. Expanded nodes are wider than collapsed.

5. **Z-index**: selected nodes should appear above others. React Flow handles this with `zIndex` in node options.

6. **Multiple edges from one pin**: most pins allow multiple connections (e.g., a Skill can delegate to multiple Subagents). The pin's `multiple` field controls this. For `exec` pins, only allow one outgoing connection (sequential flow).

7. **Dark scrollbars**: style all scrollbars to match the dark theme using CSS:
   ```css
   ::-webkit-scrollbar { width: 6px; }
   ::-webkit-scrollbar-track { background: var(--node-bg); }
   ::-webkit-scrollbar-thumb { background: var(--node-border); border-radius: 3px; }
   ```

---

## Default Node Data Factories

```typescript
// constants/nodeDefaults.ts

export function createRulesData(): RulesNodeData {
  return {
    label: 'CLAUDE.md',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    scope: 'root',
    path: '/',
    content: '# Project Rules\n\n',
    priority: 0,
  };
}

export function createSkillData(): SkillNodeData {
  return {
    label: 'New Skill',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    frontmatter: {
      name: '',
      description: '',
      context: 'conversation',
      agent: 'inherit',
      allowedTools: [],
      model: 'inherit',
      version: '1.0.0',
    },
    scopedHooks: [],
    instructions: '',
    dynamicInjections: [],
    referenceFiles: [],
  };
}

export function createSubagentData(): SubagentNodeData {
  return {
    label: 'New Subagent',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    name: '',
    description: '',
    agentType: 'general-purpose',
    model: 'inherit',
    allowedTools: [],
    maxTurns: null,
    systemPrompt: '',
    scopedHooks: [],
    skills: [],
  };
}

export function createHookData(): HookNodeData {
  return {
    label: 'New Hook',
    collapsed: false,
    validation: { errors: [], warnings: [] },
    event: 'PreToolUse',
    matcher: '*',
    hookType: 'command',
    command: '',
    timeoutMs: 60000,
    decision: { type: 'none', reason: '', modifyInput: false },
    injectSystemMessage: '',
    continueAfter: true,
  };
}
```

---

## Store (Zustand)

```typescript
// store/useGraphStore.ts

interface GraphStore {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  configName: string;
  validationResults: ValidationResult[];

  // Node actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addNode: (type: BlueprintNodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

  // Edge actions
  onConnect: (connection: Connection) => void;

  // Selection
  selectNode: (nodeId: string | null) => void;

  // Validation
  runValidation: () => void;

  // Serialization
  exportJSON: () => GraphSchema;
  importJSON: (schema: GraphSchema) => void;
  clearGraph: () => void;
}
```

---

## Deliverables Checklist

When implementation is complete, verify the following:

- [ ] Dark canvas with dot grid background renders correctly
- [ ] 4 node types render with correct colors, icons, pins
- [ ] Nodes can be dragged from palette onto canvas
- [ ] Nodes can be repositioned on canvas (drag)
- [ ] Clicking a node selects it and opens PropertiesPanel
- [ ] PropertiesPanel shows full editable fields for selected node type
- [ ] Inline editing works on expanded nodes
- [ ] Collapse/expand toggle works on all nodes
- [ ] Pins are colored correctly by type
- [ ] Dragging from an output pin to a compatible input pin creates a colored edge
- [ ] Dragging from an output pin to an incompatible input pin does NOT create an edge
- [ ] Edges are styled correctly (color, dash, animation) based on pin type
- [ ] Save button downloads .blueprint.json file
- [ ] Load button reads .blueprint.json and restores the graph
- [ ] Validation runs and shows errors/warnings on nodes
- [ ] StatusBar shows node count, edge count, validation summary
- [ ] MiniMap shows colored node rectangles
- [ ] Ctrl+Z / Ctrl+Y undo/redo (React Flow built-in or custom)
- [ ] Right-click context menu on nodes (delete, duplicate, disconnect)
- [ ] Overall dark UE-Blueprint aesthetic is cohesive and polished
- [ ] No TypeScript errors, no console warnings from React Flow
