# 1.3.1

- [Added] Stress Macro Configuration: assign macros to Stress trigger events on player-owned actors
- [Added] HP Macro Configuration: assign macros to HP trigger events on player-owned actors
- [Added] Per-actor stress cache (previousStressMap) and HP cache (previousHpMap), both initialized on ready
- [Added] updateActor hooks to detect stress and HP value changes on non-GM player actors
- [Added] templates/stress-macro-config.hbs and templates/hp-macro-config.hbs
- [Fixed] Instructions box in the macro configuration dialogs was only styled for the Fear dialog; now applies to Fear, Hope, Stress, and HP dialogs alike

# 1.3.0

- v14 only
- [Changed] Split monolithic `scripts/main.js` into focused ESM modules: `constants.js`, `fear.js`, `hope.js`, `fear-macro-config.js`, `hope-macro-config.js`, `helpers.js`
- [Changed] `MODULE_ID` now lives in `scripts/constants.js` and is imported where needed, per project conventions

# 1.2.0

- [Added] Hope Macro Configuration: assign macros to Hope trigger events on player-owned actors
- [Added] Per-actor hope cache (previousHopeMap) initialized on ready
- [Added] updateActor hook to detect hope value changes on non-GM player actors
- [Added] templates/hope-macro-config.hbs
- [Added] `Resource.Message()` public API — sends styled Daggerheart chat cards with optional text, image background, and broadcast sound from any macro

# 1.1.0

- [Changed] Extracted template CSS into styles/macro-config.css
- [Changed] Redesigned Fear Macro Configuration dialog for clarity: drop zones now have icon, separator rows, and drag-invalid feedback
- [Changed] Macro settings now use drag-and-drop UUID assignment via a dedicated ApplicationV2 dialog ("Configure Macros" button in Module Settings), replacing the four plain text-input fields.
- [Changed] Macro execution resolves by UUID via `fromUuid()`, supporting both world and compendium macros.
- [Added] One-time migration: existing installs with macro names stored as plain strings are automatically converted to UUIDs on first load. Compendium macros stored as names cannot be auto-migrated and must be reassigned once.

# 1.0.3
- removed canvasFX macros, but they still work

# 1.0.2
- max fear is read from game.settings.

# 1.0.1
- more macros