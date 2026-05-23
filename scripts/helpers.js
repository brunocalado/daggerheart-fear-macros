import { MODULE_ID } from './constants.js';

/**
 * Transient actor context set by triggerMacro() before executing a Hope macro.
 * buildResourceMessage() consumes this as an automatic fallback so macros do not
 * need to pass `actor` explicitly. Cleared in a finally block after execution.
 * @type {Actor|null}
 */
let _macroActorContext = null;

/**
 * Resolve the stored macro UUID and execute it.
 * fromUuid works for both world macros and compendium macros in v14.
 * @param {string} settingKey - One of the macro setting keys (e.g. macroIncrease, hopeMax)
 * @param {object} [scope={}] - Optional scope injected into the macro's execution context.
 *                              Pass { actor } for Hope macros so the script can use actor as a local variable.
 * @returns {Promise<void>}
 */
export async function triggerMacro(settingKey, scope = {}) {
    const uuid = game.settings.get(MODULE_ID, settingKey);
    if (!uuid) return;

    const macro = await fromUuid(uuid).catch(() => null);

    if (!macro || macro.documentName !== 'Macro') {
        ui.notifications.warn(`${MODULE_ID} | Macro not found for UUID: ${uuid}`);
        return;
    }

    try {
        // Expose actor context so buildResourceMessage() can derive the correct
        // speaker and author automatically, even if the macro script does not
        // pass actor to Resource.Message() explicitly.
        _macroActorContext = scope.actor || null;
        await macro.execute(scope);
    } catch (err) {
        console.error(`${MODULE_ID} | Macro execution error:`, err);
    } finally {
        _macroActorContext = null;
    }
}

/**
 * Builds and sends a styled Daggerheart chat card to all clients.
 * Optionally plays a broadcast sound.
 * Called via the public Resource.Message() API.
 *
 * @param {object}     options
 * @param {string}     options.header          - Required. Title text displayed in the card header.
 * @param {string}     [options.text]          - Optional. Body message text. If omitted, only the header is rendered.
 * @param {string}     [options.image]         - Optional. Background image path for the body. Only used when text is provided.
 * @param {string}     [options.sound]         - Optional. Path to audio file to broadcast to all clients.
 * @param {number}     [options.volume=0.8]    - Optional. Playback volume (0.0–1.0). Defaults to 0.8.
 * @param {Actor|null} [options.actor=null]    - Optional. When provided, derives the chat speaker from this actor
 *                                              via ChatMessage.getSpeaker(), showing the character name and active token.
 *                                              Hope macros receive this automatically via macro.execute(scope).
 *                                              Omit for Fear messages (speaker falls back to { alias: header }).
 * @returns {Promise<void>}
 */
export async function buildResourceMessage({ header, text, image, sound, volume = 0.8, actor = null } = {}) {
    if (!header) {
        console.warn(`${MODULE_ID} | Resource.Message() called without a required "header" parameter.`);
        return;
    }

    let content;

    if (text) {
        // Full card: header + body with optional background image
        const backgroundStyle = image
            ? `background-image: url('${image}'); background-repeat: no-repeat; background-position: center; background-size: cover;`
            : `background: #1a1a1a;`;

        content = `
<div class="chat-card" style="border: 2px solid #C9A060; border-radius: 8px; overflow: hidden;">
    <header class="card-header flexrow" style="background: #191919 !important; padding: 8px; border-bottom: 2px solid #C9A060;">
        <h3 class="noborder" style="margin: 0; font-weight: bold; color: #C9A060 !important; font-family: 'Aleo', serif; text-align: center; text-transform: uppercase; letter-spacing: 1px; width: 100%;">
            ${header}
        </h3>
    </header>
    <div class="card-content" style="${backgroundStyle} padding: 20px; min-height: 150px; display: flex; align-items: center; justify-content: center; text-align: center; position: relative;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 0;"></div>
        <span style="color: #ffffff !important; font-size: 1.3em; font-weight: bold; text-shadow: 0px 0px 8px #000000; position: relative; z-index: 1; font-family: 'Lato', sans-serif; line-height: 1.4;">
            ${text}
        </span>
    </div>
</div>`;
    } else {
        // Header-only card
        content = `
<div class="chat-card" style="border: 2px solid #C9A060; border-radius: 8px; overflow: hidden;">
    <header class="card-header flexrow" style="background: #191919 !important; padding: 12px 8px; display: flex; align-items: center;">
        <h3 class="noborder" style="margin: 0; font-weight: bold; color: #C9A060 !important; font-family: 'Aleo', serif; text-align: center; text-transform: uppercase; letter-spacing: 1.5px; width: 100%; border: none;">
            ${header}
        </h3>
    </header>
</div>`;
    }

    // Resolve actor: explicit param takes priority, then the transient context
    // injected by triggerMacro() for Hope macros. Fear macros have neither.
    const effectiveActor = actor || _macroActorContext;

    // Hope messages derive the speaker from the actor (shows character name + active token).
    // Fear messages fall back to the header alias since they have no associated actor.
    const speaker = effectiveActor
        ? ChatMessage.getSpeaker({ actor: effectiveActor })
        : { alias: header };

    const messageData = { content, speaker };

    // getSpeaker() only controls the visual display (name/avatar in the chat card).
    // The `author` field determines the actual message author shown in the chat log —
    // it defaults to game.user.id (the GM, who executes the macro on the server side).
    // We override it to the actor's player owner so Hope messages appear under their name.
    // Note: V13 uses `author` (not the deprecated `user` field).
    if (effectiveActor) {
        const owner = game.users.find(
            u => !u.isGM && effectiveActor.testUserPermission(u, "OWNER")
        );
        if (owner) messageData.author = owner.id;
    }

    await ChatMessage.create(messageData);

    // Play sound broadcast to all connected clients — independent of card rendering mode
    if (sound) {
        foundry.audio.AudioHelper.play({
            src: sound,
            volume: Number(volume) || 0.8,
            loop: false
        }, true);
    }
}
