## Background

The export feature contains important formatting and business rules: calendar weeks end on Sunday, dates are arranged horizontally, annual exports use one worksheet per month, and status and completion quality are normalized separately.

## Goal

Add regression coverage so layout and data rules cannot silently change during UI work.

## Acceptance criteria

- Cover all dates from the first day of a selected month through the selected current date.
- Verify that each day receives its own task list, including date-specific temporary tasks.
- Verify completed and incomplete filtering.
- Verify status and completion-quality mappings.
- Verify Sunday-based week grouping and spacing between weeks and days.
- Verify that annual export produces one correctly named worksheet per month.
- Use generated fixtures only; do not include real child data.
