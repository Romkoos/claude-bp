# Plugin Child Node Management — Design

## Overview

Four improvements to plugin-child node interaction on the canvas.

## 1. Detach node on drop outside plugin

**Trigger:** User drags a child node (has `parentId`) and releases it outside the parent plugin bounds.

**Behavior:**
- In `onNodeDragStop`, check if the dragged node has `parentId`
- Compute global center of the node: `(node.position.x + parent.position.x + width/2, node.position.y + parent.position.y + height/2)`
- Check if center is outside parent plugin bounding box
- If outside — call `removeFromPlugin(nodeId)` (converts relative → global position automatically)
- Plugin resizes via `recalcPluginSize()`

## 2. Quick-add triggers over empty plugin area

**Trigger:** User drags an edge from a pin inside a plugin and drops it over the plugin's empty surface (not on a handle, not on a child node).

**Behavior:**
- In `onConnectEnd`, expand `targetIsPane` check
- If target element is (or is within) a plugin node but NOT a handle and NOT a child node — treat as empty canvas drop
- Show quick-connect menu at mouse position with compatible node types
- Created node becomes a top-level node (not a child of the plugin)

## 3. Unlink button in PluginEditor

**Trigger:** User clicks the unlink icon next to a child node in the PluginEditor properties panel.

**Behavior:**
- Add `Unlink2` icon (lucide-react) to the right of each child node entry in the children list
- On click — call `removeFromPlugin(nodeId)`
- Node keeps its global position (appears at the same visual location on canvas)
- Plugin resizes via `recalcPluginSize()`

## 4. Plugin membership indicator on child nodes

**Trigger:** A node has `parentId` (is a child of a plugin).

**Behavior:**
- In the node header, add a link icon to the right of the node label
- Icon color matches the plugin node's color/accent
- On hover — tooltip showing the parent plugin's name
- On click — focus/fitView on the parent plugin node (select it, center viewport on it)
- Header layout: `[type icon] [Label] [link icon]`
