# Plugin Child Node Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve plugin-child node interactions: detach on drag-out, quick-add over plugin surface, unlink button in editor, and plugin membership indicator on child nodes.

**Architecture:** Four independent features touching BlueprintCanvas (drag/connect handlers), BaseNode (link indicator), PluginEditor (unlink button), and pluginHelpers (position check utility). All features use the existing `removeFromPlugin` store action.

**Tech Stack:** React, @xyflow/react, zustand, lucide-react, vitest

---

### Task 1: Utility — `isNodeOutsidePlugin` helper

**Files:**
- Modify: `src/utils/pluginHelpers.ts`
- Test: `src/utils/pluginHelpers.test.ts`

**Step 1: Write the failing test**

In `src/utils/pluginHelpers.test.ts` (create if needed):

```typescript
import { describe, it, expect } from 'vitest';
import { isNodeOutsidePlugin } from './pluginHelpers';
import type { Node } from '@xyflow/react';

describe('isNodeOutsidePlugin', () => {
  const makePlugin = (x: number, y: number, w: number, h: number): Node => ({
    id: 'plugin-1',
    type: 'plugin',
    position: { x, y },
    data: {},
    style: { width: w, height: h },
  });

  const makeChild = (relX: number, relY: number, w = 300, h = 200): Node => ({
    id: 'child-1',
    type: 'skill',
    position: { x: relX, y: relY },
    parentId: 'plugin-1',
    data: {},
    measured: { width: w, height: h },
  });

  it('returns false when node center is inside plugin', () => {
    const plugin = makePlugin(0, 0, 600, 400);
    const child = makeChild(100, 100, 100, 80);
    expect(isNodeOutsidePlugin(child, plugin)).toBe(false);
  });

  it('returns true when node center is to the right of plugin', () => {
    const plugin = makePlugin(0, 0, 400, 400);
    const child = makeChild(500, 100, 100, 80);
    expect(isNodeOutsidePlugin(child, plugin)).toBe(true);
  });

  it('returns true when node center is above plugin', () => {
    const plugin = makePlugin(0, 0, 400, 400);
    const child = makeChild(100, -300, 100, 80);
    expect(isNodeOutsidePlugin(child, plugin)).toBe(true);
  });

  it('returns true when node center is below plugin', () => {
    const plugin = makePlugin(0, 0, 400, 300);
    const child = makeChild(100, 400, 100, 80);
    expect(isNodeOutsidePlugin(child, plugin)).toBe(true);
  });

  it('returns true when node center is to the left of plugin', () => {
    const plugin = makePlugin(100, 100, 400, 400);
    const child = makeChild(-200, 100, 100, 80);
    expect(isNodeOutsidePlugin(child, plugin)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/pluginHelpers.test.ts`
Expected: FAIL — `isNodeOutsidePlugin` is not exported

**Step 3: Write minimal implementation**

Add to `src/utils/pluginHelpers.ts`:

```typescript
/** Check if a child node's center (in relative coords) is outside its parent plugin bounds */
export function isNodeOutsidePlugin(childNode: Node, pluginNode: Node): boolean {
  const childW = (childNode.measured?.width ?? 300) as number;
  const childH = (childNode.measured?.height ?? 200) as number;
  const centerX = childNode.position.x + childW / 2;
  const centerY = childNode.position.y + childH / 2;

  const pluginW = ((pluginNode.style as Record<string, unknown>)?.width as number) ?? pluginNode.measured?.width ?? PLUGIN_MIN_WIDTH;
  const pluginH = ((pluginNode.style as Record<string, unknown>)?.height as number) ?? pluginNode.measured?.height ?? PLUGIN_MIN_HEIGHT;

  return centerX < 0 || centerX > pluginW || centerY < 0 || centerY > pluginH;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/pluginHelpers.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/pluginHelpers.ts src/utils/pluginHelpers.test.ts
git commit -m "feat: add isNodeOutsidePlugin helper for detach-on-drag"
```

---

