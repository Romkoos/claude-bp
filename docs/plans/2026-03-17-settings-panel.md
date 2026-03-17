# Settings Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings panel in the right sidebar with a minimap toggle, accessible via toolbar button (gear icon) and Ctrl+, shortcut.

**Architecture:** New Zustand state fields (`settingsOpen`, `showMinimap`) control panel visibility and minimap rendering. A new `SettingsPanel` component replaces `PropertiesPanel` when open. Toolbar gets a Settings button, and BlueprintCanvas conditionally renders `<MiniMap>`.

**Tech Stack:** React, Zustand, Lucide React, Tailwind CSS

---

### Task 1: Add settings state to Zustand store

**Files:**
- Modify: `src/store/useGraphStore.ts`

**Step 1: Add state fields and setters to the GraphStore interface**

Add after the `setExportPreviewOpen` line in the interface (line ~72):

```typescript
  settingsOpen: boolean;
  showMinimap: boolean;
  setSettingsOpen: (open: boolean) => void;
  setShowMinimap: (show: boolean) => void;
```

**Step 2: Add default values and implementations**

Add after `exportPreviewOpen: false` (line ~93):

```typescript
  settingsOpen: false,
  showMinimap: true,
```

Add after `setExportPreviewOpen` setter (line ~332):

```typescript
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setShowMinimap: (show) => set({ showMinimap: show }),
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: add settingsOpen and showMinimap state to store
```

---

### Task 2: Create SettingsPanel component

**Files:**
- Create: `src/components/SettingsPanel/SettingsPanel.tsx`

**Step 1: Create the SettingsPanel component**

```tsx
import { Settings, X } from 'lucide-react';
import { useGraphStore } from '../../store/useGraphStore';

export function SettingsPanel() {
  const showMinimap = useGraphStore((s) => s.showMinimap);
  const setShowMinimap = useGraphStore((s) => s.setShowMinimap);
  const setSettingsOpen = useGraphStore((s) => s.setSettingsOpen);

  return (
    <div
      data-testid="settings-panel"
      className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: '#161b22',
        borderLeft: '1px solid var(--node-border)',
      }}
    >
      {/* Header */}
      <div
        className="p-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--node-border)' }}
      >
        <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
        <span
          className="flex-1 text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </span>
        <button
          onClick={() => setSettingsOpen(false)}
          data-testid="settings-close"
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Canvas section */}
        <div className="mb-4">
          <h3
            className="text-[10px] uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Canvas
          </h3>

          {/* Minimap toggle */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Show minimap
            </span>
            <button
              data-testid="toggle-minimap"
              onClick={() => setShowMinimap(!showMinimap)}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{
                background: showMinimap ? '#3b82f6' : '#2d333b',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{
                  transform: showMinimap ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat: create SettingsPanel component with minimap toggle
```

---

### Task 3: Wire SettingsPanel into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import SettingsPanel and add store selectors**

Add import:
```typescript
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
```

Add selectors inside App component:
```typescript
const settingsOpen = useGraphStore((s) => s.settingsOpen);
```

**Step 2: Update right sidebar rendering logic**

Replace line 34:
```tsx
{selectedNodeId && <PropertiesPanel />}
```
with:
```tsx
{settingsOpen ? <SettingsPanel /> : selectedNodeId ? <PropertiesPanel /> : null}
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: wire SettingsPanel into App layout
```

---

### Task 4: Add Settings button to Toolbar

**Files:**
- Modify: `src/components/Toolbar/Toolbar.tsx`

**Step 1: Add Settings icon import**

Add `Settings` to the lucide-react import:
```typescript
import {
  ShieldCheck, LayoutGrid, Save, Upload, Trash2, Undo2, Redo2,
  FolderInput, FileArchive, Search, Play, Square, HelpCircle, Settings,
} from 'lucide-react';
```

**Step 2: Add store selector**

```typescript
const settingsOpen = useGraphStore((s) => s.settingsOpen);
const setSettingsOpen = useGraphStore((s) => s.setSettingsOpen);
```

**Step 3: Add Settings button in the View group**

Add after the HelpCircle button (line ~146):
```tsx
<ToolbarButton
  icon={Settings}
  label="Settings"
  title="Settings (Ctrl+,)"
  onClick={() => setSettingsOpen(!settingsOpen)}
  testId="toolbar-settings"
/>
```

**Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
feat: add Settings button to toolbar
```

---

### Task 5: Add Ctrl+, keyboard shortcut

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx`

**Step 1: Add shortcut handler**

In the `handleKeyDown` function inside the `useEffect` (around line 132), add after the shortcuts overlay block (line ~168):

```typescript
// Settings
if (meta && key === ',') { e.preventDefault(); useGraphStore.getState().setSettingsOpen(!useGraphStore.getState().settingsOpen); }
```

**Step 2: Close settings on Escape**

In the Escape handler (line ~123), add:
```typescript
useGraphStore.getState().setSettingsOpen(false);
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: add Ctrl+, shortcut for Settings panel
```

---

### Task 6: Conditionally render MiniMap

**Files:**
- Modify: `src/components/Canvas/BlueprintCanvas.tsx`

**Step 1: Add store selector**

```typescript
const showMinimap = useGraphStore((s) => s.showMinimap);
```

**Step 2: Wrap MiniMap in conditional**

Replace the `<MiniMap ... />` block (lines 374-387) with:

```tsx
{showMinimap && (
  <MiniMap
    nodeColor={minimapNodeColor}
    style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: 8 }}
    maskColor="#0d111780"
    onNodeClick={(_event, node) => {
      const n = nodes.find((nd) => nd.id === node.id);
      if (n) {
        const x = n.position.x + (n.measured?.width ?? 300) / 2;
        const y = n.position.y + (n.measured?.height ?? 200) / 2;
        setCenter(x, y, { zoom: getZoom(), duration: 300 });
        selectNode(n.id);
      }
    }}
  />
)}
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: conditionally render MiniMap based on settings
```

---

### Task 7: Update ShortcutsOverlay

**Files:**
- Modify: `src/components/shared/ShortcutsOverlay.tsx`

**Step 1: Add Settings shortcut to the General group**

In `leftColumn`, add to the General shortcuts array:

```typescript
{ key: 'Ctrl+,', description: 'Settings' },
```

**Step 2: Commit**

```
feat: add Settings shortcut to help overlay
```

---

### Task 8: Manual smoke test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify all behaviors**

- [ ] Settings gear button visible in toolbar View group
- [ ] Clicking gear opens Settings panel on the right
- [ ] Settings panel shows "Canvas" section with "Show minimap" toggle
- [ ] Toggle defaults to ON, minimap visible on canvas
- [ ] Toggling OFF hides minimap
- [ ] Toggling ON shows minimap again
- [ ] Ctrl+, opens/closes Settings panel
- [ ] Escape closes Settings panel
- [ ] When a node is selected and Settings is open, Settings takes priority
- [ ] Closing Settings shows PropertiesPanel if a node is still selected
