import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { dispatch } from './actions/dispatcher.js';
import { buildAppMenu, buildFallbackAppMenu } from './menus/appMenu.js';
import { buildAppleMenu } from './menus/appleMenu.js';
import { buildFileMenu } from './menus/fileMenu.js';
import { buildEditMenu } from './menus/editMenu.js';
import { buildViewMenu } from './menus/viewMenu.js';
import { buildGoMenu } from './menus/goMenu.js';
import { buildWindowMenu } from './menus/windowMenu.js';
import { buildHelpMenu } from './menus/helpMenu.js';

// Distro icon map — uses distributor-logo-* icon names from GTK icon theme
const DISTRO_ICONS = {
    'debian':     'distributor-logo-debian',
    'ubuntu':     'distributor-logo-ubuntu-mate',
    'fedora':     'distributor-logo-fedora',
    'arch':       'distributor-logo-archlinux',
    'manjaro':    'distributor-logo-manjaro',
    'opensuse':   'distributor-logo-opensuse',
    'centos':     'distributor-logo-rhel',
    'rhel':       'distributor-logo-rhel',
    'alpine':     'distributor-logo-alpine',
    'mint':       'distributor-logo-linux-mint',
    'pop':        'distributor-logo-pop-os',
    'elementary': 'distributor-logo-elementary',
    'garuda':     'distributor-logo-archlinux',
    'nixos':      'distributor-logo-nixos',
    'void':       'distributor-logo-void',
    'gentoo':     'distributor-logo-gentoo',
    'slackware':  'distributor-logo-archlinux',
    'solus':      'distributor-logo-solus',
    'zorin':      'distributor-logo-zorin',
    'endeavour':  'distributor-logo-endeavouros',
    'nobara':     'distributor-logo-fedora',
    'kali':       'distributor-logo-kali-linux',
    'deepin':     'distributor-logo-deepin',
    'devuan':     'distributor-logo-devuan',
};

