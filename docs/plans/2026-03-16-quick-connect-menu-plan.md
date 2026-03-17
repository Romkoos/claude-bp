# Quick-Connect Menu Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When dragging an edge from a port and releasing on empty canvas, show a filtered context menu of compatible nodes; selecting one creates and auto-connects it.

**Architecture:** Add `getCompatibleNodeTypes()` utility to `pinCompatibility.ts`. Track connection drag state via `onConnectStart`/`onConnectEnd` in `BlueprintCanvas`. Show a filtered context menu at drop point using the same styling as the existing canvas context menu.

**Tech Stack:** React Flow (`onConnectStart`, `onConnectEnd`), React state, existing Zustand store actions

---

### Task 1: Add `getCompatibleNodeTypes` utility

**Files:**
- Modify: `src/utils/pinCompatibility.ts`

**Step 1: Add the utility function**

Add to `src/utils/pinCompatibility.ts`:

```typescript
import { PinDirection, type PinDefinition, type PinType } from '../types/pins';
import type { BlueprintNodeType } from '../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../constants/nodeDefaults';

/**
 * Given a pin that was dragged, return all node types that have at least one
 * compatible pin (same PinType, opposite direction).
 * Returns array of { nodeType, pinId } for auto-connection.
 */
export function getCompatibleNodeTypes(
  draggedPinType: PinType,
  draggedPinDirection: PinDirection
): { nodeType: BlueprintNodeType; pinId: string }[] {
  const needDirection = draggedPinDirection === PinDirection.Out
    ? PinDirection.In
    : PinDirection.Out;

  const results: { nodeType: BlueprintNodeType; pinId: string }[] = [];

  for (const [nodeType, pins] of Object.entries(NODE_PIN_DEFINITIONS)) {
    const match = pins.find(
      (p) => p.type === draggedPinType && p.direction === needDirection
    );
    if (match) {
      results.push({ nodeType: nodeType as BlueprintNodeType, pinId: match.id });
    }
  }

  return results;
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/utils/pinCompatibility.ts
git commit -m "feat: add getCompatibleNodeTypes utility for quick-connect menu"
```

---

