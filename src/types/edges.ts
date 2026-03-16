import { PinType } from './pins';

export interface BlueprintEdgeData {
  pinType: PinType;
  label?: string;
  params?: Record<string, unknown>;
}
