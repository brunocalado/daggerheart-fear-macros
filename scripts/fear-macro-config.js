import { MODULE_ID } from './constants.js';

/**
 * ApplicationV2 dialog for assigning macros (by UUID) to each Fear trigger slot.
 * Opened via the Module Settings "Configure Fear Macros" button.
 */
export class FearMacroConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
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
