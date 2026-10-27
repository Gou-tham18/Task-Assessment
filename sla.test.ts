import { describe, it, expect } from 'vitest';
import {
  SLA_HOURS,
  getSlaHours,
  parseDate,
  calculateSlaDeadline,
  checkSla,
} from './sla';

describe('TypeScript SLA Library', () => {
  // Fixed baseline dates for predictable tests
  const baseCreatedAt = '2026-03-01T10:00:00.000Z';

  // 1. Urgent priority uses a 4-hour SLA
  it('1. urgent priority uses a 4-hour SLA', () => {
    expect(getSlaHours('urgent')).toBe(4);
    expect(SLA_HOURS.urgent).toBe(4);

    const deadline = calculateSlaDeadline(baseCreatedAt, 'urgent');
    // 10:00 + 4 hours = 14:00
    expect(deadline.toISOString()).toBe('2026-03-01T14:00:00.000Z');
  });

  // 2. High priority uses an 8-hour SLA
  it('2. high priority uses an 8-hour SLA', () => {
    expect(getSlaHours('high')).toBe(8);
    expect(SLA_HOURS.high).toBe(8);

    const deadline = calculateSlaDeadline(baseCreatedAt, 'high');
    // 10:00 + 8 hours = 18:00
    expect(deadline.toISOString()).toBe('2026-03-01T18:00:00.000Z');
  });

  // 3. Normal priority uses a 24-hour SLA
  it('3. normal priority uses a 24-hour SLA', () => {
    expect(getSlaHours('normal')).toBe(24);
    expect(SLA_HOURS.normal).toBe(24);

    const deadline = calculateSlaDeadline(baseCreatedAt, 'normal');
    // 2026-03-01 10:00 + 24 hours = 2026-03-02 10:00
    expect(deadline.toISOString()).toBe('2026-03-02T10:00:00.000Z');
  });

  // 4. Low priority uses a 72-hour SLA
  it('4. low priority uses a 72-hour SLA', () => {
    expect(getSlaHours('low')).toBe(72);
    expect(SLA_HOURS.low).toBe(72);

    const deadline = calculateSlaDeadline(baseCreatedAt, 'low');
    // 2026-03-01 10:00 + 72 hours (3 days) = 2026-03-04 10:00
    expect(deadline.toISOString()).toBe('2026-03-04T10:00:00.000Z');
  });

  // 5. A ticket that is within its SLA is not reported as breached
  it('5. a ticket that is within its SLA is not reported as breached', () => {
    // Normal priority has a 24-hour SLA. Deadline is 2026-03-02 10:00:00.
    // Current time is 5 hours after creation: 2026-03-01 15:00:00.
    const currentTime = '2026-03-01T15:00:00.000Z';
    const result = checkSla(baseCreatedAt, 'normal', currentTime);

    expect(result.isBreached).toBe(false);
    expect(result.overdueHours).toBe(0);
    expect(result.message).toContain('SLA not breached');
  });

  // 6. A ticket exactly at its deadline is handled correctly
  it('6. a ticket exactly at its deadline is handled correctly', () => {
    // Urgent priority has a 4-hour SLA. Deadline is 2026-03-01 14:00:00.
    // Current time is exactly 2026-03-01 14:00:00.
    const exactDeadlineTime = '2026-03-01T14:00:00.000Z';
    const result = checkSla(baseCreatedAt, 'urgent', exactDeadlineTime);

    // Exactly at deadline means it has not exceeded the deadline yet
    expect(result.isBreached).toBe(false);
    expect(result.overdueHours).toBe(0);
    expect(result.message).toContain('SLA not breached');
  });

  // 7. A breached ticket reports the correct overdue duration
  it('7. a breached ticket reports the correct overdue duration', () => {
    // High priority has an 8-hour SLA. Deadline is 2026-03-01 18:00:00.
    // Current time is 2026-03-01 23:00:00 (exactly 5 hours overdue).
    const overdueTime = '2026-03-01T23:00:00.000Z';
    const result = checkSla(baseCreatedAt, 'high', overdueTime);

    expect(result.isBreached).toBe(true);
    expect(result.overdueHours).toBe(5);
    expect(result.message).toBe('SLA breached: Ticket is overdue by 5 hour(s).');

    // Also test partial/fractional hours overdue (e.g., 2.5 hours overdue)
    const partialOverdueTime = '2026-03-01T20:30:00.000Z';
    const partialResult = checkSla(baseCreatedAt, 'high', partialOverdueTime);
    expect(partialResult.isBreached).toBe(true);
    expect(partialResult.overdueHours).toBe(2.5);
    expect(partialResult.message).toBe('SLA breached: Ticket is overdue by 2.5 hour(s).');
  });

  // 8. Invalid dates are handled appropriately
  it('8. invalid dates are handled appropriately', () => {
    // Invalid creation date string
    expect(() => calculateSlaDeadline('not-a-valid-date', 'urgent')).toThrowError(
      /Invalid date/
    );

    // Empty date
    expect(() => calculateSlaDeadline('', 'urgent')).toThrowError(
      /Date must be provided/
    );

    // Invalid Date object
    const invalidDateObj = new Date('invalid');
    expect(() => calculateSlaDeadline(invalidDateObj, 'urgent')).toThrowError(
      /Invalid date/
    );

    // Invalid current date in checkSla
    expect(() => checkSla(baseCreatedAt, 'urgent', 'invalid-now')).toThrowError(
      /Invalid date/
    );
  });

  // 9. Unsupported priorities are handled appropriately
  it('9. unsupported priorities are handled appropriately', () => {
    // Non-existent priority
    expect(() => getSlaHours('critical')).toThrowError(
      /Unsupported priority: "critical"/
    );

    expect(() => calculateSlaDeadline(baseCreatedAt, 'extreme')).toThrowError(
      /Unsupported priority: "extreme"/
    );

    expect(() => checkSla(baseCreatedAt, 'p1', baseCreatedAt)).toThrowError(
      /Unsupported priority: "p1"/
    );

    // Empty priority
    expect(() => getSlaHours('')).toThrowError(/Priority must be a non-empty string/);
  });

  // Additional sanity tests for edge cases
  it('handles case-insensitive and trimmed priority values correctly', () => {
    expect(getSlaHours('  URGENT  ')).toBe(4);
    expect(getSlaHours('High')).toBe(8);
    expect(getSlaHours('Normal')).toBe(24);
    expect(getSlaHours('LOW')).toBe(72);
  });

  it('accepts Date objects as inputs', () => {
    const createdDate = new Date('2026-03-01T10:00:00.000Z');
    const checkDate = new Date('2026-03-01T15:00:00.000Z');
    const result = checkSla(createdDate, 'urgent', checkDate);

    // 10:00 + 4 hours = 14:00 deadline. At 15:00, it is 1 hour overdue.
    expect(result.isBreached).toBe(true);
    expect(result.overdueHours).toBe(1);
  });
});
