# 1.1.0
- [Changed] Macro settings now use drag-and-drop UUID assignment via a dedicated ApplicationV2 dialog ("Configure Macros" button in Module Settings), replacing the four plain text-input fields.
- [Changed] Macro execution resolves by UUID via `fromUuid()`, supporting both world and compendium macros.
- [Added] One-time migration: existing installs with macro names stored as plain strings are automatically converted to UUIDs on first load. Compendium macros stored as names cannot be auto-migrated and must be reassigned once.

# 1.0.3
- removed canvasFX macros, but they still work

# 1.0.2
- max fear is read from game.settings.

# 1.0.1
- more macros