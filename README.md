# Shuffle Component

Native Web Component for shuffled text reveal effects.

`shuffle-component` registers a framework-agnostic custom element named `<shuffle-text>`. Use it in plain HTML, ESM projects, or frontend frameworks that support custom elements.

```html
<script src="shuffle-text.js"></script>

<shuffle-text autoplay replay-on-hover duration="760">
  Interface ready
</shuffle-text>
```

## Features

- Native Web Component / Custom Element.
- No runtime dependencies.
- Works with plain HTML, ESM, React, Vue, Svelte, Astro, and similar tools.
- Attribute-based configuration.
- JavaScript API for replaying and updating text.
- Viewport-aware autoplay by default.
- Optional replay on every viewport re-entry.
- Respects `prefers-reduced-motion` by default.
- Optional accessibility helper text during animation.

## Install

```bash
npm install shuffle-component
```

## Usage

### ESM

Importing the package registers the default `<shuffle-text>` tag.

```js
import "shuffle-component";
```

Then use the element in your markup:

```html
<shuffle-text autoplay replay-on-hover duration="600">
  Text to reveal
</shuffle-text>
```

With `autoplay`, the animation starts once when the element enters the viewport. Use `replay-on-visible` to replay every time the element re-enters the viewport. Use `autoplay-mode="eager"` to start as soon as the element connects to the DOM.

### Browser Script

Use the browser bundle when serving the built file directly.

```html
<script src="shuffle-text.js"></script>

<shuffle-text
  autoplay
  replay-on-hover
  replay-on-visible
  autoplay-mode="visible"
  duration="600"
  random-characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
  empty-character="-"
>
  Text to reveal
</shuffle-text>
```

### Explicit Text Attribute

Use the `text` attribute when the script is loaded before the element content is available, or when you want the source text to live in an attribute.

```html
<shuffle-text text="Interface ready" autoplay></shuffle-text>
```

### Custom Tag Name

The default tag is `<shuffle-text>`. You can also register another custom element name:

```js
import { defineShuffleTextElement } from "shuffle-component";

defineShuffleTextElement("my-shuffle-text");
```

```html
<my-shuffle-text autoplay>Custom tag ready</my-shuffle-text>
```

## Attributes

| Attribute | Default | Description |
| --- | --- | --- |
| `text` | element text content | Explicit text to reveal. |
| `autoplay` | off | Starts the animation automatically. By default, it waits until the element enters the viewport. |
| `autoplay-mode` | `visible` | `visible` starts on viewport entry. `eager` starts as soon as the element connects. |
| `replay-on-hover` | off | Replays the animation on pointer hover. |
| `replay-on-visible` | off | Replays the animation each time the element re-enters the viewport. |
| `duration` | `600` | Animation duration in milliseconds. |
| `random-characters` | `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890` | Characters used while shuffling. |
| `empty-character` | `-` | Placeholder before a character starts shuffling. |
| `respect-reduced-motion` | `true` | Set to `false` to force animation even when reduced motion is preferred. |
| `accessibility` | `true` | Hides changing text from assistive tech during animation and exposes stable helper text nearby. |

Boolean-like attributes `respect-reduced-motion` and `accessibility` treat the string value `"false"` as disabled.

### Autoplay Modes

Viewport-aware autoplay is the default:

```html
<shuffle-text autoplay>
  Reveals when visible
</shuffle-text>
```

Load-time autoplay is still available:

```html
<shuffle-text autoplay autoplay-mode="eager">
  Reveals immediately
</shuffle-text>
```

Replay on every viewport re-entry:

```html
<shuffle-text replay-on-visible>
  Reveals whenever visible again
</shuffle-text>
```

Initial viewport autoplay and repeated viewport replay can be combined:

```html
<shuffle-text autoplay replay-on-visible>
  Reveals on first view and every later re-entry
</shuffle-text>
```

## JavaScript API

```js
const element = document.querySelector("shuffle-text");

element.easing = (progress) => progress * progress;

element.onComplete = (event) => {
  console.log(event.detail.text);
};

await element.start();

element.setText("New text");
await element.start();

element.stop();
element.dispose();
```

### Methods

| Method | Description |
| --- | --- |
| `start()` | Starts or restarts the animation. Returns a `Promise<void>` that resolves when the animation completes or is stopped. |
| `stop()` | Stops the current animation and resolves any pending `start()` promise. |
| `setText(text)` | Updates the element text and the `text` attribute. |
| `dispose()` | Cancels timers, removes listeners, clears accessibility helper text, and stops animation state. |

### Properties

| Property | Description |
| --- | --- |
| `text` | Gets or sets the source text through the `text` attribute. |
| `duration` | Gets or sets animation duration in milliseconds. |
| `sourceRandomCharacter` | Gets or sets the `random-characters` attribute. |
| `emptyCharacter` | Gets or sets the `empty-character` attribute. |
| `autoplay` | Gets or sets the `autoplay` attribute. |
| `autoplayMode` | Gets or sets the `autoplay-mode` attribute. |
| `replayOnHover` | Gets or sets the `replay-on-hover` attribute. |
| `replayOnVisible` | Gets or sets the `replay-on-visible` attribute. |
| `respectReducedMotion` | Gets or sets the `respect-reduced-motion` attribute. |
| `accessibility` | Gets or sets the `accessibility` attribute. |
| `isRunning` | Read-only animation state. |
| `easing` | Function that receives progress from `0` to `1` and returns eased progress. |
| `onComplete` | Optional callback called with the completion event. |

## Events

The element dispatches `shuffle-text-complete` when an animation finishes.

```js
const element = document.querySelector("shuffle-text");

element.addEventListener("shuffle-text-complete", (event) => {
  console.log(event.detail.text);
});
```

Event detail:

```ts
{
  text: string;
}
```

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build bundles and TypeScript declarations:

```bash
npm run build
```

## Demo

The demo is available in the source repository, but it is not included in the npm package.

Open:

```text
examples/index.html
```

Or run:

```bash
npm run demo
```
