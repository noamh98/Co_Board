import { describe, expect, it, vi } from 'vitest';
import { notifyError, onNotifyError } from './notifyService';

describe('notifyService', () => {
  it('delivers messages to subscribers', () => {
    const spy = vi.fn();
    const unsub = onNotifyError(spy);
    notifyError('שגיאה');
    expect(spy).toHaveBeenCalledWith('שגיאה');
    unsub();
  });

  it('stops delivering after unsubscribe', () => {
    const spy = vi.fn();
    const unsub = onNotifyError(spy);
    unsub();
    notifyError('שגיאה');
    expect(spy).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers independently', () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = onNotifyError(a);
    const unsubB = onNotifyError(b);
    notifyError('x');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    unsubA();
    unsubB();
  });
});
