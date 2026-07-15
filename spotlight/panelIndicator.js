// Ported from search-light (GPL-3.0) with permission consideration.
// Panel indicator button for spotlight search.

import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Creates and manages the spotlight panel indicator button.
 * Inserts directly into the right box, positioned to the left of the user switcher.
 */
export class SpotlightIndicator {
    constructor(onToggle) {
        this._indicator = null;
        this._onToggle = onToggle;
    }

    /**
     * Create the panel button and insert into the right box.
     */
    create() {
        if (this._indicator) return this._indicator;

        this._indicator = new St.Button({
            style_class: 'panel-status-indicators-box',
        });

        let icon = new St.Icon({
            style_class: 'panel-status-indicator-icon',
            gicon: new Gio.ThemedIcon({ name: 'edit-find-symbolic' }),
        });
        icon.style = 'margin-top: 6px !important; margin-bottom: 6px !important;';
        this._indicator.set_child(icon);

        this._indicator.connect('button-press-event', () => {
            this._onToggle();
        });

        // Insert at position 0 in the right box (leftmost in right panel area)
        // This places it to the left of the user switcher
        try {
            Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
        } catch (e) {
            console.error(`[mactop] Failed to insert spotlight indicator: ${e}`);
        }

        return this._indicator;
    }

    /**
     * Update visibility based on settings.
     */
    setVisible(visible) {
        if (this._indicator) {
            this._indicator.visible = visible;
        }
    }

    /**
     * Destroy the button and remove from parent.
     */
    destroy() {
        if (this._indicator) {
            if (this._indicator.get_parent()) {
                this._indicator.get_parent().remove_child(this._indicator);
            }
            this._indicator = null;
        }
    }
}
