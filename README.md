# GRD Screen-Switch Overlay

A floating screen-switcher overlay for [Google Remote Desktop](https://remotedesktop.google.com/), installable as a Tampermonkey or Violentmonkey userscript.

![overlay buttons: ⛶ All Display 1 Display 2 … ✕]

## Features

- Floating pill overlay showing one button per connected display
- Fullscreen toggle button
- **All displays** button (hidden until connected)
- Drag to reposition anywhere on screen
- Auto-updates from this repository

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) in your browser
2. Click: **[Install script](https://raw.githubusercontent.com/xrmb/grd_overlay/main/grd_overlay.user.js)**
3. Confirm the install prompt — done

## Usage

Open any Google Remote Desktop session. The overlay appears in the top-right corner. Click a display button to switch to it, drag the overlay to move it, or click **✕** to hide it (reappears on next page load).

If a newer version is available on GitHub, an amber **↑ vX.Y** button appears — click it to update.

## License

[MIT](LICENSE) — free to use, modify, and distribute.
