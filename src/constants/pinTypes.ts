import { PinType } from '../types/pins';

export const PIN_COLORS: Record<PinType, string> = {
  [PinType.Exec]:       '#ffffff',
  [PinType.Context]:    '#94a3b8',
  [PinType.Delegation]: '#3b82f6',
  [PinType.Trigger]:    '#eab308',
  [PinType.ToolAccess]: '#f97316',
  [PinType.Result]:     '#22c55e',
  [PinType.Decision]:   '#ef4444',
  [PinType.Bundle]:     '#f43f5e',
};
