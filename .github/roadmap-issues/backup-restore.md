## Background

SQLite keeps deployment simple, but families need a clear way to protect long-term check-in and reading history before upgrades or device changes.

## Goal

Add a guided backup and restore workflow with validation and explicit failure messages.

## Acceptance criteria

- Create a consistent backup without copying a database during an unsafe write window.
- Validate that a selected backup contains the expected schema before restore.
- Require explicit confirmation before replacing active data.
- Keep a timestamped safety copy of the current database during restore.
- Document recovery steps and expected file locations.
- Add automated tests for valid, corrupt, and incompatible backups.

Backup files must remain outside the web root and must never be committed.
