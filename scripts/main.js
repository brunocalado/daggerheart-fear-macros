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

Hooks.once('init', () => {
    // --- MACRO SETTINGS ---

    game.settings.register(MODULE_ID, 'macroIncrease', {
        name: "Macro: Increase Fear",
        hint: "Exact name of the macro to execute when Fear increases (and has not reached Max).",
        scope: "world",
        config: true,
        type: String,
        default: "Increase Fear"
    });

    game.settings.register(MODULE_ID, 'macroDecrease', {
        name: "Macro: Decrease Fear",
        hint: "Exact name of the macro to execute when Fear decreases (and is not 0).",
        scope: "world",
        config: true,
        type: String,
        default: "Decrease Fear"
    });

    game.settings.register(MODULE_ID, 'macroMaxFear', {
        name: "Macro: Fear Max (System Limit)",
        hint: "Exact name of the macro to execute when Fear reaches the maximum value defined in System Settings (Homebrew). Triggers instead of the Increase macro.",
        scope: "world",
        config: true,
        type: String,
        default: "Fear Max"
    });

    game.settings.register(MODULE_ID, 'macroZeroFear', {
        name: "Macro: Fear Min (0)",
        hint: "Exact name of the macro to execute when Fear reaches exactly 0. Triggers instead of the Decrease macro.",
        scope: "world",
        config: true,
        type: String,
        default: "Fear Min"
    });
});

Hooks.once('ready', () => {
    // Split the key to use with game.settings.get(namespace, key)
    const [namespace, key] = FEAR_SETTING_KEY.split('.');
    
    // Initialize the previous value silently
    try {
        // Ensure we treat it as a number right from the start
        const settingValue = game.settings.get(namespace, key);
        previousFear = Number(settingValue);
    } catch (e) {
        console.error(`${MODULE_ID} | Error initializing fear value.`, e);
    }
});

/**
 * Hook into setting updates.
 * Direct check for the specific Fear key.
 */
Hooks.on('updateSetting', (setting, changes, options, userId) => {
    // 1. Precise check: Is this the Fear setting?
    if (setting.key !== FEAR_SETTING_KEY) return;

    // 2. Get value and FORCE convert to Number
    const rawValue = changes.value;
    
    // Safety check
    if (rawValue === undefined || rawValue === null) return;

    const newFear = Number(rawValue);

    if (isNaN(newFear)) return;

    // 3. Compare
    if (previousFear !== null && newFear !== previousFear) {
        handleFearChange(newFear);
    }

    // 4. Update Cache
    previousFear = newFear;
});

/**
 * Logic to decide which macro to trigger
 */
function handleFearChange(newFear) {
    // MANDATORY: Only run on GM Client to prevent duplicates
    if (!game.user.isGM) return;

    const maxFear = getMaxFear();

    // Priority 1: Max Value (Dynamic from System Settings)
    if (newFear >= maxFear) {
        triggerMacro('macroMaxFear');
    } 
    // Priority 2: Min Value (0)
    else if (newFear <= 0) {
        triggerMacro('macroZeroFear');
    }
    // Priority 3: Standard Increase
    else if (newFear > previousFear) {
        triggerMacro('macroIncrease');
    } 
    // Priority 4: Standard Decrease
    else if (newFear < previousFear) {
        triggerMacro('macroDecrease');
    }
}

/**
 * Execute the macro
 */
async function triggerMacro(settingKey) {
    const macroName = game.settings.get(MODULE_ID, settingKey);
    
    if (!macroName) return;

    const macro = game.macros.getName(macroName);

    if (!macro) {
        ui.notifications.warn(`${MODULE_ID} | Macro "${macroName}" not found.`);
        return;
    }

    try {
        await macro.execute();
    } catch (err) {
        console.error(`${MODULE_ID} | Macro execution error:`, err);
    }
}