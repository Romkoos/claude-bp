export const PinType = {
  Exec: 'exec',
  Context: 'context',
  Delegation: 'delegation',
  Trigger: 'trigger',
  ToolAccess: 'tool-access',
  Result: 'result',
  Decision: 'decision',
  Bundle: 'bundle',
} as const;

export type PinType = (typeof PinType)[keyof typeof PinType];

export const PinDirection = {
  In: 'in',
  Out: 'out',
} as const;

export type PinDirection = (typeof PinDirection)[keyof typeof PinDirection];

export interface PinDefinition {
  id: string;
  type: PinType;
  direction: PinDirection;
  label: string;
  multiple?: boolean;
}
