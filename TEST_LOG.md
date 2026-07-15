# TEST_LOG.md — MacTop

---

## Test Scenarios

| ID | Scenario | Category | Status | Notes |
|---|---|---|---|---|
| TS-001 | Extension loads without errors on GNOME 45–50 | Smoke | Pending | Verify `extension.js` imports resolve |
| TS-002 | Menu buttons appear in top panel on window focus | Functional | Pending | Check `PanelMenu.Button` registration |
| TS-003 | App name displays correctly in first menu item | Functional | Pending | `Shell.WindowTracker.get_default()` returns valid app |
| TS-004 | Blacklisted apps (nautilus, gnome-shell) suppress menu | Functional | Pending | Verify `_blacklist` matching logic |
| TS-005 | Window switch triggers menu rebuild | Functional | Pending | `notify::focus-window` signal fires correctly |
| TS-006 | Virtual keyboard shortcuts fire (Copy, Paste, Cut, etc.) | Functional | Pending | `Clutter.InputDevice.notify_key` pairings correct |
| TS-007 | `xdg-open` actions open correct directories | Integration | Pending | Recents, Documents, Desktop, Downloads, Home |
| TS-008 | GSettings schema compiles without errors | Infra | Pending | `glib-compile-schemas` exits 0 |
| TS-014 | Spotlight panel icon toggles overlay | Functional | Pending | Click search icon in right panel, verify overlay appears/disappears |
| TS-015 | Spotlight keybinding toggles overlay | Functional | Pending | Press Ctrl+Cmd+Space, verify overlay toggles |
| TS-016 | Spotlight overlay closes on Escape | Functional | Pending | Open overlay, press Escape, verify closes |
| TS-017 | Spotlight overlay closes on focus loss | Functional | Pending | Open overlay, click outside, verify closes |
| TS-018 | Spotlight multi-monitor positions correctly | Functional | Pending | Move cursor to second monitor, open overlay, verify appears on correct monitor |
| TS-019 | Spotlight blur effect works with imagemagick | Functional | Pending | Enable blur in settings, verify background is blurred |
| TS-020 | Spotlight blur falls back gracefully without imagemagick | Functional | Pending | Disable imagemagick, enable blur, verify no exception in journalctl |
| TS-021 | Spotlight icon visibility respects settings live | Functional | Pending | Toggle spotlight-show-panel-icon in preferences, verify icon appears/disappears without restart |
| TS-022 | Extension disable removes spotlight cleanly | Stability | Pending | Disable extension, verify panel icon removed, keybinding released (check `busctl` or Looking Glass) |
| TS-009 | Extension disables cleanly — no leaked signals | Stability | Pending | `disconnectObject` called for all connections |
| TS-010 | Timeout callbacks cleared on disable | Stability | Pending | `_timeoutIds` array empty after `destroy()` |
| TS-011 | Install script copies all files to correct UUID dir | Infra | Pending | Verify `~/.local/share/gnome-shell/extensions/mactop@anorak/` |
| TS-012 | Uninstall script removes extension completely | Infra | Pending | Directory gone, extension disabled |
| TS-013 | Extension preferences dialog opens without ImportError | Smoke | Pending | `prefs.js` present and exports valid class |

---

## Incident Reports

| ID | Date | Severity | Description | Status |
|---|---|---|---|---|
| *(None yet)* | — | — | — | — |

---

## Validation Results

| ID | Date | Test IDs | Result | Auditor |
|---|---|---|---|---|
| *(None yet)* | — | — | — | — |

---

*New entries append below this line.*
