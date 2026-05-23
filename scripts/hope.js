import { MODULE_ID } from './constants.js';
import { triggerMacro } from './helpers.js';

/**
 * Per-actor Hope cache. Keyed by actor.uuid.
 * Stores the last known hope value to detect direction of change.
 * Populated on 'ready' for all player-owned actors.
 * @type {Map<string, number>}
 */
const previousHopeMap = new Map();

/**
 * Populate previousHopeMap from all currently-loaded player-owned actors.
 * actor.system is the live prepared value (post Active Effects) — the correct
 * source per the DataModel architecture.
 * Called from Hooks.once('ready') after game context is available.
 * @returns {void}
 */
export function initializeHopeCache() {
    for (const actor of game.actors) {
        if (!actor.hasPlayerOwner) continue;
        const hopeValue = actor.system?.resources?.hope?.value;
        if (hopeValue !== undefined) {
            previousHopeMap.set(actor.uuid, Number(hopeValue));
        }
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

    // actor is passed as scope so macros can use it as a local variable
    // and pass it to Resource.Message() to derive the correct chat speaker.
    const scope = { actor };

    // Priority 1: Reached maximum
    if (maxHope > 0 && newHope >= maxHope) {
        triggerMacro('hopeMax', scope);
    }
    // Priority 2: Reached zero
    else if (newHope <= 0) {
        triggerMacro('hopeZero', scope);
    }
    // Priority 3: Standard increase
    else if (newHope > previous) {
        triggerMacro('hopeIncrease', scope);
    }
    // Priority 4: Standard decrease
    else if (newHope < previous) {
        triggerMacro('hopeDecrease', scope);
    }
}

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
