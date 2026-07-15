import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from 'gi://GLib';
import { MenuManager } from './menuManager.js';
import { UserSwitcherController } from './userSwitcher.js';
import { SpotlightOverlay } from './spotlight/spotlightOverlay.js';
import { SpotlightIndicator } from './spotlight/panelIndicator.js';
import { SpotlightKeybinding } from './spotlight/keybinding.js';

const FOCUS_DEBOUNCE_MS = 50;

export default class MacTopExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._menuManager = null;
        this._settings = null;
        this._focusTimeoutId = 0;
        this._focusedWindow = null;
        this._userSwitcherController = null;
        this._spotlightOverlay = null;
        this._spotlightIndicator = null;
        this._spotlightKeybinding = null;
    }

    enable() {
        console.log(`[mactop@anorak] Enabling extension.`);

        this._settings = this.getSettings('org.gnome.shell.extensions.mactop');
        this._focusedWindow = null;

        const uuid = this.metadata.uuid || 'mactop@anorak';
        this._menuManager = new MenuManager(uuid, this._settings);

        let initialWindow = global.display.get_focus_window();
        this._updateMenu(initialWindow);

        global.display.connectObject('notify::focus-window', () => {
            this._scheduleMenuUpdate();
        }, this);

        // User switcher (right side of panel)
        this._userSwitcherController = new UserSwitcherController(this, this._settings);

        // Spotlight search overlay
        this._initSpotlight();
    }

    _initSpotlight() {
        this._spotlightOverlay = new SpotlightOverlay(this);
        this._spotlightOverlay.enable();

        // Create indicator button
        this._spotlightIndicator = new SpotlightIndicator(() => {
            this._spotlightOverlay.toggle();
        });
        this._spotlightIndicator.create();

        // Register keybinding
        this._spotlightKeybinding = new SpotlightKeybinding();
        this._spotlightKeybinding.enable();
        this._updateSpotlightKeybinding();

        // Handle settings changes
        this._settings.connectObject('changed::spotlight-show-panel-icon', () => {
            this._spotlightIndicator.setVisible(this._settings.get_boolean('spotlight-show-panel-icon'));
        }, this);

        this._settings.connectObject('changed::spotlight-keybinding', () => {
            this._updateSpotlightKeybinding();
        }, this);

        // Set initial visibility
        this._spotlightIndicator.setVisible(this._settings.get_boolean('spotlight-show-panel-icon'));
    }

    _updateSpotlightKeybinding() {
        this._spotlightKeybinding.unlisten();
        let keybinding = this._settings.get_string('spotlight-keybinding');
        if (keybinding) {
            this._spotlightKeybinding.listenFor(keybinding, () => {
                this._spotlightOverlay.toggle();
            });
        }
    }

    _updateMenu(window) {
        if (!this._menuManager) return;

        const lockEnabled = this._settings
            ? this._settings.get_boolean('lock-to-focused-app')
            : true;

        if (lockEnabled) {
            // Only update if the focused window actually changed
            if (window === this._focusedWindow) {
                return;
            }
            // If window is null (e.g., hovering over panel), keep previous menu
            if (window === null) {
                return;
            }
            this._focusedWindow = window;
        } else {
            this._focusedWindow = window;
        }

        this._menuManager.updateMenuForWindow(window);
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
                this._updateMenu(activeWindow);
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

        this._focusedWindow = null;

        // Clean up spotlight
        if (this._spotlightKeybinding) {
            this._spotlightKeybinding.disable();
            this._spotlightKeybinding = null;
        }

        if (this._spotlightIndicator) {
            this._spotlightIndicator.destroy();
            this._spotlightIndicator = null;
        }

        if (this._spotlightOverlay) {
            this._spotlightOverlay.disable();
            this._spotlightOverlay = null;
        }

        if (this._menuManager) {
            this._menuManager.destroy();
            this._menuManager = null;
        }

        if (this._userSwitcherController) {
            this._userSwitcherController.destroy();
            this._userSwitcherController = null;
        }

        if (this._settings) {
            this._settings = null;
        }
    }
}
