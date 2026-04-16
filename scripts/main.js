/**
 * Daggerheart: Fear Macros
 * Version: 1.5.0
 * Author: Mestre Digital
 * Description: Triggers macros based on Daggerheart Fear resource changes.
 */

const MODULE_ID = 'daggerheart-fear-macros';
const FEAR_SETTING_KEY = 'daggerheart.ResourcesFear';

let previousFear = null;

/**
 * Helper to retrieve the dynamic Max Fear value from Daggerheart system settings.
 * Defaults to 12 if not found.
 * @returns {number}
 */
function getMaxFear() {
    try {
        // Ensure CONFIG.DH exists (Safety check)
        if (CONFIG.DH && CONFIG.DH.SETTINGS && CONFIG.DH.SETTINGS.gameSettings) {
            const homebrewSettings = game.settings.get(CONFIG.DH.id, CONFIG.DH.SETTINGS.gameSettings.Homebrew);
            return Number(homebrewSettings?.maxFear) || 12;
        }
        return 12;
    } catch (e) {
        console.warn(`${MODULE_ID} | Could not retrieve Max Fear from system settings, defaulting to 12.`, e);
        return 12;
    }
}

/**
 * ApplicationV2 dialog for assigning macros (by UUID) to each Fear trigger slot.
 * Opened via the Module Settings "Configure Macros" button.
 * Must be defined before Hooks.once('init') so registerMenu can reference it.
 */
class FearMacroConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "fear-macro-config",
        tag: "div",
        window: {
            title: "Daggerheart: Fear Macro Configuration",
            resizable: false
        },
        position: { width: 480 }
    };

    static PARTS = {
        form: { template: `modules/${MODULE_ID}/templates/macro-config.hbs` }
    };

    /**
     * Build context data for the Handlebars template.
     * Resolves each stored UUID to a macro name for display.
     * Called by the AppV2 render pipeline before the template is rendered.
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _prepareContext(options) {
        const slots = [
            { key: "macroIncrease",  label: "Increase Fear",          hint: "Triggered when Fear increases (not at Max)." },
            { key: "macroDecrease",  label: "Decrease Fear",          hint: "Triggered when Fear decreases (not 0)." },
            { key: "macroMaxFear",   label: "Fear Max (System Limit)", hint: "Triggered instead of Increase when Fear hits Max." },
            { key: "macroZeroFear",  label: "Fear Min (0)",            hint: "Triggered instead of Decrease when Fear reaches 0." }
        ];

        for (const slot of slots) {
            const uuid = game.settings.get(MODULE_ID, slot.key);
            if (uuid) {
                // fromUuid resolves both world and compendium documents
                const doc = await fromUuid(uuid).catch(() => null);
                slot.macroName = doc?.name ?? null;
                slot.macroUuid = uuid;
            } else {
                slot.macroName = null;
                slot.macroUuid = "";
            }
        }

        return { slots };
    }

    /**
     * Wire drag-drop and clear-button listeners after each render.
     * AppV2 lifecycle: replaces activateListeners from the old Application API.
     * @param {object} context - Rendered template context
     * @param {object} options - Render options
     */
    _onRender(context, options) {
        const html = this.element;

        html.querySelectorAll('.fmc-drop-zone').forEach(slot => {
            slot.addEventListener('dragover',  this._onDragOver.bind(this));
            slot.addEventListener('dragleave', this._onDragLeave.bind(this));
            slot.addEventListener('drop',      this._onDrop.bind(this));
        });

        html.querySelectorAll('.fmc-clear-btn').forEach(btn => {
            btn.addEventListener('click', this._onClear.bind(this));
        });
    }

    /**
     * Highlight slot when a valid Macro document is dragged over it.
     * @param {DragEvent} event
     */
    _onDragOver(event) {
        event.preventDefault();
        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            if (data?.type === 'Macro') {
                event.currentTarget.classList.add('drag-over');
                event.currentTarget.classList.remove('drag-invalid');
            } else {
                event.currentTarget.classList.add('drag-invalid');
                event.currentTarget.classList.remove('drag-over');
            }
        } catch {
            // Ignore parse errors during active drag — browser may withhold data until drop
        }
    }

    /**
     * Remove all drag state classes when the dragged item leaves the slot.
     * @param {DragEvent} event
     */
    _onDragLeave(event) {
        event.currentTarget.classList.remove('drag-over', 'drag-invalid');
    }

    /**
     * Persist dropped Macro UUID to settings and update the slot display inline,
     * avoiding a full re-render for a snappier UX.
     * @param {DragEvent} event
     */
    async _onDrop(event) {
        event.preventDefault();
        const slot = event.currentTarget;
        slot.classList.remove('drag-over', 'drag-invalid');

        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch {
            return;
        }

        if (data?.type !== 'Macro') {
            ui.notifications.warn("Only Macros can be dropped here.");
            return;
        }

        // fromUuid handles both world macros (Macro.<id>) and compendium UUIDs
        const doc = await fromUuid(data.uuid).catch(() => null);
        if (!doc || doc.documentName !== 'Macro') {
            ui.notifications.warn("Could not resolve the dropped document as a Macro.");
            return;
        }

        const settingKey = slot.dataset.key;
        await game.settings.set(MODULE_ID, settingKey, data.uuid);

        // Update display without a full re-render
        const nameEl = slot.querySelector('.fmc-macro-name');
        nameEl.textContent = doc.name;
        nameEl.classList.remove('is-empty');
        slot.querySelector('.fmc-clear-btn').style.display = '';
    }

    /**
     * Clear the macro assignment for a slot and reset its display.
     * @param {MouseEvent} event
     */
    async _onClear(event) {
        // Capture references before the await — event.currentTarget is nullified by the browser
        // once the handler yields, making any post-await access throw a TypeError.
        const btn = event.currentTarget;
        const slot = btn.closest('.fmc-drop-zone');
        const settingKey = slot.dataset.key;
        await game.settings.set(MODULE_ID, settingKey, "");

        const nameEl = slot.querySelector('.fmc-macro-name');
        nameEl.textContent = "Drop a Macro here";
        nameEl.classList.add('is-empty');
        btn.style.display = 'none';
    }
}

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

    // Button in Module Settings that opens the drag-drop configuration dialog
    game.settings.registerMenu(MODULE_ID, 'macroConfigMenu', {
        name: "Configure Fear Macros",
        label: "Configure Macros",
        hint: "Assign macros to each Fear trigger event.",
        icon: "fas fa-dragon",
        type: FearMacroConfig,
        restricted: true   // GM-only
    });

    foundry.applications.handlebars.loadTemplates([
        `modules/${MODULE_ID}/templates/macro-config.hbs`
    ]);
});

