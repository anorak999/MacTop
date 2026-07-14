import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from 'gi://GLib';
import { MenuManager } from './menuManager.js';

const FOCUS_DEBOUNCE_MS = 50;

export default class MacTopExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._menuManager = null;
        this._settings = null;
        this._focusTimeoutId = 0;
    }

    enable() {
        console.log(`[mactop@anorak] Enabling extension.`);

        this._settings = this.getSettings('org.gnome.shell.extensions.mactop');

        const uuid = this.metadata.uuid || 'mactop@anorak';
        this._menuManager = new MenuManager(uuid, this._settings);

        let initialWindow = global.display.get_focus_window();
        this._menuManager.updateMenuForWindow(initialWindow);

        global.display.connectObject('notify::focus-window', () => {
            this._scheduleMenuUpdate();
        }, this);
    }

    _scheduleMenuUpdate() {
        if (this._focusTimeoutId) {
            GLib.source_remove(this._focusTimeoutId);
        }
        this._focusTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            FOCUS_DEBOUNCE_MS,
            () => {
                this._focusTimeoutId = 0;
                let activeWindow = global.display.get_focus_window();
                this._menuManager.updateMenuForWindow(activeWindow);
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    disable() {
        console.log(`[mactop@anorak] Disabling extension.`);

        global.display.disconnectObject(this);

        if (this._focusTimeoutId) {
            GLib.source_remove(this._focusTimeoutId);
            this._focusTimeoutId = 0;
        }

        if (this._menuManager) {
            this._menuManager.destroy();
            this._menuManager = null;
        }

        if (this._settings) {
            this._settings = null;
        }
    }
}
