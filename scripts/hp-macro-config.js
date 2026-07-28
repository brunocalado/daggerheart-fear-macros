/*!
 * Daggerheart: Resource Macros
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID } from './constants.js';

/**
 * ApplicationV2 dialog for assigning macros (by UUID) to each HP trigger slot.
 * Opened via the Module Settings "Configure HP Macros" button.
 */
export class HpMacroConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "hp-macro-config",
        tag: "div",
        window: {
            title: "Daggerheart: HP Macro Configuration",
            resizable: false
        },
        position: { width: 480 }
    };

    static PARTS = {
        form: { template: `modules/${MODULE_ID}/templates/hp-macro-config.hbs` }
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
            { key: "hpIncrease", label: "Increase HP", hint: "Triggered when a player actor's HP increases (not at Max)." },
            { key: "hpDecrease", label: "Decrease HP", hint: "Triggered when a player actor's HP decreases (not 0)." },
            { key: "hpMax",      label: "HP Max",      hint: "Triggered instead of Increase when HP reaches its maximum value." },
            { key: "hpZero",     label: "HP Zero (0)", hint: "Triggered instead of Decrease when HP reaches exactly 0 (death move)." }
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
