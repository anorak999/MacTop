import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { dispatch } from './actions/dispatcher.js';

const TopLevelMenuButton = GObject.registerClass(
  class TopLevelMenuButton extends PanelMenu.Button {
    _init(label, children, appInstance = null, menuManagerInstance = null) {
      super._init(0.0, label);
      this._appInstance = appInstance;
      this._menuManagerInstance = menuManagerInstance;
      
      let title = new St.Label({
          text: label,
          y_align: Clutter.ActorAlign.CENTER,
          style_class: 'panel-button-label'
      });
      this.add_child(title);
      
      this._buildSubMenu(children, this.menu);
    }

    _executeNativeAction(action) {
        const ctx = {
            window: global.display.get_focus_window(),
            app: this._appInstance,
            desktopId: '',
        };
        return dispatch(action, ctx, this._menuManagerInstance);
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
    constructor(uuid) {
        this.uuid = uuid;
        this._buttons = [];
        this._timeoutIds = [];
        this._blacklist = ['gjs', 'org.gnome.gjs', 'gnome-shell', 'mutter', 'nautilus', 'org.gnome.nautilus'];
    }

    updateMenuForWindow(window) {
        this.clear();

        let appName = "Finder";
        let isAppFocused = false;
        let desktopId = "";
        let detectedApp = null;

        if (window) {
            let windowType = window.get_window_type();
            
            if (windowType === 0) {
                let tracker = Shell.WindowTracker.get_default();
                detectedApp = tracker.get_window_app(window);
                
                let checkId = detectedApp ? (detectedApp.get_id() || "") : "";
                let checkName = detectedApp ? (detectedApp.get_name() || "") : "";
                let wmClass = window.get_wm_class() || "";
                let title = window.get_title() || "";

                let combinedIdentifiers = `${checkId} ${checkName} ${wmClass} ${title}`.toLowerCase();

                let isBlacklisted = this._blacklist.some(item => 
                    combinedIdentifiers.includes(item.toLowerCase())
                );

                if (!isBlacklisted && (detectedApp || wmClass)) {
                    if (detectedApp) {
                        appName = detectedApp.get_name();
                        desktopId = detectedApp.get_id();
                        isAppFocused = true;
                    } else if (wmClass) {
                        appName = wmClass.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        desktopId = wmClass.toLowerCase() + ".desktop";
                        isAppFocused = true;
                    }
                } else {
                    detectedApp = null;
                }
            }
        }

        let firstMenuChildren = [];
        if (isAppFocused) {
            if (detectedApp) {
                let openWindows = detectedApp.get_windows();
                if (openWindows.length > 0) {
                    firstMenuChildren.push({ type: "section-header", label: "Open Windows" });
                    openWindows.forEach(win => {
                        firstMenuChildren.push({
                            label: win.get_title() || appName,
                            action: `activate-window:${win.get_id()}`
                        });
                    });
                    firstMenuChildren.push({ type: "separator" });
                }
            }
            firstMenuChildren.push(
                { label: "New Window", action: "new-app-window" },
                { type: "separator" },
                { label: "App Details", action: `app-details:${desktopId}` },
                { type: "separator" },
                { label: `Quit ${appName}`, action: "close" }
            );
        } else {
            firstMenuChildren = [
                { label: "About MacTop", action: "about-mactop" },
                { type: "separator" },
                { label: "Open Finder", action: "open-finder" },
                { label: "Settings", action: "open-settings" },
                { type: "separator" },
                { label: "Empty Bin...", action: "empty-bin" }
            ];
        }

        const menuData = [
            {
                type: "submenu",
                label: appName,
                children: firstMenuChildren
            },
            {
                type: "submenu",
                label: "File",
                children: [
                    { label: "New Finder Window", action: "new-finder-win" },
                    { label: "New Folder", action: "new-folder" },
                    { label: "New Tab", action: "new-tab" },
                    { label: "Open", action: "virtual-open" },
                    { label: "Open With", action: "native-open-with" },
                    { label: "Print", action: "print" },
                    { type: "separator" },
                    { label: "Get Info", action: "properties" },
                    { label: "Compress", action: "compress" },
                    { label: "Duplicate", action: "duplicate" },
                    { type: "separator" },
                    { label: "Move to Trash", action: "delete-item" },
                    { type: "separator" },
                    { label: "Close Window", action: "close" }
                ]
            },
            {
                type: "submenu",
                label: "Edit",
                children: [
                    { label: "Undo", action: "undo" },
                    { label: "Redo", action: "redo" },
                    { type: "separator" },
                    { label: "Cut", action: "cut" },
                    { label: "Copy", action: "copy" },
                    { label: "Paste", action: "paste" },
                    { label: "Delete", action: "delete-item" },
                    { type: "separator" },
                    { label: "Select All", action: "select-all" },
                    { type: "separator" },
                    { label: "Emoji & Symbols", action: "emoji-picker" }
                ]
            },
            {
                type: "submenu",
                label: "View",
                children: [
                    { label: "as Icons", action: "view-icons" },
                    { label: "as List", action: "view-list" },
                    { type: "separator" },
                    { label: "Enter Full Screen", action: "toggle-fullscreen" }
                ]
            },
            {
                type: "submenu",
                label: "Go",
                children: [
                    { label: "Back", action: "go-back" },
                    { label: "Forward", action: "go-forward" },
                    { type: "separator" },
                    { label: "Recents", action: "go-recents" },
                    { label: "Documents", action: "go-documents" },
                    { label: "Desktop", action: "go-desktop" },
                    { label: "Downloads", action: "go-downloads" },
                    { label: "Home", action: "go-home" }
                ]
            },
            {
                type: "submenu",
                label: "Window",
                children: [
                    { label: "Minimize", action: "minimize" },
                    { label: "Maximize", action: "maximize" },
                    { type: "separator" },
                    { label: "Close", action: "close" }
                ]
            },
            {
                type: "submenu",
                label: "Help",
                children: [
                    { label: "Send Feedback", action: "send-feedback" },
                    { label: "GNOME Help", action: "open-system-help" }
                ]
            }
        ];

        menuData.forEach((item, index) => {
            if (item.type === "submenu") {
                let btn = new TopLevelMenuButton(item.label, item.children, detectedApp, this);
                Main.panel.addToStatusArea(`${this.uuid}-${index}`, btn, index + 1, 'left');
                this._buttons.push(btn);
            }
        });
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
    }
}
