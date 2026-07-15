# MacTop

A macOS-inspired global menu for GNOME Shell — places a clean, unified application menu into the top panel with window actions, navigation controls, quick-access shortcuts, and a fast user switcher.

## Features

- **Apple Menu** — About This Mac, System Settings, App Store, Recent Items, Force Quit, Sleep, Restart, Shut Down, Lock Screen, Log Out
- **Global menu bar** with per-app and universal menus (File, Edit, View, Go, Window, Help)
- **Fast User Switching** — avatar-based user switcher in the right side of the panel with session switching support
- **Recent Items submenu** — displays recently used files and applications with document tooltips
- Dynamic app name and open-window list based on focused window
- Virtual keyboard shortcuts (Copy, Paste, Cut, Undo, Redo, Select All, Emoji)
- Navigation (Back, Forward, Recents, Documents, Desktop, Downloads, Home)
- Window management (Minimize, Maximize, Close, Full Screen)
- System integration (Settings, Trash, Help, App Details)
- Configurable app blacklist via preferences UI

## Performance

- **Debounced focus events** — 50ms GLib timeout prevents rebuild storms during rapid window switching (Alt+Tab animation fires the signal 5–10x per transition)
- **In-place panel updates** — existing buttons are reused and relabeled instead of destroyed and recreated (zero widget churn at steady state)
- **Cached static menus** — File/Edit/View/Go/Window/Help menus computed once at module load, never rebuilt per focus change
- **Cached blacklist** — pre-lowercased with early exit when empty (no string ops in the common case)
- **Cached virtual keyboard device** — single Clutter device reused across all shortcut actions instead of allocating one per invocation

## Requirements

- GNOME Shell 45–50
- Wayland or X11

## Installation

```bash
git clone https://github.com/anorak999/MacTop.git
cd MacTop
bash install.sh
```

Log out and back in (Wayland) or press `Alt+F2` → `r` → Enter (X11).

## Uninstallation

```bash
bash uninstall.sh
```

## Project Structure

```
MacTop/
├── extension.js              # Entry point
├── menuManager.js            # Panel menu orchestrator
├── prefs.js                  # Settings UI (Adw)
├── prefs.css                 # Preferences window styles
├── stylesheet.css            # Panel and menu styles
├── metadata.json             # GNOME Shell extension metadata
├── recentItemsSubmenu.js     # Recent files/applications submenu
├── userSwitcher.js           # Fast user switching with avatars
├── documentTooltip.js        # Delayed tooltip for document entries
├── schemas/
│   └── org.gnome.shell.extensions.mactop.gschema.xml
├── actions/
│   ├── dispatcher.js         # Action registry and dispatch
│   ├── windowActions.js      # Window actions (close, minimize, maximize)
│   ├── fileActions.js        # File/system actions (finder, folders, trash)
│   ├── keyboardActions.js    # Virtual keyboard shortcuts
│   ├── viewActions.js        # Nautilus view preferences (icon size, sort)
│   └── scancodes.js          # Named scan code constants
├── menus/
│   ├── appleMenu.js          # Apple menu (leftmost, always present)
│   ├── appMenu.js            # Dynamic app submenu
│   ├── fileMenu.js           # File menu definition
│   ├── editMenu.js           # Edit menu definition
│   ├── viewMenu.js           # View menu definition
│   ├── goMenu.js             # Go menu definition
│   ├── windowMenu.js         # Window menu definition
│   └── helpMenu.js           # Help menu definition
├── icons/                    # Linux distro and app icons (SVG)
├── install.sh
├── uninstall.sh
└── tests/
```

## License

MIT