function detectDistroIcon() {
    try {
        const [ok, contents] = GLib.file_get_contents('/etc/os-release');
        if (!ok) return 'distributor-logo-debian';
        const text = new TextDecoder().decode(contents);
        const idMatch = text.match(/^ID=(.+)$/m);
        if (idMatch) {
            const id = idMatch[1].replace(/"/g, '').trim().toLowerCase();
            return DISTRO_ICONS[id] || 'distributor-logo-debian';
        }
    } catch (e) {
        // fallback
    }
    return 'distributor-logo-debian';
}

// Apple Menu — always present, computed once
const APPLE_MENU_CHILDREN = buildAppleMenu();

// Static menus — computed once, never change
const STATIC_MENUS = [
    { label: "File",   children: buildFileMenu() },
    { label: "Edit",   children: buildEditMenu() },
    { label: "View",   children: buildViewMenu() },
    { label: "Go",     children: buildGoMenu() },
    { label: "Window", children: buildWindowMenu() },
    { label: "Help",   children: buildHelpMenu() },
];

const MENU_SLOT_COUNT = 8; // apple + app + 6 static

const TopLevelMenuButton = GObject.registerClass(
  class TopLevelMenuButton extends PanelMenu.Button {
    _init(label, children, appInstance = null, menuManagerInstance = null) {
      super._init(0.0, label);
      this._appInstance = appInstance;
      this._menuManagerInstance = menuManagerInstance;
      this._isIcon = false;

      // Determine if label is an icon name (e.g. distributor-logo-*)
      if (label && (label.includes('distributor-logo') || label.includes('-logo'))) {
        this._isIcon = true;
        let icon = new St.Icon({
            icon_name: label,
            style_class: 'system-status-icon',
        });
        this.add_child(icon);
        this._titleWidget = icon;
      } else {
        let title = new St.Label({
            text: label,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'panel-button-label'
        });
        this.add_child(title);
        this._titleWidget = title;
      }

      this._buildSubMenu(children, this.menu);
    }

    _executeNativeAction(action) {
        const ctx = {
            window: global.display.get_focus_window(),
            app: this._appInstance,
        };
        return dispatch(action, ctx, this._menuManagerInstance);
    }

    updateLabel(label) {
        if (this._isIcon) {
            // Icon buttons don't change label
            return;
        }
        this._titleWidget.set_text(label);
    }

    rebuildMenu(children) {
        this.menu.removeAll();
        this._buildSubMenu(children, this.menu);
    }

    _buildSubMenu(menuItems, parentMenu) {
      for (const item of menuItems) {
        if (item.type === "separator") {
          parentMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        } else if (item.type === "section-header") {
          let headerItem = new PopupMenu.PopupMenuItem(item.label, { activate: false });
          headerItem.setSensitive(false);
          headerItem.label.add_style_class_name('popup-subtitle-menu-item');
          parentMenu.addMenuItem(headerItem);
        } else if (item.type === "submenu") {
          const subMenu = new PopupMenu.PopupSubMenuMenuItem(item.label);
          this._buildSubMenu(item.children, subMenu.menu);
          parentMenu.addMenuItem(subMenu);
        } else {
          const menuItem = new PopupMenu.PopupMenuItem(item.label);
          if (item.action) {
            menuItem.connect("activate", () => {
              this._executeNativeAction(item.action);
            });
          }
          parentMenu.addMenuItem(menuItem);
        }
      }
    }
  }
);

export class MenuManager {
    constructor(uuid, settings) {
        this.uuid = uuid;
        this._settings = settings;
        this._buttons = [];
        this._timeoutIds = [];

        // Virtual keyboard device — created once, reused across all actions
        this._virtualDevice = null;

        // Pre-allocated blacklist cache
        this._cachedBlacklist = null;
        this._cachedBlacklistLower = null;

        // Auto-detected distro icon (computed once, used as fallback)
        this._distroIcon = detectDistroIcon();
    }

    get _menuIcon() {
        if (!this._settings) return this._distroIcon;
        const setting = this._settings.get_string('menu-icon');
        return (setting && setting.length > 0) ? setting : this._distroIcon;
    }

    get _blacklist() {
        if (!this._settings) return [];
        const raw = this._settings.get_strv('app-blacklist');
        // Invalidate cache if blacklist changed
        if (raw !== this._cachedBlacklist) {
            this._cachedBlacklist = raw;
            this._cachedBlacklistLower = raw.map(s => s.toLowerCase());
        }
        return this._cachedBlacklistLower;
    }

    getVirtualDevice() {
        if (!this._virtualDevice) {
            try {
                const seat = Clutter.get_default_backend().get_default_seat();
                this._virtualDevice = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
            } catch (e) {
                console.error(`[mactop] Failed to create virtual device: ${e}`);
            }
        }
        return this._virtualDevice;
    }

    updateMenuForWindow(window) {
        let appName = "Finder";
        let isAppFocused = false;
        let detectedApp = null;

        if (window) {
            let windowType = window.get_window_type();

            if (windowType === 0) {
                let tracker = Shell.WindowTracker.get_default();
                detectedApp = tracker.get_window_app(window);

                // Fast-path: skip blacklist entirely if list is empty
                const blacklistLower = this._blacklist;
                if (blacklistLower.length > 0) {
                    let checkId = detectedApp ? (detectedApp.get_id() || "") : "";
                    let checkName = detectedApp ? (detectedApp.get_name() || "") : "";
                    let wmClass = window.get_wm_class() || "";
                    let title = window.get_title() || "";

                    // Lowercase identifiers once
                    const idLower = checkId.toLowerCase();
                    const nameLower = checkName.toLowerCase();
                    const wmClassLower = wmClass.toLowerCase();
                    const titleLower = title.toLowerCase();

                    const isBlacklisted = blacklistLower.some(item =>
                        idLower.includes(item) ||
                        nameLower.includes(item) ||
                        wmClassLower.includes(item) ||
                        titleLower.includes(item)
                    );

                    if (isBlacklisted) {
                        detectedApp = null;
                    }
                }

                if (detectedApp) {
                    appName = detectedApp.get_name();
                    isAppFocused = true;
                } else if (window.get_wm_class()) {
                    let wmClass = window.get_wm_class();
                    appName = wmClass.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    isAppFocused = true;
                }
            }
        }

        const appChildren = isAppFocused
            ? buildAppMenu(appName, detectedApp)
            : buildFallbackAppMenu();

        const newMenuData = [
            { label: this._menuIcon, children: APPLE_MENU_CHILDREN },
            { label: appName, children: appChildren },
            ...STATIC_MENUS,
        ];

        // Ensure we have exactly MENU_SLOT_COUNT buttons
        while (this._buttons.length < MENU_SLOT_COUNT) {
            const idx = this._buttons.length;
            const data = newMenuData[idx];
            const btn = new TopLevelMenuButton(data.label, data.children, detectedApp, this);
            Main.panel.addToStatusArea(`${this.uuid}-${idx}`, btn, idx + 1, 'left');
            this._buttons.push(btn);
        }

        // Update existing buttons in-place
        for (let i = 0; i < MENU_SLOT_COUNT; i++) {
            const btn = this._buttons[i];
            const data = newMenuData[i];

            btn._appInstance = detectedApp;
            btn.updateLabel(data.label);
            btn.rebuildMenu(data.children);
        }

        // Destroy excess buttons (shouldn't happen, but defensive)
        while (this._buttons.length > MENU_SLOT_COUNT) {
            const extra = this._buttons.pop();
            extra.destroy();
        }
    }

    clear() {
        this._buttons.forEach(btn => btn.destroy());
        this._buttons = [];

        // Safely cancel any active timeout loops to eliminate leaks/lint findings
        if (this._timeoutIds && this._timeoutIds.length > 0) {
            this._timeoutIds.forEach(id => GLib.source_remove(id));
            this._timeoutIds = [];
        }
    }

    destroy() {
        this.clear();
        this._virtualDevice = null;
    }
}
