// Ported from search-light (GPL-3.0) with permission consideration.
// Global keybinding grab/release for spotlight toggle.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

export const SpotlightKeybinding = class {
    constructor() {
        this._grabbers = {};
        this._eventId = null;
    }

    enable() {
        if (this._eventId) return;
        this._eventId = global.display.connect(
            'accelerator-activated',
            (_display, action) => {
                this._onAccelerator(action);
            },
        );
    }

    disable() {
        this.unlisten();
        if (this._eventId) {
            global.display.disconnect(this._eventId);
            this._eventId = null;
        }
    }

    listenFor(accelerator, callback) {
        let action = global.display.grab_accelerator(accelerator, 0);
        if (action === Meta.KeyBindingAction.NONE) {
            console.log(`[mactop] Unable to grab accelerator ${accelerator}`);
            return false;
        }

        let name = Meta.external_binding_name_for_action(action);
        Main.wm.allowKeybinding(name, Shell.ActionMode.ALL);

        this._grabbers[action] = { name, accelerator, callback };
        console.log(`[mactop] Grabbed ${accelerator}`);
        return true;
    }

    unlisten() {
        if (!this._grabbers) return;
        Object.keys(this._grabbers).forEach(k => {
            Main.wm.removeKeybinding(this._grabbers[k].name);
            global.display.ungrab_accelerator(parseInt(k));
        });
        this._grabbers = {};
    }

    _onAccelerator(action) {
        let grabber = this._grabbers[action];
        if (grabber) grabber.callback();
    }
};