### Task 2: Detach node on drop outside plugin

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx:260-283`

**Step 1: Write the failing test**

Add to `src/store/useGraphStore.test.ts` a test that validates the store-level behavior (removeFromPlugin already tested). The canvas interaction is E2E-tested. No new unit test needed for this task — store action is already covered.

**Step 2: Modify `onNodeDrag` to allow drag-over detection for child nodes**

In `BlueprintCanvas.tsx`, update `onNodeDrag` (line 260-272):

```typescript
const onNodeDrag = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    // Child nodes: no drag-over detection (they can't be added to another plugin)
    if (node.parentId) {
      setDragOverPluginId(null);
      return;
    }
    if (node.type === 'plugin') {
      setDragOverPluginId(null);
      return;
    }
    const centerX = node.position.x + (node.measured?.width ?? 300) / 2;
    const centerY = node.position.y + (node.measured?.height ?? 200) / 2;
    const plugin = findPluginAtPosition(nodes, centerX, centerY, node.id);
    setDragOverPluginId(plugin?.id ?? null);
  },
  [nodes, setDragOverPluginId]
);
```

**Step 3: Modify `onNodeDragStop` to detach child nodes dropped outside**

In `BlueprintCanvas.tsx`, update `onNodeDragStop` (line 274-283). Add import for `isNodeOutsidePlugin`:

```typescript
import { findPluginAtPosition, isNodeOutsidePlugin } from '../../utils/pluginHelpers';
```

```typescript
const onNodeDragStop = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    const dragOverId = useGraphStore.getState().dragOverPluginId;
    setDragOverPluginId(null);

    // Child node dragged outside its parent plugin → detach
    if (node.parentId) {
      const currentNodes = useGraphStore.getState().nodes;
      const parentPlugin = currentNodes.find((n) => n.id === node.parentId);
      // Re-read the node from store to get updated position after drag
      const currentNode = currentNodes.find((n) => n.id === node.id);
      if (parentPlugin && currentNode && isNodeOutsidePlugin(currentNode, parentPlugin)) {
        removeFromPlugin(node.id);
      }
      return;
    }

    if (!dragOverId || node.type === 'plugin') return;
    addToPlugin(node.id, dragOverId);
  },
  [setDragOverPluginId, addToPlugin, removeFromPlugin]
);
```

Note: `removeFromPlugin` must be added to the store selectors at the top of the component (it's already there at line 94).

**Step 4: Run unit tests**

Run: `npx vitest run src/utils/pluginHelpers.test.ts src/store/useGraphStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/Canvas/BlueprintCanvas.tsx
git commit -m "feat: detach child node from plugin when dropped outside bounds"
```

---

### Task 3: Quick-add over empty plugin area

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx:293-334`

**Step 1: Update `onConnectEnd` to treat plugin surface as empty canvas**

In `BlueprintCanvas.tsx`, update the condition in `onConnectEndHandler` (line 300-303):

Replace:
```typescript
if (target.closest('.react-flow__handle') || target.closest('.react-flow__node')) {
  return;
}
```

With:
```typescript
// If dropped on a handle, let normal connection logic handle it
if (target.closest('.react-flow__handle')) {
  return;
}

// If dropped on a node, check if it's a plugin's empty area
const closestNode = target.closest('.react-flow__node');
if (closestNode) {
  const nodeId = closestNode.getAttribute('data-id');
  const nodeInStore = nodes.find((n) => n.id === nodeId);
  // Only allow quick-add if dropped on a plugin node (empty area, not a child)
  if (!nodeInStore || nodeInStore.type !== 'plugin') {
    return;
  }
}
```

**Step 2: Run unit tests**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS (no store changes)

**Step 3: Commit**

```bash
git add src/components/Canvas/BlueprintCanvas.tsx
git commit -m "feat: trigger quick-add menu when edge dropped on plugin empty area"
```

---

### Task 4: Unlink button in PluginEditor

**Files:**
- Modify: `src/components/PropertiesPanel/PluginEditor.tsx`

**Step 1: Add Unlink2 icon and removeFromPlugin action**

```typescript
import { Unlink2 } from 'lucide-react';
```

Add store selector:
```typescript
const removeFromPlugin = useGraphStore((s) => s.removeFromPlugin);
```

**Step 2: Add unlink button to each child row**

Replace the child row `<div>` (lines 68-83) with:

```typescript
return (
  <div
    key={child.id}
    className="flex items-center gap-2 px-2 py-1 rounded"
    style={{ background: 'var(--node-bg)', border: '1px solid var(--node-border)' }}
  >
    <span
      className="bp-badge text-[10px]"
      style={{ background: '#f43f5e20', color: '#f43f5e' }}
    >
      {childType}
    </span>
    <span className="text-xs truncate flex-1" style={{ color: 'var(--text-primary)' }}>
      {childLabel}
    </span>
    <button
      data-testid={`unlink-child-${child.id}`}
      onClick={() => removeFromPlugin(child.id)}
      className="p-0.5 rounded hover:opacity-70 shrink-0"
      style={{ color: 'var(--text-muted)' }}
      title="Detach from plugin"
    >
      <Unlink2 size={12} />
    </button>
  </div>
);
```

