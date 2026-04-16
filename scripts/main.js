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
 * Per-actor Hope cache. Keyed by actor.uuid.
 * Stores the last known hope value to detect direction of change.
 * Populated on 'ready' for all player-owned actors.
 * @type {Map<string, number>}
 */
const previousHopeMap = new Map();

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

/**
 * ApplicationV2 dialog for assigning macros (by UUID) to each Hope trigger slot.
 * Opened via the Module Settings "Configure Hope Macros" button.
 * Must be defined before Hooks.once('init') so registerMenu can reference it.
 */
class HopeMacroConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "hope-macro-config",
        tag: "div",
        window: {
            title: "Daggerheart: Hope Macro Configuration",
            resizable: false
        },
        position: { width: 480 }
    };

    static PARTS = {
        form: { template: `modules/${MODULE_ID}/templates/hope-macro-config.hbs` }
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
            { key: "hopeIncrease", label: "Increase Hope", hint: "Triggered when a player actor's Hope increases (not at Max)." },
            { key: "hopeDecrease", label: "Decrease Hope", hint: "Triggered when a player actor's Hope decreases (not 0)." },
            { key: "hopeMax",      label: "Hope Max",      hint: "Triggered instead of Increase when Hope reaches its maximum value." },
            { key: "hopeZero",     label: "Hope Zero (0)", hint: "Triggered instead of Decrease when Hope reaches exactly 0." }
        ];

        for (const slot of slots) {
            const uuid = game.settings.get(MODULE_ID, slot.key);
            if (uuid) {
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
     * @param {object} context
     * @param {object} options
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
     * Persist dropped Macro UUID to settings and update the slot display inline.
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

        const doc = await fromUuid(data.uuid).catch(() => null);
        if (!doc || doc.documentName !== 'Macro') {
            ui.notifications.warn("Could not resolve the dropped document as a Macro.");
            return;
        }

        const settingKey = slot.dataset.key;
        await game.settings.set(MODULE_ID, settingKey, data.uuid);

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
        label: "Configure Macros",
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
    // Split the key to use with game.settings.get(namespace, key)
    const [namespace, key] = FEAR_SETTING_KEY.split('.');

    // Initialize the previous value silently
    try {
        const settingValue = game.settings.get(namespace, key);
        previousFear = Number(settingValue);
    } catch (e) {
        console.error(`${MODULE_ID} | Error initializing fear value.`, e);
    }

    // --- Populate per-actor Hope cache ---
    // Only player-owned actors are relevant. actor.system is the live prepared value
    // (post Active Effects) — the correct source per the DataModel architecture.
    for (const actor of game.actors) {
        if (!actor.hasPlayerOwner) continue;
        const hopeValue = actor.system?.resources?.hope?.value;
        if (hopeValue !== undefined) {
            previousHopeMap.set(actor.uuid, Number(hopeValue));
        }
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
 * Watches all actor updates for hope value changes on player-owned actors.
 * Runs on every client but macro execution is gated to the GM client only.
 * @param {Actor}  actor   - The actor document that was updated
 * @param {object} changes - Diff object — only changed fields are present
 * @param {object} options
 * @param {string} userId
 */
Hooks.on('updateActor', (actor, changes, options, userId) => {
    // Only the GM client executes macros — prevents duplicate triggers across clients
    if (!game.user.isGM) return;

    // Only react to player-owned actors (non-GM characters with linked tokens)
    if (!actor.hasPlayerOwner) return;

    // Hope value is only present in changes if it actually changed in this update
    const newHopeRaw = changes.system?.resources?.hope?.value;
    if (newHopeRaw === undefined) return;

    const newHope = Number(newHopeRaw);
    if (isNaN(newHope)) return;

    const previous = previousHopeMap.get(actor.uuid) ?? null;

    if (previous !== null && newHope !== previous) {
        handleHopeChange(actor, newHope, previous);
    }

    // Always update cache, including first-seen actors created after 'ready'
    previousHopeMap.set(actor.uuid, newHope);
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
 * Determine which Hope macro to trigger based on the new value, direction of change,
 * and the actor's current max hope from the live DataModel.
 * Max is read from actor.system — never from the changes diff, which may omit it
 * even when Active Effects recalculate it in the same update cycle.
 * @param {Actor}  actor    - The updated actor
 * @param {number} newHope  - The new hope value
 * @param {number} previous - The cached previous hope value
 */
function handleHopeChange(actor, newHope, previous) {
    // Must be read from the live actor.system after data preparation cycle.
    // actor.toObject() and actor.data are strictly off-limits — they bypass Active Effects.
    const maxHope = Number(actor.system?.resources?.hope?.max) || 0;

    // Priority 1: Reached maximum
    if (maxHope > 0 && newHope >= maxHope) {
        triggerMacro('hopeMax');
    }
    // Priority 2: Reached zero
    else if (newHope <= 0) {
        triggerMacro('hopeZero');
    }
    // Priority 3: Standard increase
    else if (newHope > previous) {
        triggerMacro('hopeIncrease');
    }
    // Priority 4: Standard decrease
    else if (newHope < previous) {
        triggerMacro('hopeDecrease');
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
