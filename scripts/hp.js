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
 * Per-actor HP cache. Keyed by actor.uuid.
 * Stores the last known hit points value to detect direction of change.
 * Populated on 'ready' for all player-owned actors.
 * @type {Map<string, number>}
 */
const previousHpMap = new Map();

/**
 * Populate previousHpMap from all currently-loaded player-owned actors.
 * actor.system is the live prepared value (post Active Effects) — the correct
 * source per the DataModel architecture.
 * Called from Hooks.once('ready') after game context is available.
 * @returns {void}
 */
export function initializeHpCache() {
    for (const actor of game.actors) {
        if (!actor.hasPlayerOwner) continue;
        const hpValue = actor.system?.resources?.hitPoints?.value;
        if (hpValue !== undefined) {
            previousHpMap.set(actor.uuid, Number(hpValue));
        }
    }
}

/**
 * Determine which HP macro to trigger based on the new value, direction of change,
 * and the actor's current max HP from the live DataModel.
 * Max is read from actor.system — never from the changes diff, which may omit it
 * even when Active Effects recalculate it in the same update cycle.
 * @param {Actor}  actor   - The updated actor
 * @param {number} newHp   - The new hit points value
 * @param {number} previous - The cached previous hit points value
 */
function handleHpChange(actor, newHp, previous) {
    // Must be read from the live actor.system after data preparation cycle.
    // actor.toObject() and actor.data are strictly off-limits — they bypass Active Effects.
    const maxHp = Number(actor.system?.resources?.hitPoints?.max) || 0;

    // actor is passed as scope so macros can use it as a local variable
    // and pass it to Resource.Message() to derive the correct chat speaker.
    const scope = { actor };

    // Priority 1: Reached maximum
    if (maxHp > 0 && newHp >= maxHp) {
        triggerMacro('hpMax', scope);
    }
    // Priority 2: Reached zero (Daggerheart death move trigger point)
    else if (newHp <= 0) {
        triggerMacro('hpZero', scope);
    }
    // Priority 3: Standard increase
    else if (newHp > previous) {
        triggerMacro('hpIncrease', scope);
    }
    // Priority 4: Standard decrease
    else if (newHp < previous) {
        triggerMacro('hpDecrease', scope);
    }
}

/**
 * Watches all actor updates for HP value changes on player-owned actors.
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

    // HP value is only present in changes if it actually changed in this update
    const newHpRaw = changes.system?.resources?.hitPoints?.value;
    if (newHpRaw === undefined) return;

    const newHp = Number(newHpRaw);
    if (isNaN(newHp)) return;

    const previous = previousHpMap.get(actor.uuid) ?? null;

    if (previous !== null && newHp !== previous) {
        handleHpChange(actor, newHp, previous);
    }

    // Always update cache, including first-seen actors created after 'ready'
    previousHpMap.set(actor.uuid, newHp);
});