### Task 2: Track connection drag state and show quick-connect menu

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx`

**Step 1: Add imports and state**

Add to existing imports in `BlueprintCanvas.tsx`:

```typescript
import type { OnConnectStart } from '@xyflow/react';
import { PinDirection } from '../../types/pins';
import { getCompatibleNodeTypes } from '../../utils/pinCompatibility';
```

Add new state inside `BlueprintCanvas` component, alongside existing `contextMenu`/`canvasMenu` state:

```typescript
const [quickConnectMenu, setQuickConnectMenu] = useState<{
  x: number;
  y: number;
  sourceNodeId: string;
  sourceHandleId: string;
  items: { nodeType: BlueprintNodeType; pinId: string }[];
  draggedFromSource: boolean; // true = dragged from output, false = dragged from input
} | null>(null);
```

Add a ref to track the connection start info (needed because `onConnectEnd` doesn't receive it):

```typescript
const connectStartRef = useRef<{
  nodeId: string;
  handleId: string;
  handleType: 'source' | 'target';
} | null>(null);
```

**Step 2: Add `onConnectStart` handler**

```typescript
const onConnectStart: OnConnectStart = useCallback((_event, params) => {
  connectStartRef.current = {
    nodeId: params.nodeId ?? '',
    handleId: params.handleId ?? '',
    handleType: params.handleType ?? 'source',
  };
}, []);
```

**Step 3: Add `onConnectEnd` handler**

```typescript
const onConnectEnd = useCallback(
  (event: MouseEvent | TouchEvent) => {
    const startInfo = connectStartRef.current;
    connectStartRef.current = null;
    if (!startInfo) return;

    // Check if dropped on a node/handle (connection succeeded) — if so, do nothing
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__handle') || target.closest('.react-flow__node')) {
      return;
    }

    // Find the dragged pin definition
    const sourceNode = nodes.find((n) => n.id === startInfo.nodeId);
    if (!sourceNode) return;

    const pins = NODE_PIN_DEFINITIONS[sourceNode.type as BlueprintNodeType];
    if (!pins) return;

    const draggedPin = pins.find((p) => p.id === startInfo.handleId);
    if (!draggedPin) return;

    // Get compatible node types
    const items = getCompatibleNodeTypes(draggedPin.type, draggedPin.direction);
    if (items.length === 0) return;

    // Get mouse position
    const clientX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
    const clientY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;

    setQuickConnectMenu({
      x: clientX,
      y: clientY,
      sourceNodeId: startInfo.nodeId,
      sourceHandleId: startInfo.handleId,
      items,
      draggedFromSource: startInfo.handleType === 'source',
    });
  },
  [nodes]
);
```

**Step 4: Add menu item click handler**

```typescript
const onQuickConnectSelect = useCallback(
  (nodeType: BlueprintNodeType, pinId: string) => {
    if (!quickConnectMenu) return;

    const position = screenToFlowPosition({
      x: quickConnectMenu.x,
      y: quickConnectMenu.y,
    });

    // Create the new node
    addNode(nodeType, position);

    // Find the newly created node (last one added)
    // We need to get it from the store after addNode updates
    const newNodes = useGraphStore.getState().nodes;
    const newNode = newNodes[newNodes.length - 1];
    if (!newNode) { setQuickConnectMenu(null); return; }

    // Create the edge with correct direction
    let connection: Connection;
    if (quickConnectMenu.draggedFromSource) {
      // Dragged from output → new node is target
      connection = {
        source: quickConnectMenu.sourceNodeId,
        sourceHandle: quickConnectMenu.sourceHandleId,
        target: newNode.id,
        targetHandle: pinId,
      };
    } else {
      // Dragged from input → new node is source
      connection = {
        source: newNode.id,
        sourceHandle: pinId,
        target: quickConnectMenu.sourceNodeId,
        targetHandle: quickConnectMenu.sourceHandleId,
      };
    }

    onConnectHandler(connection);
    setQuickConnectMenu(null);
  },
  [quickConnectMenu, screenToFlowPosition, addNode, onConnectHandler]
);
```

**Step 5: Close quick-connect menu on clicks and Escape**

In the existing `useEffect` that handles click/keydown, add `setQuickConnectMenu(null)` alongside `setContextMenu(null)` and `setCanvasMenu(null)`:

In the `handleClick` function:
```typescript
const handleClick = () => { setContextMenu(null); setCanvasMenu(null); setQuickConnectMenu(null); };
```

In the Escape handler:
```typescript
if (e.key === 'Escape') {
  setContextMenu(null);
  setCanvasMenu(null);
  setQuickConnectMenu(null);
  // ... rest unchanged
}
```

**Step 6: Wire up `onConnectStart` and `onConnectEnd` on `<ReactFlow>`**

Add these props to the `<ReactFlow>` component:

```tsx
onConnectStart={onConnectStart}
onConnectEnd={onConnectEnd}
```

**Step 7: Add quick-connect menu JSX**

Add after the existing canvas context menu `</div>`, before the closing `</div>` of the component:

```tsx
{/* Quick-Connect Menu */}
{quickConnectMenu && (
  <div
    data-testid="quick-connect-menu"
    className="context-menu"
    style={{ left: quickConnectMenu.x, top: quickConnectMenu.y }}
    onClick={(e) => e.stopPropagation()}
  >
    {quickConnectMenu.items.map(({ nodeType, pinId }) => (
      <div
        key={`${nodeType}-${pinId}`}
        data-testid={`qc-add-${nodeType}`}
        className="context-menu-item"
        onClick={() => onQuickConnectSelect(nodeType, pinId)}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: NODE_COLORS[nodeType]?.header,
            marginRight: 8,
          }}
        />
        {nodeType === 'mcp' ? 'MCP Server' : nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
      </div>
    ))}
  </div>
)}
```

**Step 8: Add Connection import**

Make sure `Connection` type is imported. Add to the `@xyflow/react` import:

```typescript
import type { Connection } from '@xyflow/react';
```

(Check if it's already imported via the store — if `Connection` is used in `useGraphStore` but not in `BlueprintCanvas`, it needs to be imported here for the local `connection` variable type.)

**Step 9: Verify build**

Run: `npm run build`
Expected: No errors

**Step 10: Manual test**

1. Run `npm run dev`
2. Add a `rules` node and drag from its `context` output port
3. Release on empty canvas
4. Verify menu appears with: Skill, Subagent, Hook (all have context input)
5. Click "Skill" — verify skill node is created and connected
6. Test reverse: add a `tool` node, drag from its `used_by` input port
7. Release on empty canvas
8. Verify menu shows: Skill, Subagent, MCP Server (all have ToolAccess output)
9. Select one — verify node created and connected with correct edge direction

**Step 11: Commit**

```bash
git add src/components/Canvas/BlueprintCanvas.tsx
git commit -m "feat: add quick-connect menu on edge drop"
```
