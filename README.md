# MacTop

A macOS-inspired global menu for GNOME Shell — places a clean, unified application menu into the top panel with window actions, navigation controls, and quick-access shortcuts.

## Features

- Global menu bar with per-app and universal menus (File, Edit, View, Go, Window, Help)
- Dynamic app name and open-window list based on focused window
- Virtual keyboard shortcuts (Copy, Paste, Cut, Undo, Redo, Select All, Emoji)
- Navigation (Back, Forward, Recents, Documents, Desktop, Downloads, Home)
- Window management (Minimize, Maximize, Close, Full Screen)
- System integration (Settings, Trash, Help, App Details)
- Blacklist for system processes (gnome-shell, mutter, nautilus)

## Requirements

- GNOME Shell 45–50
- Wayland or X11

## Installation

```bash
git clone https://github.com/anorak/MacTop.git
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
├── agents/
│   └── senior-gnome-extension-engineer.md
├── docs/
├── src/
│   ├── extension.js
│   ├── menuManager.js
│   └── schemas/
├── tests/
├── PROJECT_LOG.md
├── TEST_LOG.md
├── VERSION_CONTROL.md
├── install.sh
├── uninstall.sh
├── metadata.json
└── .gitignore
```

## License

MIT
