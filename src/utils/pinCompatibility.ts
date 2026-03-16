import { PinDirection, type PinDefinition } from '../types/pins';

export function canConnect(sourcePin: PinDefinition, targetPin: PinDefinition): boolean {
  return (
    sourcePin.direction === PinDirection.Out &&
    targetPin.direction === PinDirection.In &&
    sourcePin.type === targetPin.type
  );
}
