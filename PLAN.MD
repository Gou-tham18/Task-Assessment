# Task 2 Implementation Plan

## 1. Python Ticket Analysis
- Read the provided `tickets.csv` file.
- Count tickets grouped by category.
- Calculate average resolution duration using created and resolved timestamps.
- Handle unresolved tickets and invalid CSV rows appropriately.
- Write pytest tests for category counts, average resolution time, and edge cases.

## 2. TypeScript SLA Calculations
- Create `sla.ts`.
- Map priorities to SLA hours: urgent = 4, high = 8, normal = 24, low = 72.
- Calculate ticket deadlines from creation timestamps.
- Determine whether a ticket has breached its SLA.
- Write Vitest tests for priority mappings, deadlines, and breach conditions.

## 3. Python Debugging Exercise
- Inspect the provided `debug_warmup.py`.
- Reproduce the incorrect result.
- Replace `delta.seconds` with `delta.total_seconds()` in the duration calculation.
- Confirm the expected result matches the sample output.
- Write the required two-line explanation of the root cause and how it was found.

## 4. Verification and Delivery
- Run pytest and Vitest.
- Review the final changes.
- Use a feature branch and submit the changes through a pull request as required.