**Step 3: Run unit tests**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/PropertiesPanel/PluginEditor.tsx
git commit -m "feat: add unlink button for child nodes in PluginEditor"
```

---

### Task 5: Plugin membership indicator on child nodes

**Files:**
- Modify: `src/components/Nodes/BaseNode.tsx`

**Step 1: Add Link icon, tooltip, and store dependencies**

Add imports:
```typescript
import { Link } from 'lucide-react';
```

**Step 2: Add parentId prop and plugin lookup**

Update `BaseNodeProps` interface — no, BaseNode doesn't have `parentId`. We'll read it from the store.

Add to `BaseNodeInner`:
```typescript
const nodes = useGraphStore((s) => s.nodes);
const selectNode = useGraphStore((s) => s.selectNode);

const currentNode = nodes.find((n) => n.id === id);
const parentPlugin = currentNode?.parentId
  ? nodes.find((n) => n.id === currentNode.parentId)
  : null;
const parentLabel = parentPlugin
  ? ((parentPlugin.data as Record<string, unknown>)?.label as string) ?? 'Plugin'
  : null;
```

**Step 3: Add link icon in header, after the label span**

In the header row, after the label `<span>` (line 100-111) and before the validation icons (line 112), add:

```typescript
{parentPlugin && (
  <button
    data-testid="plugin-link-indicator"
    onClick={(e) => {
      e.stopPropagation();
      if (parentPlugin) {
        selectNode(parentPlugin.id);
        fitView({ nodes: [{ id: parentPlugin.id }], padding: 0.3, duration: 300 });
      }
    }}
    className="p-0.5 rounded hover:opacity-70 shrink-0 nopan nodrag"
    style={{ color: NODE_COLORS.plugin.header }}
    title={parentLabel ?? 'Plugin'}
  >
    <Link size={12} />
  </button>
)}
```

Note: The `flex-1` on the label span ensures the link icon appears right after the label text, not pushed to the far right. We need to wrap label + link icon together. Update the label area:

Replace the label `<span>` (non-editing case, lines 100-111):
```typescript
) : (
  <span
    data-testid="node-label"
    className="text-xs font-medium truncate cursor-text"
    style={{ color: 'var(--text-primary)' }}
    onDoubleClick={(e) => {
      e.stopPropagation();
      setEditing(true);
    }}
  >
    {data.label}
  </span>
)}
{parentPlugin && (
  <button
    data-testid="plugin-link-indicator"
    onClick={(e) => {
      e.stopPropagation();
      selectNode(parentPlugin.id);
      fitView({ nodes: [{ id: parentPlugin.id }], padding: 0.3, duration: 300 });
    }}
    className="p-0.5 rounded hover:opacity-70 shrink-0 nopan nodrag"
    style={{ color: NODE_COLORS.plugin.header }}
    title={parentLabel ?? 'Plugin'}
  >
    <Link size={12} />
  </button>
)}
```

The existing `flex-1` on the label `<span>` pushes everything after it to the right, but we want the link icon right after label. Change label's `flex-1` to nothing, and add a `<div className="flex-1" />` spacer after the link icon (or after label if no link icon):

Actually, looking at the header layout: `[Icon] [Label (flex-1)] [validation] [collapse] ` — the `flex-1` on label takes remaining space. We want: `[Icon] [Label] [LinkIcon] [flex-1 spacer] [validation] [collapse]`.

Updated header section:

```typescript
{editing ? (
  <input
    ref={inputRef}
    data-testid="node-label-input"
    className="text-xs font-medium flex-1 min-w-0 bg-transparent border-none outline-none p-0 nopan nodrag"
    style={{ color: 'var(--text-primary)' }}
    value={draft}
    onChange={(e) => setDraft(e.target.value)}
    onBlur={commitEdit}
    onKeyDown={(e) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') { setDraft(data.label); setEditing(false); }
      e.stopPropagation();
    }}
    onClick={(e) => e.stopPropagation()}
  />
) : (
  <span
    data-testid="node-label"
    className="text-xs font-medium truncate cursor-text"
    style={{ color: 'var(--text-primary)' }}
    onDoubleClick={(e) => {
      e.stopPropagation();
      setEditing(true);
    }}
  >
    {data.label}
  </span>
)}
{parentPlugin && (
  <button
    data-testid="plugin-link-indicator"
    onClick={(e) => {
      e.stopPropagation();
      selectNode(parentPlugin.id);
      fitView({ nodes: [{ id: parentPlugin.id }], padding: 0.3, duration: 300 });
    }}
    className="p-0.5 rounded hover:opacity-70 shrink-0 nopan nodrag"
    style={{ color: NODE_COLORS.plugin.header }}
    title={parentLabel ?? 'Plugin'}
  >
    <Link size={12} />
  </button>
)}
<div className="flex-1" />
{hasErrors && <AlertCircle size={14} style={{ color: '#ef4444' }} title={data.validation.errors.join('\n')} />}
```

Note: Remove the old `flex-1` class from the label `<span>` — change `className="text-xs font-medium flex-1 truncate cursor-text"` to `className="text-xs font-medium truncate cursor-text"`. Same for the editing `<input>` — change `className="text-xs font-medium flex-1 min-w-0 ..."` to `className="text-xs font-medium min-w-0 ..."`, but keep `min-w-0` on input. Actually the input needs `flex-1` to fill available space during editing. Let's keep `flex-1` on input but remove it from the non-editing label span.

**Step 4: Write unit test for BaseNode with parentId**

In `src/components/Nodes/BaseNode.test.tsx` (create or append):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useGraphStore } from '../../store/useGraphStore';
import { PinDirection, PinType } from '../../types/pins';

function resetStore() {
  useGraphStore.getState().clearGraph();
}

const testPins = [
  { id: 'in_exec', type: PinType.Exec, direction: PinDirection.In, label: 'In' },
];

describe('BaseNode plugin link indicator', () => {
  beforeEach(() => resetStore());

  it('shows link icon when node has a parent plugin', () => {
    // Set up store with a plugin and a child node
    useGraphStore.setState({
      nodes: [
        {
          id: 'plugin-1',
          type: 'plugin',
          position: { x: 0, y: 0 },
          data: { label: 'My Plugin', collapsed: false, validation: { errors: [], warnings: [] } },
        },
        {
          id: 'child-1',
          type: 'skill',
          position: { x: 50, y: 50 },
          parentId: 'plugin-1',
          data: { label: 'Child Skill', collapsed: false, validation: { errors: [], warnings: [] } },
        },
      ],
    });

    render(
      <ReactFlowProvider>
        <BaseNode
          id="child-1"
          nodeType="skill"
          data={{ label: 'Child Skill', collapsed: false, validation: { errors: [], warnings: [] } }}
          pins={testPins}
          icon={() => <span>icon</span>}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByTestId('plugin-link-indicator')).toBeTruthy();
    expect(screen.getByTestId('plugin-link-indicator').getAttribute('title')).toBe('My Plugin');
  });

  it('does not show link icon when node has no parent', () => {
    useGraphStore.setState({
      nodes: [
        {
          id: 'node-1',
          type: 'skill',
          position: { x: 100, y: 100 },
          data: { label: 'Standalone', collapsed: false, validation: { errors: [], warnings: [] } },
        },
      ],
    });

    render(
      <ReactFlowProvider>
        <BaseNode
          id="node-1"
          nodeType="skill"
          data={{ label: 'Standalone', collapsed: false, validation: { errors: [], warnings: [] } }}
          pins={testPins}
          icon={() => <span>icon</span>}
        />
      </ReactFlowProvider>
    );

    expect(screen.queryByTestId('plugin-link-indicator')).toBeNull();
  });
});
```

