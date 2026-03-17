import { describe, it, expect } from 'vitest';
import { PIN_COLORS } from './pinTypes';
import { PinType } from '../types/pins';

describe('PIN_COLORS', () => {
  it('has a color for every pin type', () => {
    for (const pinType of Object.values(PinType)) {
      expect(PIN_COLORS[pinType]).toBeDefined();
    }
  });

  it('all colors are valid hex strings', () => {
    for (const color of Object.values(PIN_COLORS)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('has exactly 8 entries', () => {
    expect(Object.keys(PIN_COLORS)).toHaveLength(8);
  });
});
