import { describe, it, expect } from 'vitest';
import {
  effectivePlan,
  limitsFor,
  canCreateChild,
  canCreateBoard,
  canUseFeature,
  isPaidAvailableInRegion,
  allowedSymbolSets,
  FREE_LIMITS,
  PAID_LIMITS,
  type FamilyBilling,
} from './billing';

const free: FamilyBilling = { plan: 'free' };
const paidActive: FamilyBilling = { plan: 'paid', planStatus: 'active', region: 'IL' };

describe('effectivePlan', () => {
  it('free stays free', () => {
    expect(effectivePlan(free)).toBe('free');
  });
  it('paid+active is paid', () => {
    expect(effectivePlan(paidActive)).toBe('paid');
  });
  it('paid+trialing is paid', () => {
    expect(effectivePlan({ plan: 'paid', planStatus: 'trialing' })).toBe('paid');
  });
  it('paid without status defaults to active/paid', () => {
    expect(effectivePlan({ plan: 'paid' })).toBe('paid');
  });
  it('past_due downgrades to free (fail-safe)', () => {
    expect(effectivePlan({ plan: 'paid', planStatus: 'past_due' })).toBe('free');
  });
  it('canceled downgrades to free', () => {
    expect(effectivePlan({ plan: 'paid', planStatus: 'canceled' })).toBe('free');
  });
});

describe('limitsFor', () => {
  it('free uses FREE_LIMITS', () => {
    expect(limitsFor(free)).toEqual(FREE_LIMITS);
  });
  it('paid active uses PAID_LIMITS', () => {
    expect(limitsFor(paidActive)).toEqual(PAID_LIMITS);
  });
  it('paid past_due falls back to FREE_LIMITS', () => {
    expect(limitsFor({ plan: 'paid', planStatus: 'past_due' })).toEqual(FREE_LIMITS);
  });
});

describe('canCreateChild', () => {
  it('free blocks at its cap', () => {
    expect(canCreateChild(free, FREE_LIMITS.maxChildren - 1)).toBe(true);
    expect(canCreateChild(free, FREE_LIMITS.maxChildren)).toBe(false);
  });
  it('paid allows more children', () => {
    expect(canCreateChild(paidActive, FREE_LIMITS.maxChildren)).toBe(true);
    expect(canCreateChild(paidActive, PAID_LIMITS.maxChildren)).toBe(false);
  });
});

describe('canCreateBoard', () => {
  it('free blocks at its cap', () => {
    expect(canCreateBoard(free, FREE_LIMITS.maxBoards)).toBe(false);
  });
  it('paid allows more boards', () => {
    expect(canCreateBoard(paidActive, FREE_LIMITS.maxBoards)).toBe(true);
  });
});

describe('canUseFeature', () => {
  it('free has no cloud features', () => {
    expect(canUseFeature(free, 'cloudBackup')).toBe(false);
    expect(canUseFeature(free, 'cloudTts')).toBe(false);
  });
  it('paid unlocks cloud features', () => {
    expect(canUseFeature(paidActive, 'cloudBackup')).toBe(true);
    expect(canUseFeature(paidActive, 'cloudTts')).toBe(true);
  });
  it('paid past_due loses cloud features', () => {
    expect(canUseFeature({ plan: 'paid', planStatus: 'canceled' }, 'cloudTts')).toBe(false);
  });
});

describe('isPaidAvailableInRegion', () => {
  it('IL is supported', () => {
    expect(isPaidAvailableInRegion('IL')).toBe(true);
  });
  it('other regions not yet supported', () => {
    expect(isPaidAvailableInRegion('US')).toBe(false);
    expect(isPaidAvailableInRegion(undefined)).toBe(false);
  });
});

describe('allowedSymbolSets (E-04 licensing guard)', () => {
  it('free may use ARASAAC (non-commercial, attributed)', () => {
    expect(allowedSymbolSets('free')).toContain('arasaac');
  });
  it('paid does NOT include ARASAAC by default (no license)', () => {
    const sets = allowedSymbolSets('paid');
    expect(sets).not.toContain('arasaac');
    expect(sets).toEqual(['user-upload', 'photo']);
  });
  it('paid never ships ARASAAC-only', () => {
    const sets = allowedSymbolSets('paid');
    expect(sets.length).toBeGreaterThan(0);
    expect(sets).toContain('user-upload');
    expect(sets).toContain('photo');
  });
  it('paid includes ARASAAC only once counsel licenses it', () => {
    expect(allowedSymbolSets('paid', { arasaacLicensed: true })).toContain('arasaac');
  });
});