**Step 5: Run tests**

Run: `npx vitest run src/components/Nodes/BaseNode.test.tsx src/utils/pluginHelpers.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/Nodes/BaseNode.tsx src/components/Nodes/BaseNode.test.tsx
git commit -m "feat: add plugin membership link indicator on child nodes"
```

---

### Task 6: E2E test suites

**Files:**
- Create/Update: `docs/test-suites/suite-NNN-plugin-child-management.json`

**Step 1: Check existing suites for latest TC ID**

Run: `grep -r '"id": "TC-' docs/test-suites/ | sort` to find the highest TC ID.

**Step 2: Write E2E suite**

Create `docs/test-suites/suite-NNN-plugin-child-management.json` with test cases:

- TC-XXX: Drag child node outside plugin bounds → node detaches
- TC-XXX: Drag child node within plugin bounds → node stays as child
- TC-XXX: Drop edge on empty plugin area → quick-add menu appears
- TC-XXX: Drop edge on child node inside plugin → no quick-add menu
- TC-XXX: Click unlink button in PluginEditor → child detaches
- TC-XXX: Plugin link indicator visible on child node
- TC-XXX: Click plugin link indicator → parent plugin focused

**Step 3: Run E2E suite**

Run: `node pw_test_runner.cjs --input docs/test-suites/suite-NNN-plugin-child-management.json --output-dir test-results`
Expected: All PASS

**Step 4: Commit**

```bash
git add docs/test-suites/suite-NNN-plugin-child-management.json
git commit -m "test: add E2E suite for plugin child node management"
```

---

### Task 7: Final verification

**Step 1: Run all unit tests**

Run: `npm run test`
Expected: All PASS

**Step 2: Run full E2E suite**

Run all relevant E2E suites to verify no regressions.

**Step 3: Final commit if any fixes needed**
