# Quick-Connect Menu Design

## Summary

When dragging an edge from a port and releasing on empty canvas, show a context menu at the drop point with compatible nodes. Selecting a node creates it at that position and auto-connects it.

## Mechanism

### Event Handling
- `onConnectStart`: save source node ID, handle ID, handle type (source/target)
- `onConnectEnd`: if connection didn't complete (no valid target), show menu at mouse position

### Compatible Node Filtering
- From `NODE_PIN_DEFINITIONS`, find all node types with a pin matching:
  - Same `PinType` as the dragged pin
  - Opposite `direction` (if dragged from output → find inputs, vice versa)
- Exclude node types with no compatible pins

### Node Creation & Connection
- Create node at drop point using `screenToFlowPosition`
- Auto-connect to first compatible pin on the new node
- Edge direction: source is always output, target is always input

## UI
- Reuse existing canvas context menu styling
- Positioned at mouse release point
- Shows only compatible node types with icon and name
- Closes on click outside or Escape

## Edge Cases
- `comment`: no pins, never shown
- `plugin`: only Bundle output, shown only when dragging from Bundle input
- No compatible nodes → menu doesn't appear, edge disappears (current behavior)
- Bidirectional: works from both output (creates target) and input (creates source)
