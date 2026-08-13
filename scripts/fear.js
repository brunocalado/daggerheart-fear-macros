import { MODULE_ID, FEAR_SETTING_KEY } from './constants.js';
import { triggerMacro } from './helpers.js';

let previousFear = null;

/**
 * Retrieve the dynamic Max Fear value from Daggerheart system settings.
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
 * Populate previousFear from the current system setting.
 * Called from Hooks.once('ready') after game context is available.
 * @returns {void}
 */
export function initializeFearCache() {
    const [namespace, key] = FEAR_SETTING_KEY.split('.');
    try {
        previousFear = Number(game.settings.get(namespace, key));
    } catch (e) {
        console.error(`${MODULE_ID} | Error initializing fear value.`, e);
    }
}

/**
 * Determine which macro to trigger based on new Fear value and direction of change.
 * Only runs on the GM client to prevent duplicate executions.
 * @param {number} newFear
 */
function handleFearChange(newFear) {
    // MANDATORY: Only run on GM client to prevent duplicates
    if (!game.user.isGM) return;

    const maxFear = getMaxFear();

    // newValue/previousValue/delta let the macro report the real amount changed,
    // instead of a static "+1"/"-1" that's wrong for multi-point edits.
    // previousFear is still the pre-change value here — the hook reassigns it only after this returns.
    const scope = { newValue: newFear, previousValue: previousFear, delta: newFear - previousFear, max: maxFear };

    // Priority 1: Max value (dynamic from system settings)
    if (newFear >= maxFear) {
        triggerMacro('macroMaxFear', scope);
    }
    // Priority 2: Min value (0)
    else if (newFear <= 0) {
        triggerMacro('macroZeroFear', scope);
    }
    // Priority 3: Standard increase
    else if (newFear > previousFear) {
        triggerMacro('macroIncrease', scope);
    }
    // Priority 4: Standard decrease
    else if (newFear < previousFear) {
        triggerMacro('macroDecrease', scope);
    }
}

/**
 * Hook into setting updates. Direct check for the specific Fear key.
 * @param {Setting} setting
 * @param {object}  changes
 * @param {object}  options
 * @param {string}  userId
 */
Hooks.on('updateSetting', (setting, changes, options, userId) => {
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
