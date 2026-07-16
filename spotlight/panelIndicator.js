'use strict';

import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class SpotlightIndicator {
  constructor(onToggle) {
    this._indicator = null;
    this._onToggle = onToggle;
  }

  create() {
    if (this._indicator) return this._indicator;

    this._indicator = new St.Button({
      style_class: 'panel-status-indicators-box',
    });
    let icon = new St.Icon({
      // 'mactop-spotlight-icon' is a unique hook so the overlay can recolor
      // *only* this icon without touching native .system-status-icon elements.
      style_class: 'panel-status-indicator-icon mactop-spotlight-icon',
      gicon: new Gio.ThemedIcon({ name: 'search-symbolic' }),
    });
    icon.style = 'margin-top: 6px !important; margin-bottom: 6px !important;';
    this._indicator.set_child(icon);
    this._indicator.connectObject(
      'button-press-event',
      this._onToggle,
      this,
    );

    try {
      Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
    } catch (err) {
      console.log(err);
    }

    return this._indicator;
  }

  setVisible(visible) {
    if (this._indicator) {
      this._indicator.visible = visible;
    }
  }

  destroy() {
    if (this._indicator) {
      this._indicator.disconnectObject(this);
      if (this._indicator.get_parent()) {
        this._indicator.get_parent().remove_child(this._indicator);
      }
      this._indicator = null;
    }
  }
}
