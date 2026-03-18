# Plugin Node Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix plugin node grouping via drag-and-drop, add visual drop indicators, auto-size plugins to content, and make plugins resizable.

**Architecture:** Add `onNodeDragStop`/`onNodeDrag` handlers to detect drops over plugin nodes, a store action `addToPlugin` for single-node grouping, `recalcPluginSize` for auto-sizing, and React Flow's `NodeResizer` for manual resize. New store field `dragOverPluginId` drives the visual highlight.

**Tech Stack:** React Flow v12 (`@xyflow/react`), Zustand, Vitest

---

### Task 1: Store — `addToPlugin` action

**Files:**
- Modify: `src/store/useGraphStore.ts:32-79` (interface + implementation)
- Test: `src/store/useGraphStore.test.ts`

**Step 1: Write the failing test**

Add to `src/store/useGraphStore.test.ts`:

```typescript
// --- addToPlugin ---

it('adds a node to an existing plugin', () => {
  // Create a plugin node
  useGraphStore.getState().addNode('plugin', { x: 0, y: 0 });
  const pluginId = useGraphStore.getState().nodes[0].id;
  // Set plugin size via style
  useGraphStore.setState({
    nodes: useGraphStore.getState().nodes.map((n) =>
      n.id === pluginId ? { ...n, style: { width: 500, height: 400 } } : n
    ),
  });

  // Create a skill node at global position (100, 100)
  useGraphStore.getState().addNode('skill', { x: 100, y: 100 });
  const skillId = useGraphStore.getState().nodes[1].id;

  useGraphStore.getState().addToPlugin(skillId, pluginId);

  const updatedSkill = useGraphStore.getState().nodes.find((n) => n.id === skillId)!;
  expect(updatedSkill.parentId).toBe(pluginId);
  // Position should be converted to relative (global - plugin position)
  expect(updatedSkill.position).toEqual({ x: 100, y: 100 });
});

it('does nothing when node is already in a plugin', () => {
  useGraphStore.getState().addNode('plugin', { x: 0, y: 0 });
  const pluginId = useGraphStore.getState().nodes[0].id;
  useGraphStore.setState({
    nodes: useGraphStore.getState().nodes.map((n) =>
      n.id === pluginId ? { ...n, style: { width: 500, height: 400 } } : n
    ),
  });

  useGraphStore.getState().addNode('skill', { x: 100, y: 100 });
  const skillId = useGraphStore.getState().nodes[1].id;

  // Add to plugin
  useGraphStore.getState().addToPlugin(skillId, pluginId);
  // Try adding again — should be no-op
  const positionBefore = useGraphStore.getState().nodes.find((n) => n.id === skillId)!.position;
  useGraphStore.getState().addToPlugin(skillId, pluginId);
  const positionAfter = useGraphStore.getState().nodes.find((n) => n.id === skillId)!.position;
  expect(positionAfter).toEqual(positionBefore);
});

it('does not add a plugin node into another plugin', () => {
  useGraphStore.getState().addNode('plugin', { x: 0, y: 0 });
  useGraphStore.getState().addNode('plugin', { x: 200, y: 200 });
  const plugin1 = useGraphStore.getState().nodes[0].id;
  const plugin2 = useGraphStore.getState().nodes[1].id;

  useGraphStore.getState().addToPlugin(plugin2, plugin1);
  const updated = useGraphStore.getState().nodes.find((n) => n.id === plugin2)!;
  expect(updated.parentId).toBeUndefined();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: FAIL — `addToPlugin` is not a function

**Step 3: Write minimal implementation**

In `src/store/useGraphStore.ts`, add to the interface (after `removeFromPlugin`):

```typescript
addToPlugin: (nodeId: string, pluginId: string) => void;
```

Add implementation (after `removeFromPlugin` action):

```typescript
addToPlugin: (nodeId, pluginId) => {
  const { nodes } = get();
  const node = nodes.find((n) => n.id === nodeId);
  const plugin = nodes.find((n) => n.id === pluginId);
  if (!node || !plugin) return;
  // Don't add if already in a plugin, or if it IS a plugin
  if (node.parentId || node.type === 'plugin') return;

  set({
    nodes: nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            parentId: pluginId,
            position: {
              x: n.position.x - plugin.position.x,
              y: n.position.y - plugin.position.y,
            },
          }
        : n
    ),
  });
},
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/store/useGraphStore.ts src/store/useGraphStore.test.ts
git commit -m "feat(plugin): add addToPlugin store action"
```

---

### Task 2: Store — `recalcPluginSize` action

**Files:**
- Modify: `src/store/useGraphStore.ts`
- Test: `src/store/useGraphStore.test.ts`

**Step 1: Write the failing test**

```typescript
// --- recalcPluginSize ---

