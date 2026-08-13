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
 * Per-actor Stress cache. Keyed by actor.uuid.
 * Stores the last known stress value to detect direction of change.
 * Populated on 'ready' for all player-owned actors.
 * @type {Map<string, number>}
 */
const previousStressMap = new Map();

/**
 * Populate previousStressMap from all currently-loaded player-owned actors.
 * actor.system is the live prepared value (post Active Effects) — the correct
 * source per the DataModel architecture.
 * Called from Hooks.once('ready') after game context is available.
 * @returns {void}
 */
export function initializeStressCache() {
    for (const actor of game.actors) {
        if (!actor.hasPlayerOwner) continue;
        const stressValue = actor.system?.resources?.stress?.value;
        if (stressValue !== undefined) {
            previousStressMap.set(actor.uuid, Number(stressValue));
        }
    }
}

/**
 * Determine which Stress macro to trigger based on the new value, direction of change,
 * and the actor's current max stress from the live DataModel.
 * Max is read from actor.system — never from the changes diff, which may omit it
 * even when Active Effects recalculate it in the same update cycle.
 * @param {Actor}  actor     - The updated actor
 * @param {number} newStress - The new stress value
 * @param {number} previous  - The cached previous stress value
 */
function handleStressChange(actor, newStress, previous) {
    // Must be read from the live actor.system after data preparation cycle.
    // actor.toObject() and actor.data are strictly off-limits — they bypass Active Effects.
    const maxStress = Number(actor.system?.resources?.stress?.max) || 0;

    // actor is passed as scope so macros can use it as a local variable
    // and pass it to Resource.Message() to derive the correct chat speaker.
    // newValue/previousValue/delta let the macro report the real amount changed,
    // instead of a static "+1"/"-1" that's wrong for multi-point edits.
    const scope = { actor, newValue: newStress, previousValue: previous, delta: newStress - previous, max: maxStress };

    // Priority 1: Reached maximum
    if (maxStress > 0 && newStress >= maxStress) {
        triggerMacro('stressMax', scope);
    }
    // Priority 2: Reached zero
    else if (newStress <= 0) {
        triggerMacro('stressZero', scope);
    }
    // Priority 3: Standard increase
    else if (newStress > previous) {
        triggerMacro('stressIncrease', scope);
    }
    // Priority 4: Standard decrease
    else if (newStress < previous) {
        triggerMacro('stressDecrease', scope);
    }
}

/**
 * Watches all actor updates for stress value changes on player-owned actors.
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

    // Stress value is only present in changes if it actually changed in this update
    const newStressRaw = changes.system?.resources?.stress?.value;
    if (newStressRaw === undefined) return;

    const newStress = Number(newStressRaw);
    if (isNaN(newStress)) return;

    const previous = previousStressMap.get(actor.uuid) ?? null;

    if (previous !== null && newStress !== previous) {
        handleStressChange(actor, newStress, previous);
    }

    // Always update cache, including first-seen actors created after 'ready'
    previousStressMap.set(actor.uuid, newStress);
});
