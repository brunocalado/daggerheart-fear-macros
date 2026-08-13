# 1.3.3

- [Fixed] Marking/clearing more than 1 point of Hope, Stress, HP, Fear, or Armor in a single update showed a hardcoded "+1"/"-1" in the chat message instead of the real amount, since triggered macros had no access to the actual change
- [Changed] `triggerMacro()` now passes `newValue`, `previousValue`, `delta`, and `max` in scope for every trigger (Fear/Hope/Stress/HP/Armor), so macros can report the real amount changed — see [docs/WIKI.md](docs/WIKI.md#macro-scope-variables)
- [Changed] Bundled example macros (Increase/Decrease, all resources) now build their chat header from the real `delta` instead of a hardcoded ±1
- [Added] Armor Macro Configuration: assign macros to Armor trigger events (Increase/Decrease/Max/Zero). Armor marks live on the player-owned actor's **equipped Armor item**, not the actor itself, so this watches `updateItem` rather than `updateActor`
- [Added] `scripts/armor.js`, `scripts/armor-macro-config.js`, `templates/armor-macro-config.hbs`
- [Added] Four example Armor macros and an "Armor Chat Message - Simple" folder in the `Resource Macros` compendium
- [Added] **Get Default Macros** button on every macro configuration dialog (Fear/Hope/Stress/HP/Armor) — assigns the bundled compendium example macros to all four slots in one click instead of manual drag-and-drop
- [Added] `findDefaultMacroUuid()` helper in `scripts/helpers.js` — resolves a bundled compendium macro by name (and folder, to disambiguate Fear's plain vs. flavor-text macro sets)
- [Changed] Redesigned all 5 macro configuration dialogs (`styles/macro-config.css`): each trigger slot is now a bordered card instead of a flat list separated by thin rules; "Get Default Macros" sits in its own toolbar row instead of floating loose below the instructions banner; drop zones now have a distinct `:hover` state (in addition to the existing active drag-over highlight) so it's clear they accept a dropped Macro before you start dragging

# 1.3.2

- [Removed] AI-generated assets: `assets/images/skull.webp` and the `assets/audio/evil-laugh/` sound set. Neither was referenced by any script, template, or compendium macro.
- [Changed] `docs/WIKI.md` example snippets updated to reference placeholder asset paths instead of the removed `skull.webp`

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