it('recalculates plugin size based on children', () => {
  // Create plugin with initial style
  useGraphStore.getState().addNode('plugin', { x: 0, y: 0 });
  const pluginId = useGraphStore.getState().nodes[0].id;
  useGraphStore.setState({
    nodes: useGraphStore.getState().nodes.map((n) =>
      n.id === pluginId ? { ...n, style: { width: 500, height: 400 } } : n
    ),
  });

  // Add two skill nodes as children (relative positions)
  useGraphStore.getState().addNode('skill', { x: 100, y: 100 });
  useGraphStore.getState().addNode('skill', { x: 400, y: 300 });
  const nodes = useGraphStore.getState().nodes;
  const child1Id = nodes[1].id;
  const child2Id = nodes[2].id;

  // Manually set parentId and relative positions
  useGraphStore.setState({
    nodes: nodes.map((n) => {
      if (n.id === child1Id) return { ...n, parentId: pluginId, position: { x: 60, y: 80 } };
      if (n.id === child2Id) return { ...n, parentId: pluginId, position: { x: 300, y: 250 } };
      return n;
    }),
  });

  useGraphStore.getState().recalcPluginSize(pluginId);

  const plugin = useGraphStore.getState().nodes.find((n) => n.id === pluginId)!;
  const style = plugin.style as { width: number; height: number };
  // Should encompass children with padding (60 each side, 50 header)
  // Children span x: 60..600 (300 + default 300), y: 80..450 (250 + default 200)
  // width = 600 + 60 padding = 660, but at least minWidth 400
  // height = 450 + 50 header + 60 padding = 560, but at least minHeight 200
  expect(style.width).toBeGreaterThanOrEqual(400);
  expect(style.height).toBeGreaterThanOrEqual(200);
});

