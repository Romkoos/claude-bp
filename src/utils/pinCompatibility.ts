import { PinDirection, type PinDefinition, type PinType } from '../types/pins';
import type { BlueprintNodeType } from '../types/nodes';
import { NODE_PIN_DEFINITIONS } from '../constants/nodeDefaults';

export function canConnect(sourcePin: PinDefinition, targetPin: PinDefinition): boolean {
  return (
    sourcePin.direction === PinDirection.Out &&
    targetPin.direction === PinDirection.In &&
    sourcePin.type === targetPin.type
  );
}

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
