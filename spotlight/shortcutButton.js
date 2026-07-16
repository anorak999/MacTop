// Interactive keyboard shortcut recorder widget for the preferences dialog.
// Adapted from search-light's ShortcutSettingWidget (GPL-3.0).

import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

const genParam = (type, name, ...dflt) =>
  GObject.ParamSpec[type](
    name,
    name,
    name,
    GObject.ParamFlags.READWRITE,
    ...dflt,
  );

export const ShortcutButton = GObject.registerClass(
  {
    Properties: {
      shortcut: genParam('string', 'shortcut', ''),
    },
    Signals: {
      changed: { param_types: [GObject.TYPE_STRING] },
    },
  },
  class ShortcutButton extends Gtk.Button {
    _init(settings, key, window) {
      super._init({
        valign: Gtk.Align.CENTER,
        has_frame: true,
        // Show the current shortcut as button label initially
        label: 'New accelerator…',
      });

      this._key = key;
      this._settings = settings;
      this._window = window;
      this._editor = null;

      this.connect('clicked', this._onActivated.bind(this));

      // Load current shortcut
      this.shortcut = this._settings.get_string(this._key);
      this._updateLabel();

      // Sync if changed externally
      this._settings.connect(`changed::${this._key}`, () => {
        this.shortcut = this._settings.get_string(this._key);
        this._updateLabel();
      });
    }

    _updateLabel() {
      if (this.shortcut) {
        try {
          // Parse the accelerator string for human-readable display
          let [ok, key, mods] = Gtk.accelerator_parse(this.shortcut);
          if (ok) {
            this.label = Gtk.accelerator_get_label(key, mods);
          } else {
            this.label = this.shortcut;
          }
        } catch {
          this.label = this.shortcut;
        }
      } else {
        this.label = 'New accelerator…';
      }
    }

    _onActivated(widget) {
      if (!this._editor) {
        // Build editor content: a centered label prompting the user
        const box = new Gtk.Box({
          orientation: Gtk.Orientation.VERTICAL,
          valign: Gtk.Align.CENTER,
          halign: Gtk.Align.CENTER,
          spacing: 12,
          margin_top: 24,
          margin_bottom: 24,
          margin_start: 24,
          margin_end: 24,
        });

        const icon = new Gtk.Image({
          icon_name: 'preferences-desktop-keyboard-symbolic',
          pixel_size: 64,
        });
        box.append(icon);

        const title = new Gtk.Label({
          label: '<b>Press a key combination</b>',
          use_markup: true,
        });
        box.append(title);

        const hint = new Gtk.Label({
          label: 'Press Escape to cancel.\nPress Backspace to clear the shortcut.',
          use_markup: true,
        });
        hint.get_style_context().add_class('dim-label');
        box.append(hint);

        this._editor = new Gtk.Window({
          title: 'Set Shortcut',
          modal: true,
          hide_on_close: true,
          transient_for: this._window,
          width_request: 400,
          height_request: 200,
          child: box,
        });
      }

      const ctl = new Gtk.EventControllerKey();
      this._editor.add_controller(ctl);
      ctl.connect('key-pressed', this._onKeyPressed.bind(this));
      this._editor.present();
    }

    _onKeyPressed(_widget, keyval, keycode, state) {
      let mask = state & Gtk.accelerator_get_default_mod_mask();
      mask &= ~Gdk.ModifierType.LOCK_MASK;

      if (!mask && keyval === Gdk.KEY_Escape) {
        this._editor.close();
        return Gdk.EVENT_STOP;
      }

      if (keyval === Gdk.KEY_BackSpace) {
        this._saveShortcut(null);
        return Gdk.EVENT_STOP;
      }

      if (
        !this._isValidBinding(mask, keycode, keyval) ||
        !this._isValidAccel(mask, keyval)
      ) {
        return Gdk.EVENT_STOP;
      }

      this._saveShortcut({ keyval, keycode, mask });
      return Gdk.EVENT_STOP;
    }

    _saveShortcut(keys) {
      if (!keys) {
        this.shortcut = '';
      } else {
        this.shortcut = Gtk.accelerator_name_with_keycode(
          null,
          keys.keyval,
          keys.keycode,
          keys.mask,
        );
      }

      this._settings.set_string(this._key, this.shortcut);
      this.emit('changed', this.shortcut);
      this._editor.close();
    }

    // Validation helpers — ported from gnome-control-center keyboard panel.
    // https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c

    _keyvalIsForbidden(keyval) {
      return [
        // Navigation keys
        Gdk.KEY_Home,
        Gdk.KEY_Left,
        Gdk.KEY_Up,
        Gdk.KEY_Right,
        Gdk.KEY_Down,
        Gdk.KEY_Page_Up,
        Gdk.KEY_Page_Down,
        Gdk.KEY_End,
        Gdk.KEY_Tab,

        // Return / Enter
        Gdk.KEY_KP_Enter,
        Gdk.KEY_Return,

        // Mode switch
        Gdk.KEY_Mode_switch,
      ].includes(keyval);
    }

    _isValidBinding(mask, keycode, keyval) {
      return !(
        mask === 0 ||
        (mask === Gdk.ModifierType.SHIFT_MASK &&
          keycode !== 0 &&
          ((keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
            (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
            (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
            (keyval >= Gdk.KEY_kana_fullstop &&
              keyval <= Gdk.KEY_semivoicedsound) ||
            (keyval >= Gdk.KEY_Arabic_comma && keyval <= Gdk.KEY_Arabic_sukun) ||
            (keyval >= Gdk.KEY_Serbian_dje &&
              keyval <= Gdk.KEY_Cyrillic_HARDSIGN) ||
            (keyval >= Gdk.KEY_Greek_ALPHAaccent &&
              keyval <= Gdk.KEY_Greek_omega) ||
            (keyval >= Gdk.KEY_hebrew_doublelowline &&
              keyval <= Gdk.KEY_hebrew_taf) ||
            (keyval >= Gdk.KEY_Thai_kokai && keyval <= Gdk.KEY_Thai_lekkao) ||
            (keyval >= Gdk.KEY_Hangul_Kiyeog &&
              keyval <= Gdk.KEY_Hangul_J_YeorinHieuh) ||
            (keyval === Gdk.KEY_space && mask === 0) ||
            this._keyvalIsForbidden(keyval)))
      );
    }

    _isValidAccel(mask, keyval) {
      return (
        Gtk.accelerator_valid(keyval, mask) ||
        (keyval === Gdk.KEY_Tab && mask !== 0)
      );
    }
  },
);
