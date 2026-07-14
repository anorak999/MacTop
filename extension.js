import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { MenuManager } from './menuManager.js';

export default class MacTopExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._menuManager = null;
        this._settings = null;
    }

    enable() {
        console.log(`[mactop@anorak] Enabling extension.`);
        
        this._settings = this.getSettings('org.gnome.shell.extensions.mactop');
        
        const uuid = this.metadata.uuid || 'mactop@anorak';
        this._menuManager = new MenuManager(uuid);

        let initialWindow = global.display.get_focus_window();
        this._menuManager.updateMenuForWindow(initialWindow);

        global.display.connectObject('notify::focus-window', () => {
            let activeWindow = global.display.get_focus_window();
            this._menuManager.updateMenuForWindow(activeWindow);
        }, this);
    }

    disable() {
        console.log(`[mactop@anorak] Disabling extension.`);
        
        global.display.disconnectObject(this);

        if (this._menuManager) {
            this._menuManager.destroy();
            this._menuManager = null;
        }
        
        if (this._settings) {
            this._settings = null;
        }
    }
}
