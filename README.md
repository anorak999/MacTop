# MacTop

A macOS-inspired global menu for GNOME Shell — places a clean, unified application menu into the top panel with window actions, navigation controls, and quick-access shortcuts.

## Features

- Global menu bar with per-app and universal menus (File, Edit, View, Go, Window, Help)
- Dynamic app name and open-window list based on focused window
- Virtual keyboard shortcuts (Copy, Paste, Cut, Undo, Redo, Select All, Emoji)
- Navigation (Back, Forward, Recents, Documents, Desktop, Downloads, Home)
- Window management (Minimize, Maximize, Close, Full Screen)
- System integration (Settings, Trash, Help, App Details)
- Configurable app blacklist via preferences UI

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
├── stylesheet.css            # Panel and menu styles
├── metadata.json             # GNOME Shell extension metadata
├── schemas/
│   └── org.gnome.shell.extensions.mactop.gschema.xml
├── actions/
│   ├── dispatcher.js         # Action registry and dispatch
│   ├── windowActions.js      # Window actions (close, minimize, maximize)
│   ├── fileActions.js        # File/system actions (finder, folders, trash)
│   ├── keyboardActions.js    # Virtual keyboard shortcuts
│   └── scancodes.js          # Named scan code constants
├── menus/
│   ├── appMenu.js            # Dynamic app submenu
│   ├── fileMenu.js           # File menu definition
│   ├── editMenu.js           # Edit menu definition
│   ├── viewMenu.js           # View menu definition
│   ├── goMenu.js             # Go menu definition
│   ├── windowMenu.js         # Window menu definition
│   └── helpMenu.js           # Help menu definition
├── install.sh
├── uninstall.sh
└── tests/
```

## License

MIT
