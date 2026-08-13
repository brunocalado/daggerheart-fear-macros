# Resource.Message() — Chat Card API

`Resource.Message()` is a public JavaScript API exposed by the **Daggerheart: Resource Macros** module. It allows any macro (world or compendium) to send a styled Daggerheart chat card to all connected clients and optionally broadcast a sound.

## Availability

The function is available after the `ready` hook fires. It is safe to call from any macro executed during a live game session.

```js
Resource.Message(options)
```

## Parameters

`Resource.Message()` accepts a single **options object**.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `header` | `string` | **Yes** | — | Title text displayed in the card header. Rendered in gold uppercase. |
| `text` | `string` | No | `undefined` | Body message text. When provided, a content area is rendered below the header. |
| `image` | `string` | No | `undefined` | Path to a background image for the body area. **Only used when `text` is also provided.** |
| `sound` | `string` | No | `undefined` | Path to an audio file to broadcast to all connected clients. |
| `volume` | `number` | No | `0.8` | Playback volume for the sound, from `0.1` to `1.0`. |

## Rendering Modes

The function has two distinct rendering modes determined by whether `text` is provided.

### Header Only

When `text` is **not** provided, the card renders a single dark header bar with the gold title. This is the minimal form — useful for brief event announcements.

```js
Resource.Message({ header: "-1 Fear" });
```

### Header + Body

When `text` **is** provided, a content area is rendered below the header. The body displays the message text in large white bold font over a dark background. If `image` is also provided, it is used as a full-cover background image behind a dark overlay that ensures text legibility.

```js
Resource.Message({
    header: "-1 Fear",
    text: "The impending dread transforms into sudden violence."
});
```

```js
Resource.Message({
    header: "-1 Fear",
    text: "The impending dread transforms into sudden violence.",
    image: "modules/daggerheart-fear-macros/assets/images/fear-rise.webp"
});
```

> **Note:** `image` is silently ignored when `text` is not provided. The parameter has no effect in header-only mode.

## Sound

The `sound` parameter is independent of the rendering mode. It works in both header-only and header + body cards.

```js
Resource.Message({
    header: "+1 Hope",
    sound: "sounds/lock.wav",
    volume: 0.6
});
```

The sound is broadcast to **all connected clients** simultaneously via Foundry's audio system.

> **Note:** Passing `volume: 0` falls back to the default `0.8`. There is no silent-broadcast mode — omit `sound` entirely to play no audio.

## Full Example

```js
Resource.Message({
    header: "Fear Max!",
    text: "The darkness closes in. All hope seems lost.",
    image: "modules/daggerheart-fear-macros/assets/images/fear-max.webp",
    sound: "modules/daggerheart-fear-macros/assets/sounds/fear-max.wav",
    volume: 0.9
});
```

## Error Handling

- If `header` is missing or empty, the function logs a warning to the browser console and **does not** send any chat message.
- If `sound` points to a file that does not exist, Foundry's audio system will fail silently on the client side.
- If `image` points to a missing file, the body renders with a plain dark background instead.

## Usage in Macros

This API is designed to be called from within the macros you assign to Fear and Hope trigger slots. Create a world macro of type **Script**, then call `Resource.Message()` at any point in the macro body.

```js
// Example: macro assigned to "Increase Fear" slot
Resource.Message({
    header: "+1 Fear",
    text: "The GM gains a Fear token. Dread fills the room.",
    sound: "modules/daggerheart-fear-macros/assets/sounds/fear-rise.wav"
});
```

## Notes

- The chat card speaker name (shown above the card in the chat log) matches the `header` value.
- The visual style uses inline CSS to remain consistent across all Foundry themes and system overrides.
- The function returns a `Promise`. You can `await` it inside an `async` macro if you need to sequence actions after the message is sent.

```js
await Resource.Message({ header: "-1 Hope" });
// code here runs after the chat message is confirmed created
```