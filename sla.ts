/**
 * SLA (Service Level Agreement) Library
 *
 * Provides functions to calculate SLA deadlines, check breach status,
 * and calculate overdue hours based on ticket priority and creation date.
 */

// Supported priority levels
export type Priority = 'urgent' | 'high' | 'normal' | 'low';

// Priority to SLA duration target in hours
export const SLA_HOURS: Record<Priority, number> = {
  urgent: 4,
  high: 8,
  normal: 24,
  low: 72,
};

// Result structure returned when evaluating SLA status
export interface SlaStatus {
  createdAt: Date;
  priority: Priority;
  slaHours: number;
  deadline: Date;
  currentDate: Date;
  isBreached: boolean;
  overdueHours: number;
  message: string;
}

/**
 * Validates and converts an input into a valid Date object.
 * Accepts Date objects or date strings (e.g., ISO string).
 * Throws an Error if the date is invalid or missing.
 */
export function parseDate(dateInput: Date | string): Date {
  if (!dateInput) {
    throw new Error('Date must be provided.');
  }

  const date = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);

  // An invalid date has a getTime() of NaN
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date provided: "${dateInput}".`);
  }

  return date;
}

/**
 * Retrieves the SLA target hours for a given priority string.
 * Normalizes case and trims whitespace.
 * Throws an Error for unsupported priorities.
 */
export function getSlaHours(priority: string): number {
  if (!priority || typeof priority !== 'string') {
    throw new Error('Priority must be a non-empty string.');
  }

  const normalized = priority.trim().toLowerCase() as Priority;

  if (!(normalized in SLA_HOURS)) {
    throw new Error(
      `Unsupported priority: "${priority}". Supported priorities are: urgent, high, normal, low.`
    );
  }

  return SLA_HOURS[normalized];
}

/**
 * Calculates the SLA deadline Date by adding SLA hours to the ticket's creation date.
 *
 * @param createdAt - Ticket creation date (Date object or parseable string)
 * @param priority - Ticket priority ('urgent', 'high', 'normal', 'low')
 * @returns Date object representing the SLA deadline
 */
export function calculateSlaDeadline(createdAt: Date | string, priority: string): Date {
  const createdDate = parseDate(createdAt);
  const hours = getSlaHours(priority);

  // Add hours in milliseconds: hours * 60 mins * 60 secs * 1000 ms
  const deadlineMs = createdDate.getTime() + hours * 60 * 60 * 1000;
  return new Date(deadlineMs);
}

/**
 * Checks whether a ticket has breached its SLA deadline and calculates overdue hours.
 *
 * @param createdAt - Ticket creation date (Date object or parseable string)
 * @param priority - Ticket priority ('urgent', 'high', 'normal', 'low')
 * @param currentDate - Optional current/comparison date (defaults to current system time)
 * @returns SlaStatus object with full SLA details
 */
export function checkSla(
  createdAt: Date | string,
  priority: string,
  currentDate: Date | string = new Date()
): SlaStatus {
  const createdDate = parseDate(createdAt);
  const slaHours = getSlaHours(priority);
  const deadline = calculateSlaDeadline(createdDate, priority);
  const comparisonDate = parseDate(currentDate);

  // Difference in milliseconds: positive if comparisonDate is past deadline
  const diffMs = comparisonDate.getTime() - deadline.getTime();

  // A ticket is breached only if current time is strictly past the deadline
  const isBreached = diffMs > 0;

  let overdueHours = 0;
  let message = '';

  if (isBreached) {
    // Convert overdue milliseconds to hours, rounded to 2 decimal places
    const rawOverdueHours = diffMs / (1000 * 60 * 60);
    overdueHours = Math.round(rawOverdueHours * 100) / 100;
    message = `SLA breached: Ticket is overdue by ${overdueHours} hour(s).`;
  } else {
    overdueHours = 0;
    message = 'SLA not breached: Ticket is within SLA deadline.';
  }

  return {
    createdAt: createdDate,
    priority: priority.trim().toLowerCase() as Priority,
    slaHours,
    deadline,
    currentDate: comparisonDate,
    isBreached,
    overdueHours,
    message,
  };
}
