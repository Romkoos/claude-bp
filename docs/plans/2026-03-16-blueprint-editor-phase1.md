# Claude Blueprint Editor — Phase 1 (MVP) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a visual blueprint editor for the Claude Code ecosystem with 4 node types, typed pin system, inline editing, validation, and JSON persistence.

**Architecture:** React 18 + @xyflow/react canvas with Zustand state management. Dark-themed UI with left palette, center canvas, right properties panel. Nodes have typed pins (color-coded handles) connected by styled Bezier edges. All state flows through a single Zustand store.

**Tech Stack:** Vite + React 18 + TypeScript, @xyflow/react v12+, Tailwind CSS v4 (Vite plugin), Zustand, lucide-react

---

### Task 1: Scaffold Vite Project

**Files:**
- Create: project root via `npm create vite`
- Modify: `index.html` (add Google Fonts)
- Modify: `vite.config.ts` (add Tailwind plugin)
- Create: `src/index.css` (Tailwind directives + CSS variables + React Flow overrides)

**Step 1: Create Vite project**

```bash
cd "C:\Users\roman.neganov\Documents\PersonalProjects\ClaudeBlueprints"
npm create vite@latest . -- --template react-ts
```

If prompted about non-empty directory, choose to continue (the docs folder won't conflict).

**Step 2: Install dependencies**

```bash
npm install @xyflow/react lucide-react zustand
npm install -D tailwindcss @tailwindcss/vite
```

**Step 3: Configure Tailwind in vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 4: Add Google Fonts to index.html**

Add to `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Step 5: Write src/index.css**

Full CSS with Tailwind directives, CSS variables for theme colors, React Flow dark overrides, edge animations, node animations, handle hover effects, dark scrollbars.

Reference spec: `docs/claude-blueprint-implementation-prompt.md` lines 672-757 for exact CSS content.

**Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, page loads with default Vite template.

**Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite project with React, Tailwind, React Flow, Zustand"
```

---

### Task 2: Create Type Definitions

**Files:**
- Create: `src/types/pins.ts`
- Create: `src/types/nodes.ts`
- Create: `src/types/edges.ts`
- Create: `src/types/graph.ts`

**Step 1: Write src/types/pins.ts**

```typescript
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
  id: string;
  type: PinType;
  direction: PinDirection;
  label: string;
  multiple?: boolean;
}
```

**Step 2: Write src/types/nodes.ts**

Full node type definitions from spec lines 169-253. Include:
- `BlueprintNodeType` union
- `BaseNodeData` interface
- `RulesNodeData`, `SkillNodeData`, `SubagentNodeData`, `HookNodeData`
- `ScopedHook` interface
- `HookEvent` type

**Step 3: Write src/types/edges.ts**

```typescript
import { PinType } from './pins';

export interface BlueprintEdgeData {
  pinType: PinType;
  label?: string;
  params?: Record<string, unknown>;
}
```

**Step 4: Write src/types/graph.ts**

```typescript
import type { Node, Edge, Viewport } from '@xyflow/react';

export interface GraphSchema {
  version: string;
  metadata: {
    name: string;
    description: string;
    created: string;
    modified: string;
  };
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}
```

**Step 5: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 6: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript type definitions for pins, nodes, edges, graph"
```

---

### Task 3: Create Constants

**Files:**
- Create: `src/constants/pinTypes.ts`
- Create: `src/constants/theme.ts`
- Create: `src/constants/nodeDefaults.ts`

**Step 1: Write src/constants/pinTypes.ts**

PIN_COLORS record mapping each PinType to hex color. See spec lines 141-150.

**Step 2: Write src/constants/theme.ts**

NODE_COLORS record and canvas/node color constants. See spec lines 327-342.

**Step 3: Write src/constants/nodeDefaults.ts**

Include:
- `NODE_PIN_DEFINITIONS` — pin definitions per node type (spec lines 261-288)
- Factory functions: `createRulesData()`, `createSkillData()`, `createSubagentData()`, `createHookData()` (spec lines 831-898)

**Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/constants/
git commit -m "feat: add constants for pin types, theme colors, node defaults"
```

---

### Task 4: Create Utility Functions

**Files:**
- Create: `src/utils/pinCompatibility.ts`
- Create: `src/utils/idGenerator.ts`

**Step 1: Write src/utils/pinCompatibility.ts**

```typescript
import { PinDefinition, PinDirection } from '../types/pins';

export function canConnect(sourcePin: PinDefinition, targetPin: PinDefinition): boolean {
  return (
    sourcePin.direction === PinDirection.Out &&
    targetPin.direction === PinDirection.In &&
    sourcePin.type === targetPin.type
  );
}
```

**Step 2: Write src/utils/idGenerator.ts**

```typescript
export function generateId(): string {
  return crypto.randomUUID();
}
```

**Step 3: Commit**

```bash
git add src/utils/
git commit -m "feat: add utility functions for pin compatibility and ID generation"
```

---

### Task 5: Create Validation Module

**Files:**
- Create: `src/validation/validate.ts`

**Step 1: Write src/validation/validate.ts**

Implement `ValidationResult` interface and `validateGraph()` function with all error and warning checks from spec lines 586-613:

Errors:
1. Skill with `context: "fork"` but agent is `"inherit"` or empty
2. Hook with empty `event`
3. Hook with empty `command`
4. Subagent with empty `systemPrompt`

Warnings:
1. Skill with empty `description`
2. Subagent with empty `allowedTools`
3. Orphan node (no edges connected)
4. Default label unchanged

**Step 2: Commit**

```bash
git add src/validation/
git commit -m "feat: add graph validation with error and warning checks"
```

---

### Task 6: Create Serialization Module

**Files:**
- Create: `src/serialization/jsonExporter.ts`

**Step 1: Write src/serialization/jsonExporter.ts**

Implement `exportGraph()`, `downloadJSON()`, and `importGraph()` functions exactly as shown in spec lines 620-661.

**Step 2: Commit**

```bash
git add src/serialization/
git commit -m "feat: add JSON export/import for graph serialization"
```

---

### Task 7: Create Zustand Store

**Files:**
- Create: `src/store/useGraphStore.ts`

**Step 1: Write src/store/useGraphStore.ts**

Full Zustand store with interface from spec lines 904-938. Must include:

- `nodes`, `edges`, `selectedNodeId`, `configName`, `validationResults` state
- `onNodesChange` / `onEdgesChange` using `applyNodeChanges` / `applyEdgeChanges` from @xyflow/react
- `addNode(type, position)` — creates node with `generateId()` and correct factory
- `updateNodeData(nodeId, data)` — merges partial data into node
- `deleteNode(nodeId)` — removes node and all connected edges
- `duplicateNode(nodeId)` — clones node at offset position
- `onConnect(connection)` — determines pin types from handle IDs and node types, creates edge with `BlueprintEdgeData`
- `selectNode(nodeId)` — sets selectedNodeId
- `runValidation()` — calls `validateGraph()`, updates each node's `data.validation`
- `exportJSON()` / `importJSON()` / `clearGraph()`

Key implementation detail for `onConnect`:
- Extract source node type from `nodes` array using `connection.source`
- Find pin definition by matching `connection.sourceHandle` against `NODE_PIN_DEFINITIONS[nodeType]`
- Set `data.pinType` on the new edge from the source pin's type

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand store with full graph state management"
```

---

### Task 8: Create Shared UI Components

**Files:**
- Create: `src/components/shared/CollapsibleSection.tsx`
- Create: `src/components/shared/TextareaAutosize.tsx`
- Create: `src/components/shared/MultiSelect.tsx`
- Create: `src/components/shared/KeyValueEditor.tsx`

**Step 1: Write CollapsibleSection.tsx**

Accordion component with chevron toggle, title, and children. Dark styled.

**Step 2: Write TextareaAutosize.tsx**

Textarea that grows with content. Dark styled with JetBrains Mono font for code fields. Props: `value`, `onChange`, `placeholder`, `mono?: boolean`, `maxRows?: number`.

**Step 3: Write MultiSelect.tsx**

Checklist dropdown for selecting multiple items (used for allowedTools). Shows selected items as chips. Props: `options: string[]`, `selected: string[]`, `onChange`.

**Step 4: Write KeyValueEditor.tsx**

Key-value pair editor with add/remove rows. Props: `pairs: Record<string, string>`, `onChange`.

**Step 5: Commit**

```bash
git add src/components/shared/
git commit -m "feat: add shared UI components (collapsible section, textarea, multi-select, key-value editor)"
```

---

### Task 9: Create TypedHandle (Pin Component)

**Files:**
- Create: `src/components/Pins/TypedHandle.tsx`

**Step 1: Write TypedHandle.tsx**

Custom React Flow Handle component. See spec lines 448-466:
- Renders `<Handle>` with correct `type` (source/target) and `id` from pin definition
- Position: Left for inputs, Right for outputs
- Circle colored by pin type (filled when connected, ring when unconnected)
- Label text next to circle
- Hover: scale-up + glow effect

Use `useHandleConnections` from @xyflow/react to detect connected state.

**Step 2: Commit**

```bash
git add src/components/Pins/
git commit -m "feat: add TypedHandle component for colored typed pins"
```

---

### Task 10: Create TypedEdge (Custom Edge)

**Files:**
- Create: `src/components/Edges/TypedEdge.tsx`

**Step 1: Write TypedEdge.tsx**

Custom React Flow edge component. See spec lines 470-491:
- Read `data.pinType` for visual style
- Color from `PIN_COLORS[data.pinType]`
- Stroke width: 2px default, 3px for exec
- Dash array: "5,5" for context and tool-access, solid for others
- Animation class for exec and trigger edges (uses CSS `edge-flow` keyframe)
- Optional label at edge midpoint

Use `BaseEdge` and `getBezierPath` from @xyflow/react.

**Step 2: Commit**

```bash
git add src/components/Edges/
git commit -m "feat: add TypedEdge component with color/style/animation by pin type"
```

---

### Task 11: Create BaseNode Component

**Files:**
- Create: `src/components/Nodes/BaseNode.tsx`

**Step 1: Write BaseNode.tsx**

Core reusable node wrapper. See spec lines 414-443:

Structure:
- 4px colored header stripe (node type color)
- Header row: icon + label + collapse chevron
- Body: pins on left/right sides, children content in middle
- Validation footer (if errors/warnings exist)

Props: `nodeType`, `data`, `pins`, `icon`, `children`, `selected`

Pin rendering:
- Filter pins into inputs (left) and outputs (right)
- Render `<TypedHandle>` for each pin, vertically spaced
- Pins must be positioned using percentage-based top offsets to distribute evenly

Behavior:
- Collapse toggle hides children, shows only header + pins
- Selected state: box-shadow glow in node type color
- Validation badge: red for errors, amber for warnings
- Width: min 280px, max 400px
- Apply `blueprint-node` class for appear animation

**Step 2: Commit**

```bash
git add src/components/Nodes/BaseNode.tsx
git commit -m "feat: add BaseNode component with header, pins, collapse, validation"
```

---

### Task 12: Create Node Type Components

**Files:**
- Create: `src/components/Nodes/RulesNode.tsx`
- Create: `src/components/Nodes/SkillNode.tsx`
- Create: `src/components/Nodes/SubagentNode.tsx`
- Create: `src/components/Nodes/HookNode.tsx`

**Step 1: Write RulesNode.tsx**

Wraps BaseNode. See spec lines 499-507.
- Compact: scope badge + first 2 lines of content
- Expanded: scope dropdown, path input (if subfolder), content textarea, priority input
- Icon: `FileText` from lucide-react
- Uses `useGraphStore` to read/update node data

**Step 2: Write SkillNode.tsx**

See spec lines 509-521.
- Compact: name subtitle, context badge, agent badge (if fork)
- Expanded: name input, description textarea, context dropdown, agent dropdown (if fork), allowed tools
- Icon: `Zap` from lucide-react

**Step 3: Write SubagentNode.tsx**

See spec lines 523-535.
- Compact: name subtitle, agentType badge, model badge
- Expanded: name, agent type dropdown, model dropdown, allowed tools, system prompt textarea
- Icon: `Bot` from lucide-react

**Step 4: Write HookNode.tsx**

See spec lines 537-548.
- Compact: event subtitle, matcher mono text, decision colored dot
- Expanded: event dropdown, matcher input, hook type dropdown, command input, decision type, reason
- Icon: `Webhook` from lucide-react

**Step 5: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/components/Nodes/
git commit -m "feat: add RulesNode, SkillNode, SubagentNode, HookNode components"
```

---

### Task 13: Create NodePalette (Left Sidebar)

**Files:**
- Create: `src/components/Palette/NodePalette.tsx`

**Step 1: Write NodePalette.tsx**

Left sidebar (w-60). See spec lines 366-373:
- Section header "NODES" in uppercase muted text
- For each node type: draggable card with colored left border, icon, name, short description
- Drag behavior: `onDragStart` sets `event.dataTransfer.setData('application/blueprint-node', nodeType)`
- "TEMPLATES" section at bottom (disabled/coming soon)

Node descriptions:
- Rules: "Project-level rules and context (CLAUDE.md)"
- Skill: "On-demand skill with instructions"
- Subagent: "Isolated worker with system prompt"
- Hook: "Lifecycle event interceptor"

**Step 2: Commit**

```bash
git add src/components/Palette/
git commit -m "feat: add NodePalette with draggable node type cards"
```

---

### Task 14: Create Toolbar

**Files:**
- Create: `src/components/Toolbar/Toolbar.tsx`

**Step 1: Write Toolbar.tsx**

Top bar. See spec lines 560-572:
- Left: "Claude Blueprint" title
- Center: node count, edge count (muted text)
- Right buttons: Validate (ShieldCheck), Auto-layout (LayoutGrid), Save (Save), Load (Upload), Clear (Trash2)
- Save: calls `exportJSON()` then `downloadJSON()`
- Load: hidden file input, reads JSON, calls `importJSON()`
- Clear: confirmation dialog, calls `clearGraph()`
- Validate: calls `runValidation()`

**Step 2: Commit**

```bash
git add src/components/Toolbar/
git commit -m "feat: add Toolbar with save, load, validate, clear actions"
```

---

### Task 15: Create StatusBar

**Files:**
- Create: `src/components/StatusBar/StatusBar.tsx`

**Step 1: Write StatusBar.tsx**

Bottom bar. See spec lines 573-579:
- Left: "Nodes: {count} | Edges: {count}"
- Center: config name from store
- Right: validation summary — "Valid" or "{n} errors, {n} warnings"

**Step 2: Commit**

```bash
git add src/components/StatusBar/
git commit -m "feat: add StatusBar with node/edge counts and validation summary"
```

---

### Task 16: Create Properties Panel

**Files:**
- Create: `src/components/PropertiesPanel/PropertiesPanel.tsx`
- Create: `src/components/PropertiesPanel/RulesEditor.tsx`
- Create: `src/components/PropertiesPanel/SkillEditor.tsx`
- Create: `src/components/PropertiesPanel/SubagentEditor.tsx`
- Create: `src/components/PropertiesPanel/HookEditor.tsx`

**Step 1: Write PropertiesPanel.tsx**

Right sidebar (w-80). See spec lines 549-557:
- Header: node icon + type + editable name
- Body: renders correct editor based on node type
- Delete node button at bottom (red, with confirm)

**Step 2: Write RulesEditor.tsx**

Full editor for RulesNodeData fields:
- Scope dropdown (root/subfolder)
- Path input (visible when subfolder)
- Content textarea (mono font, auto-growing)
- Priority number input
All in CollapsibleSection wrappers.

**Step 3: Write SkillEditor.tsx**

Full editor for SkillNodeData fields:
- Frontmatter section: name, description, context dropdown, agent dropdown (if fork), model dropdown, version, allowed tools (MultiSelect)
- Instructions textarea (mono)
- Scoped hooks section (add/remove hook entries)
- Dynamic injections list
- Reference files list

**Step 4: Write SubagentEditor.tsx**

Full editor for SubagentNodeData fields:
- Name, description, agent type dropdown, model dropdown
- Allowed tools (MultiSelect)
- Max turns number input
- System prompt textarea (mono)
- Scoped hooks section
- Skills list

**Step 5: Write HookEditor.tsx**

Full editor for HookNodeData fields:
- Event dropdown (all HookEvent values)
- Matcher input
- Hook type dropdown (command/http)
- Command input (mono)
- Timeout number input
- Decision section: type dropdown, reason (if not none), modifyInput checkbox
- Inject system message textarea
- Continue after checkbox

**Step 6: Commit**

```bash
git add src/components/PropertiesPanel/
git commit -m "feat: add PropertiesPanel with editors for all 4 node types"
```

---

### Task 17: Create BlueprintCanvas

**Files:**
- Create: `src/components/Canvas/BlueprintCanvas.tsx`

**Step 1: Write BlueprintCanvas.tsx**

Main canvas wrapper. See spec lines 376-411:

```typescript
const nodeTypes = {
  rules: RulesNode,
  skill: SkillNode,
  subagent: SubagentNode,
  hook: HookNode,
};
const edgeTypes = { typed: TypedEdge };
```

IMPORTANT: `nodeTypes` and `edgeTypes` must be defined OUTSIDE the component (spec line 807).

Configuration:
- Background: dots variant, color #2d333b, gap 20
- MiniMap: dark styled, nodeColor mapped by node type
- Controls: dark styled
- `colorMode="dark"`, `snapToGrid`, `snapGrid={[20,20]}`, `fitView`

Event handlers:
- `onConnect`: validate pin compatibility, determine pinType, create edge
- `onDrop` / `onDragOver`: create node from palette drag at drop position
- `isValidConnection`: use `canConnect` util (look up pin definitions by handle ID)
- `onNodeClick`: set selectedNode in store
- `onPaneClick`: clear selectedNode

Context menu:
- Custom component at right-click position
- Options: Delete node, Duplicate node, Disconnect all edges
- Close on click outside or Escape

**Step 2: Commit**

```bash
git add src/components/Canvas/
git commit -m "feat: add BlueprintCanvas with drag-drop, connection validation, context menu"
```

---

### Task 18: Wire Up App.tsx and main.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Write App.tsx**

Root layout from spec lines 350-360:

```tsx
<div className="h-screen w-screen flex flex-col" style={{ background: CANVAS_BG, fontFamily: "'Inter', sans-serif" }}>
  <Toolbar />
  <div className="flex flex-1 overflow-hidden">
    <NodePalette />
    <BlueprintCanvas />
    {selectedNode && <PropertiesPanel />}
  </div>
  <StatusBar />
</div>
```

Read `selectedNodeId` from store to conditionally render PropertiesPanel.

**Step 2: Update main.tsx**

Ensure it imports `index.css` and `@xyflow/react/dist/style.css`.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@xyflow/react/dist/style.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 3: Verify app loads**

```bash
npm run dev
```

Expected: Full UI renders — palette on left, canvas center, toolbar top, status bar bottom. Can drag nodes from palette to canvas.

**Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire up App layout with all components"
```

---

### Task 19: Integration Testing & Polish

**Step 1: Verify all deliverables from spec checklist**

Manually test each item from spec lines 946-967:
- Dark canvas with dot grid
- 4 node types render with correct colors/icons/pins
- Drag from palette to canvas creates nodes
- Nodes repositionable
- Click node opens PropertiesPanel
- Inline editing and collapse/expand work
- Pin connections validate correctly (compatible = creates edge, incompatible = rejected)
- Edge styling matches pin type (color, dash, animation)
- Save downloads .blueprint.json
- Load restores graph
- Validation shows errors/warnings
- StatusBar shows counts
- MiniMap shows colored nodes
- Context menu works (delete, duplicate, disconnect)

**Step 2: Fix any TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Fix any lint/build issues**

```bash
npm run build
```

Expected: Clean build with no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 MVP — blueprint editor with 4 node types"
```

---

## Task Dependency Graph

```
Task 1 (scaffold)
  └── Task 2 (types)
       ├── Task 3 (constants)
       │    └── Task 4 (utils)
       │         ├── Task 5 (validation)
       │         ├── Task 6 (serialization)
       │         └── Task 7 (store) ← depends on 5, 6
       │              ├── Task 8 (shared components)
       │              ├── Task 9 (TypedHandle)
       │              ├── Task 10 (TypedEdge)
       │              ├── Task 11 (BaseNode) ← depends on 9
       │              │    └── Task 12 (node components) ← depends on 11
       │              ├── Task 13 (palette)
       │              ├── Task 14 (toolbar)
       │              ├── Task 15 (status bar)
       │              ├── Task 16 (properties panel) ← depends on 8
       │              └── Task 17 (canvas) ← depends on 10, 12
       │                   └── Task 18 (App wiring) ← depends on 13-17
       │                        └── Task 19 (integration & polish)
```

Tasks 5, 6 can be parallel. Tasks 8-16 can largely be parallel after 7.
