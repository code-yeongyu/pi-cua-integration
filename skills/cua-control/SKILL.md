---
name: cua-control
description: |
  Mouse, keyboard, and scroll primitives for cua_click / cua_type / cua_key
  / cua_scroll. Reference for action shapes, modifier keys, key chord
  syntax, and screenshot-driven targeting workflows.
---

# Cua control primitives

These tools target the active Cua sandbox (or localhost when in that mode).
Always take a `cua_screenshot` first when you need coordinates; never
guess pixel positions blindly.

## Coordinates

Coordinates are in pixels from the top-left of the target display. The
default sandbox display is 1024x768 (XGA) which matches Anthropic's
recommended computer-use resolution. Cua handles Retina/HiDPI scaling
internally on macOS.

## `cua_click`

```jsonc
cua_click({ x: 320, y: 180 })                       // left click
cua_click({ x: 320, y: 180, button: "right" })      // right click
cua_click({ x: 320, y: 180, clicks: 2 })            // double click
```

Supported buttons: `left`, `right`, `middle`.

## `cua_type`

```jsonc
cua_type({ text: "hello world" })
```

Types one character at a time on the underlying surface. Newlines in the
text are typed as Return.

## `cua_key`

Press a single chord or a sequence of chords:

```jsonc
cua_key({ keys: "Return" })
cua_key({ keys: "ctrl+s" })
cua_key({ keys: ["cmd+space", "Return"] })          // Spotlight + Enter
```

Common chord names: `Return`, `Escape`, `Tab`, `BackSpace`, `Delete`,
`Up`, `Down`, `Left`, `Right`, `Page_Up`, `Page_Down`, `Home`, `End`,
`F1` .. `F12`, `ctrl+a`, `ctrl+c`, `ctrl+v`, `cmd+s` (macOS), `super+l`
(Linux).

## `cua_scroll`

```jsonc
cua_scroll({ x: 400, y: 300, dy: -5 })              // scroll down
cua_scroll({ x: 400, y: 300, dy: 5 })               // scroll up
cua_scroll({ x: 400, y: 300, dx: 3 })               // scroll right
```

Use `dx` / `dy` wheel deltas. Positive `dx` means right; negative `dy`
means down. `scrollX` / `scrollY` are still accepted aliases.

## Screenshot-driven workflow

The canonical pattern:

```
1. cua_screenshot()                  // see the current state
2. <find target visually>            // identify x, y of the element
3. cua_click({ x, y }) / cua_type
4. cua_screenshot()                  // verify the change
5. repeat
```

Take a fresh screenshot after every state-changing action. The model's
internal memory of the screen is unreliable after typing or clicking.
