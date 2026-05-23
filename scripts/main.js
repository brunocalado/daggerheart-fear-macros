/**
 * Daggerheart: Fear Macros
 * Author: Mestre Digital
 * Description: Triggers macros based on Daggerheart Fear and Hope resource changes.
 */

import { MODULE_ID } from './constants.js';
import { FearMacroConfig } from './fear-macro-config.js';
import { HopeMacroConfig } from './hope-macro-config.js';
import { initializeFearCache } from './fear.js';
import { initializeHopeCache } from './hope.js';
import { buildResourceMessage } from './helpers.js';

Hooks.once('init', () => {
    // --- MACRO SETTINGS (UUID storage, hidden from default settings UI) ---

    game.settings.register(MODULE_ID, 'macroIncrease', {
        scope: "world", config: false, type: String, default: ""
    });

    game.settings.register(MODULE_ID, 'macroDecrease', {
        scope: "world", config: false, type: String, default: ""
    });

    game.settings.register(MODULE_ID, 'macroMaxFear', {
        scope: "world", config: false, type: String, default: ""
    });

    game.settings.register(MODULE_ID, 'macroZeroFear', {
        scope: "world", config: false, type: String, default: ""
    });

    // --- HOPE MACRO SETTINGS (UUID storage, hidden from default settings UI) ---

    game.settings.register(MODULE_ID, 'hopeIncrease', {
        scope: "world", config: false, type: String, default: ""
    });

    game.settings.register(MODULE_ID, 'hopeDecrease', {
        scope: "world", config: false, type: String, default: ""
    });

    game.settings.register(MODULE_ID, 'hopeMax', {
        scope: "world", config: false, type: String, default: ""
    });

    game.settings.register(MODULE_ID, 'hopeZero', {
        scope: "world", config: false, type: String, default: ""
    });

    // Button in Module Settings that opens the drag-drop configuration dialog
    game.settings.registerMenu(MODULE_ID, 'macroConfigMenu', {
        name: "Configure Fear Macros",
        label: "Configure Fear Macros",
        hint: "Assign macros to each Fear trigger event.",
        icon: "fas fa-dragon",
        type: FearMacroConfig,
        restricted: true   // GM-only
    });

    game.settings.registerMenu(MODULE_ID, 'hopeConfigMenu', {
        name: "Configure Hope Macros",
        label: "Configure Hope Macros",
        hint: "Assign macros to each Hope trigger event (non-GM player actors only).",
        icon: "fas fa-sun",
        type: HopeMacroConfig,
        restricted: true
    });

    foundry.applications.handlebars.loadTemplates([
        `modules/${MODULE_ID}/templates/macro-config.hbs`,
        `modules/${MODULE_ID}/templates/hope-macro-config.hbs`
    ]);
});

Hooks.once('ready', async () => {
    initializeFearCache();
    initializeHopeCache();

    // --- Migration: string macro name → UUID ---
    // Earlier versions stored the macro's display name; now we store UUIDs.
    // A plain name has no '.' and doesn't start with 'Macro.' (UUID format).
    if (!game.user.isGM) return;
    const migrationKeys = ['macroIncrease', 'macroDecrease', 'macroMaxFear', 'macroZeroFear'];
    for (const k of migrationKeys) {
        const val = game.settings.get(MODULE_ID, k);
        if (val && !val.includes('.') && !val.startsWith('Macro.')) {
            const found = game.macros.getName(val);
            if (found) {
                await game.settings.set(MODULE_ID, k, found.uuid);
                console.log(`${MODULE_ID} | Migrated setting "${k}" from name "${val}" to UUID.`);
            }
        }
    }

    // --- Public API ---
    // Exposed on globalThis so macros can call Resource.Message() without imports.
    // Defined here (ready) to ensure game context is available at call time.
    globalThis.Resource = {
        /**
         * Send a styled Daggerheart chat card and optionally play a broadcast sound.
         * @param {object} options - See buildResourceMessage() for full parameter docs.
         * @returns {Promise<void>}
         */
        Message: (options) => buildResourceMessage(options)
    };
});
