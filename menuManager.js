import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { dispatch } from './actions/dispatcher.js';
import { buildAppMenu, buildFallbackAppMenu } from './menus/appMenu.js';
import { buildFileMenu } from './menus/fileMenu.js';
import { buildEditMenu } from './menus/editMenu.js';
import { buildViewMenu } from './menus/viewMenu.js';
import { buildGoMenu } from './menus/goMenu.js';
import { buildWindowMenu } from './menus/windowMenu.js';
import { buildHelpMenu } from './menus/helpMenu.js';

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
                        isAppFocused = true;
                    } else if (wmClass) {
                        appName = wmClass.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        isAppFocused = true;
                    }
                } else {
                    detectedApp = null;
                }
            }
        }

        const appChildren = isAppFocused
            ? buildAppMenu(appName, detectedApp)
            : buildFallbackAppMenu();

        const menuData = [
            { type: "submenu", label: appName, children: appChildren },
            { type: "submenu", label: "File",   children: buildFileMenu() },
            { type: "submenu", label: "Edit",   children: buildEditMenu() },
            { type: "submenu", label: "View",   children: buildViewMenu() },
            { type: "submenu", label: "Go",     children: buildGoMenu() },
            { type: "submenu", label: "Window", children: buildWindowMenu() },
            { type: "submenu", label: "Help",   children: buildHelpMenu() },
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
