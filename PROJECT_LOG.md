# PROJECT_LOG.md — MacTop

| Field | Value |
|---|---|
| Project Name | MacTop |
| Start Date | 2025-07-14 |
| Current Version | 0.2.0 |
| Architecture | One-Man Show |
| Primary Agent | Senior GNOME Extension Engineer (`GNOME-Eng`) |

---

## Entries

### ENTRY-001 — Infra

| Field | Value |
|---|---|
| Date | 2025-07-14 |
| Change | Project scaffold initialized |

### ENTRY-002 — Feature

| Field | Value |
|---|---|
| Date | 2025-07-14 |
| Change | Core extension replicated from `global-menu-for-gnome` with MacTop branding |

### ENTRY-003 — Bugfix

| Field | Value |
|---|---|
| Date | 2025-07-14 |
| Change | Added `prefs.js` to fix ImportError in GNOME Extensions app |

### ENTRY-004 — Refactor

| Field | Value |
|---|---|
| Date | 2025-07-15 |
| Change | Removed redundant `src/` directory (exact copies of root files) |

### ENTRY-005 — Refactor

| Field | Value |
|---|---|
| Date | 2025-07-15 |
| Change | Extracted action system into `actions/` module (dispatcher, window, file, keyboard, scancodes) |
| Impact | `menuManager.js` `_executeNativeAction` reduced from ~180 lines to 8 lines |

### ENTRY-006 — Refactor

| Field | Value |
|---|---|
| Date | 2025-07-15 |
| Change | Extracted menu definitions into `menus/` module (app, file, edit, view, go, window, help) |
| Impact | `menuManager.js` reduced from 432 to 158 lines |

### ENTRY-007 — Feature

| Field | Value |
|---|---|
| Date | 2025-07-15 |
| Change | Built settings UI with Adw (General + Blacklist pages), configurable app blacklist via GSettings |

### ENTRY-008 — Bugfix

| Field | Value |
|---|---|
| Date | 2025-07-15 |
| Change | Added `about-mactop` handler, removed 4 dead menu items (compress, duplicate, view-icons, view-list) |

### ENTRY-009 — Fix

| Field | Value |
|---|---|
| Date | 2025-07-15 |
| Change | Added `stylesheet.css`, updated install/uninstall scripts, bumped version to 2, updated README |

---

*New entries append below this line.*