it('enforces minimum size when plugin has no children', () => {
  useGraphStore.getState().addNode('plugin', { x: 0, y: 0 });
  const pluginId = useGraphStore.getState().nodes[0].id;

  useGraphStore.getState().recalcPluginSize(pluginId);

  const plugin = useGraphStore.getState().nodes.find((n) => n.id === pluginId)!;
  const style = plugin.style as { width: number; height: number };
  expect(style.width).toBe(400);
  expect(style.height).toBe(200);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: FAIL — `recalcPluginSize` is not a function

**Step 3: Write minimal implementation**

Add to interface:

```typescript
recalcPluginSize: (pluginId: string) => void;
```

Add implementation:

```typescript
recalcPluginSize: (pluginId) => {
  const { nodes } = get();
  const plugin = nodes.find((n) => n.id === pluginId && n.type === 'plugin');
  if (!plugin) return;

  const children = nodes.filter((n) => n.parentId === pluginId);
  const padding = 60;
  const headerHeight = 50;
  const minWidth = 400;
  const minHeight = 200;

  if (children.length === 0) {
    set({
      nodes: nodes.map((n) =>
        n.id === pluginId ? { ...n, style: { ...n.style, width: minWidth, height: minHeight } } : n
      ),
    });
    return;
  }

  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const child of children) {
    const w = (child.measured?.width ?? child.width ?? 300) as number;
    const h = (child.measured?.height ?? child.height ?? 200) as number;
    maxX = Math.max(maxX, child.position.x + w);
    maxY = Math.max(maxY, child.position.y + h);
  }

  const width = Math.max(minWidth, maxX + padding);
  const height = Math.max(minHeight, maxY + headerHeight + padding);

  set({
    nodes: nodes.map((n) =>
      n.id === pluginId ? { ...n, style: { ...n.style, width, height } } : n
    ),
  });
},
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS

**Step 5: Wire recalcPluginSize into addToPlugin, removeFromPlugin, and groupIntoPlugin**

Update `addToPlugin` — add at the end (after `set`):

```typescript
// After set(), recalc size
get().recalcPluginSize(pluginId);
```

Update `removeFromPlugin` — add at the end:

```typescript
// Recalc the plugin the node was removed from
get().recalcPluginSize(parentId);
```

(Store the parentId before the `set` call.)

Update `groupIntoPlugin` — replace the manual `style` calc with a call to `recalcPluginSize(pluginId)` after the set.

**Step 6: Run tests**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add src/store/useGraphStore.ts src/store/useGraphStore.test.ts
git commit -m "feat(plugin): add recalcPluginSize and wire into grouping actions"
```

---

### Task 3: Store — `dragOverPluginId` state field

**Files:**
- Modify: `src/store/useGraphStore.ts`
- Test: `src/store/useGraphStore.test.ts`

**Step 1: Write the failing test**

```typescript
// --- dragOverPluginId ---

it('sets and clears dragOverPluginId', () => {
  expect(useGraphStore.getState().dragOverPluginId).toBeNull();
  useGraphStore.getState().setDragOverPluginId('plugin-1');
  expect(useGraphStore.getState().dragOverPluginId).toBe('plugin-1');
  useGraphStore.getState().setDragOverPluginId(null);
  expect(useGraphStore.getState().dragOverPluginId).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Add to interface:

```typescript
dragOverPluginId: string | null;
setDragOverPluginId: (id: string | null) => void;
```

Add to state init:

```typescript
dragOverPluginId: null,
```

Add setter:

```typescript
setDragOverPluginId: (id) => set({ dragOverPluginId: id }),
```

Exclude from `partialize` (undo/redo should not track this).

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/store/useGraphStore.ts src/store/useGraphStore.test.ts
git commit -m "feat(plugin): add dragOverPluginId store state"
```

---

### Task 4: Canvas — `onNodeDrag` and `onNodeDragStop` handlers

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx`

**Step 1: Create helper function `findPluginAtPosition`**

Add in `BlueprintCanvas.tsx` (above the component, or as a `useCallback` inside):

```typescript
/** Find a plugin node whose bounding box contains the given flow position, excluding the dragged node */
function findPluginAtPosition(
  nodes: Node[],
  flowX: number,
  flowY: number,
  excludeNodeId: string
): Node | undefined {
  return nodes.find((n) => {
    if (n.type !== 'plugin' || n.id === excludeNodeId) return false;
    const w = ((n.style as Record<string, unknown>)?.width as number) ?? n.measured?.width ?? 400;
    const h = ((n.style as Record<string, unknown>)?.height as number) ?? n.measured?.height ?? 200;
    return (
      flowX >= n.position.x &&
      flowX <= n.position.x + w &&
      flowY >= n.position.y &&
      flowY <= n.position.y + h
    );
  });
}
```

**Step 2: Add `onNodeDrag` handler**

```typescript
const setDragOverPluginId = useGraphStore((s) => s.setDragOverPluginId);
const addToPlugin = useGraphStore((s) => s.addToPlugin);

const onNodeDrag = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    // Don't show drop zone for plugin nodes or nodes already in a plugin
    if (node.type === 'plugin' || node.parentId) {
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

const onNodeDragStop = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    const dragOverId = useGraphStore.getState().dragOverPluginId;
    setDragOverPluginId(null);

    if (!dragOverId || node.type === 'plugin' || node.parentId) return;
    addToPlugin(node.id, dragOverId);
  },
  [setDragOverPluginId, addToPlugin]
);
```

**Step 3: Wire handlers into ReactFlow**

Add props to the `<ReactFlow>` component:

```tsx
onNodeDrag={onNodeDrag}
onNodeDragStop={onNodeDragStop}
```

**Step 4: Verify manually** (dev server)

Drag a skill node over a plugin — plugin should highlight (after Task 5). Drop it — node should become a child.

**Step 5: Commit**

```bash
git add src/components/Canvas/BlueprintCanvas.tsx
git commit -m "feat(plugin): add drag-to-group with onNodeDrag/onNodeDragStop"
```

---

### Task 5: PluginNode — visual drop indicator

**Files:**
- Modify: `src/components/Nodes/PluginNode.tsx`

**Step 1: Read `dragOverPluginId` from store**

```typescript
const dragOverPluginId = useGraphStore((s) => s.dragOverPluginId);
const isDropTarget = dragOverPluginId === id;
```

**Step 2: Apply highlight styles**

Update the outer `<div>` style:

```typescript
border: `2px dashed ${isDropTarget ? '#f43f5e' : selected ? '#f43f5e' : '#f43f5e40'}`,
background: isDropTarget ? '#f43f5e18' : '#f43f5e08',
boxShadow: isDropTarget ? '0 0 20px #f43f5e30, inset 0 0 20px #f43f5e10' : 'none',
transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
```

**Step 3: Add `data-testid` for drop target state**

```tsx
data-testid={`plugin-node-${id}`}
data-drop-target={isDropTarget || undefined}
```

**Step 4: Commit**

```bash
git add src/components/Nodes/PluginNode.tsx
git commit -m "feat(plugin): add visual drop indicator when dragging over plugin"
```

---

### Task 6: PluginNode — resize support with NodeResizer

**Files:**
- Modify: `src/components/Nodes/PluginNode.tsx`

**Step 1: Import NodeResizer**

```typescript
import { type NodeProps, NodeResizer } from '@xyflow/react';
```

**Step 2: Add NodeResizer inside the component**

Add as the first child inside the outer `<div>`, before the header:

```tsx
<NodeResizer
  minWidth={400}
  minHeight={200}
  isVisible={selected ?? false}
  lineStyle={{ borderColor: '#f43f5e60' }}
  handleStyle={{
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
  }}
/>
```

**Step 3: Commit**

```bash
git add src/components/Nodes/PluginNode.tsx
git commit -m "feat(plugin): add resize support with NodeResizer"
```

---

### Task 7: Auto-recalc plugin size on child node position changes

**Files:**
- Modify: `src/store/useGraphStore.ts` — `onNodesChange` handler

**Step 1: Update `onNodesChange` to recalc plugin sizes after position changes**

```typescript
onNodesChange: (changes) => {
  const newNodes = applyNodeChanges(changes, get().nodes);
  set({ nodes: newNodes });

  // After position changes, recalc affected plugins
  const positionChanges = changes.filter(
    (c) => c.type === 'position' && c.dragging === false
  );
  if (positionChanges.length > 0) {
    const pluginIds = new Set<string>();
    for (const change of positionChanges) {
      const node = newNodes.find((n) => n.id === change.id);
      if (node?.parentId) pluginIds.add(node.parentId);
    }
    for (const pluginId of pluginIds) {
      get().recalcPluginSize(pluginId);
    }
  }
},
```

**Step 2: Run existing tests**

Run: `npx vitest run src/store/useGraphStore.test.ts`
Expected: PASS (existing tests should still work)

**Step 3: Commit**

```bash
git add src/store/useGraphStore.ts
git commit -m "feat(plugin): auto-recalc plugin size on child position changes"
```

---

### Task 8: Unit tests for all new store actions (coverage check)

**Files:**
- Modify: `src/store/useGraphStore.test.ts`

**Step 1: Run coverage on the store**

Run: `npx vitest run src/store/useGraphStore.test.ts --coverage`

**Step 2: Add any missing tests for edge cases**

Ensure coverage for:
- `addToPlugin` with nonexistent nodeId or pluginId (no-op)
- `recalcPluginSize` with nonexistent pluginId (no-op)
- `recalcPluginSize` called on a non-plugin node (no-op)
- `removeFromPlugin` now triggers recalc
- `groupIntoPlugin` uses recalc (check style is set)

**Step 3: Run full store tests with coverage**

Run: `npx vitest run src/store/useGraphStore.test.ts --coverage`
Expected: All pass, new actions covered

**Step 4: Commit**

```bash
git add src/store/useGraphStore.test.ts
git commit -m "test(plugin): add comprehensive tests for plugin store actions"
```

---

### Task 9: E2E test suite for plugin drag-and-drop

**Files:**
- Create: `docs/test-suites/suite-033-plugin-drag-drop.json`

**Step 1: Create the E2E suite**

Check latest TC IDs across existing suites. Create suite with tests covering:

- TC-XXX: Drag a node over a plugin shows visual highlight
- TC-XXX: Drop a node onto a plugin groups it as a child
- TC-XXX: Dropping a plugin onto another plugin does not nest
- TC-XXX: Node already in a plugin cannot be re-grouped into another
- TC-XXX: Plugin resizes to fit children after drop
- TC-XXX: Plugin is resizable via drag handles when selected
- TC-XXX: Plugin has minimum size when empty
- TC-XXX: Removing a node from plugin recalculates plugin size

**Step 2: Run the suite**

Run: `node pw_test_runner.cjs --input docs/test-suites/suite-033-plugin-drag-drop.json --output-dir test-results`
Expected: All tests pass

**Step 3: Commit**

```bash
git add docs/test-suites/suite-033-plugin-drag-drop.json
git commit -m "test(e2e): add plugin drag-drop and resize test suite"
```

---

### Task 10: Final verification

**Step 1: Run all unit tests**

Run: `npm run test`
Expected: All pass

**Step 2: Run all affected E2E suites**

Run the new suite + context menu suite (suite-009) + node creation suite (suite-003):

```bash
node pw_test_runner.cjs --input docs/test-suites/suite-033-plugin-drag-drop.json --output-dir test-results
node pw_test_runner.cjs --input docs/test-suites/suite-009-context-menu.json --output-dir test-results
node pw_test_runner.cjs --input docs/test-suites/suite-003-node-creation.json --output-dir test-results
```

Expected: All pass

**Step 3: Commit any final fixes**
