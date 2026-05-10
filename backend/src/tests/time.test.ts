import { describe, expect, it } from 'vitest';
import { calculateTotalMinutes, isUnder18, touchesNightHours } from '../utils/time.js';
describe('tidsberegning', () => {
  it('trekker ubetalt pause', () => expect(calculateTotalMinutes(new Date('2026-01-01T08:00:00'), new Date('2026-01-01T16:00:00'), 30, false)).toBe(450));
  it('trekker ikke betalt pause', () => expect(calculateTotalMinutes(new Date('2026-01-01T08:00:00'), new Date('2026-01-01T16:00:00'), 30, true)).toBe(480));
  it('finner nattarbeid', () => expect(touchesNightHours(new Date('2026-01-01T20:30:00'), new Date('2026-01-01T22:00:00'), 21, 6)).toBe(true));
  it('finner alder under 18', () => expect(isUnder18(new Date('2010-01-01'), new Date('2026-01-01'))).toBe(true));
});
