import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModal } from './useModal';

describe('useModal', () => {
  it('throws when used outside ModalProvider', () => {
    expect(() => {
      renderHook(() => useModal());
    }).toThrow('useModal must be used within ModalProvider');
  });
});