Hooks.once('ready', async () => {
    // Split the key to use with game.settings.get(namespace, key)
    const [namespace, key] = FEAR_SETTING_KEY.split('.');

    // Initialize the previous value silently
    try {
        const settingValue = game.settings.get(namespace, key);
        previousFear = Number(settingValue);
    } catch (e) {
        console.error(`${MODULE_ID} | Error initializing fear value.`, e);
    }

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
});

/**
 * Hook into setting updates.
 * Direct check for the specific Fear key.
 * @param {Setting} setting
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
Hooks.on('updateSetting', (setting, changes, options, userId) => {
    // Precise check: Is this the Fear setting?
    if (setting.key !== FEAR_SETTING_KEY) return;

    const rawValue = changes.value;
    if (rawValue === undefined || rawValue === null) return;

    const newFear = Number(rawValue);
    if (isNaN(newFear)) return;

    if (previousFear !== null && newFear !== previousFear) {
        handleFearChange(newFear);
    }

    previousFear = newFear;
});

/**
 * Determine which macro to trigger based on new Fear value and direction of change.
 * Only runs on the GM client to prevent duplicate executions.
 * @param {number} newFear
 */
function handleFearChange(newFear) {
    // MANDATORY: Only run on GM client to prevent duplicates
    if (!game.user.isGM) return;

    const maxFear = getMaxFear();

    // Priority 1: Max value (dynamic from system settings)
    if (newFear >= maxFear) {
        triggerMacro('macroMaxFear');
    }
    // Priority 2: Min value (0)
    else if (newFear <= 0) {
        triggerMacro('macroZeroFear');
    }
    // Priority 3: Standard increase
    else if (newFear > previousFear) {
        triggerMacro('macroIncrease');
    }
    // Priority 4: Standard decrease
    else if (newFear < previousFear) {
        triggerMacro('macroDecrease');
    }
}

/**
 * Resolve the stored macro UUID and execute it.
 * fromUuid works for both world macros and compendium macros in v13.
 * @param {string} settingKey - One of the four macroIncrease/Decrease/MaxFear/ZeroFear keys
 * @returns {Promise<void>}
 */
async function triggerMacro(settingKey) {
    const uuid = game.settings.get(MODULE_ID, settingKey);
    if (!uuid) return;

    // fromUuid resolves world documents and compendium documents alike
    const macro = await fromUuid(uuid).catch(() => null);

    if (!macro || macro.documentName !== 'Macro') {
        ui.notifications.warn(`${MODULE_ID} | Macro not found for UUID: ${uuid}`);
        return;
    }

    try {
        await macro.execute();
    } catch (err) {
        console.error(`${MODULE_ID} | Macro execution error:`, err);
    }
}
