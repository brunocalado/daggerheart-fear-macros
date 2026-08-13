/*!
 * Daggerheart: Resource Macros
 * Copyright (c) 2025 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID } from './constants.js';
import { triggerMacro } from './helpers.js';

/**
 * Per-item Armor cache. Keyed by the equipped armor Item's uuid.
 * Unlike Hope/Stress/HP, Armor marks live on the equipped armor Item
 * (system.armor.current/max), not on the actor itself.
 * Populated on 'ready' for the currently-equipped armor of all player-owned actors.
 * @type {Map<string, number>}
 */
const previousArmorMap = new Map();

/**
 * Find the currently-equipped armor item on an actor, if any.
 * Mirrors DhCharacter#armor (module/data/actor/character.mjs) without importing
 * system code — this module only depends on the public Document API.
 * @param {Actor} actor
 * @returns {Item|null}
 */
function getEquippedArmor(actor) {
    return actor.items.find(i => i.type === 'armor' && i.system?.equipped) ?? null;
}

/**
 * Populate previousArmorMap from the equipped armor of all currently-loaded
 * player-owned actors. Called from Hooks.once('ready') after game context is available.
 * @returns {void}
 */
export function initializeArmorCache() {
    for (const actor of game.actors) {
        if (!actor.hasPlayerOwner) continue;
        const armorItem = getEquippedArmor(actor);
        const currentValue = armorItem?.system?.armor?.current;
        if (currentValue !== undefined) {
            previousArmorMap.set(armorItem.uuid, Number(currentValue));
        }
    }
}

/**
 * Determine which Armor macro to trigger based on the new value, direction of change,
 * and the item's current max armor from the live DataModel.
 * @param {Item}   armorItem - The updated armor item
 * @param {number} newArmor  - The new armor.current value (marks used)
 * @param {number} previous  - The cached previous armor.current value
 */
function handleArmorChange(armorItem, newArmor, previous) {
    const actor = armorItem.actor;
    const maxArmor = Number(armorItem.system?.armor?.max) || 0;

    // actor is passed as scope so macros can use it as a local variable
    // and pass it to Resource.Message() to derive the correct chat speaker.
    const scope = { actor, newValue: newArmor, previousValue: previous, delta: newArmor - previous, max: maxArmor };

    // Priority 1: All armor slots marked (armor score fully used)
    if (maxArmor > 0 && newArmor >= maxArmor) {
        triggerMacro('armorMax', scope);
    }
    // Priority 2: No marks (armor fully available again)
    else if (newArmor <= 0) {
        triggerMacro('armorZero', scope);
    }
    // Priority 3: More marks used
    else if (newArmor > previous) {
        triggerMacro('armorIncrease', scope);
    }
    // Priority 4: Marks cleared
    else if (newArmor < previous) {
        triggerMacro('armorDecrease', scope);
    }
}

/**
 * Watches item updates for armor.current changes on the equipped armor of player-owned actors.
 * Runs on every client but macro execution is gated to the GM client only.
 * @param {Item}   item    - The item document that was updated
 * @param {object} changes - Diff object — only changed fields are present
 * @param {object} options
 * @param {string} userId
 */
Hooks.on('updateItem', (item, changes, options, userId) => {
    // Only the GM client executes macros — prevents duplicate triggers across clients
    if (!game.user.isGM) return;

    // Only react to armor items currently equipped on player-owned actors
    if (item.type !== 'armor') return;
    if (!item.system?.equipped) return;
    if (!item.actor?.hasPlayerOwner) return;

    // Armor value is only present in changes if it actually changed in this update
    const newArmorRaw = changes.system?.armor?.current;
    if (newArmorRaw === undefined) return;

    const newArmor = Number(newArmorRaw);
    if (isNaN(newArmor)) return;

    const previous = previousArmorMap.get(item.uuid) ?? null;

    if (previous !== null && newArmor !== previous) {
        handleArmorChange(item, newArmor, previous);
    }

    // Always update cache, including first-seen armor equipped after 'ready'
    previousArmorMap.set(item.uuid, newArmor);
});
