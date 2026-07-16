'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Graphene from 'gi://Graphene';
import { trySpawnCommandLine } from 'resource:///org/gnome/shell/misc/util.js';

import { Timer } from './timer.js';
import { Style } from './style.js';

import { TintEffect } from './effects/tint_effect.js';
import { MonochromeEffect } from './effects/monochrome_effect.js';
import { BlurEffect } from './effects/blur_effect.js';

const SpotlightWidget = GObject.registerClass(
  {},
  class SpotlightWidget extends St.Widget {
    _init() {
      super._init();
      this.name = 'spotlightSearch';
      this.offscreen_redirect = Clutter.OffscreenRedirect.ALWAYS;
      this.layout_manager = new Clutter.BinLayout();
    }
  },
);

const FONT_SIZE_OPTIONS = [0, 16, 18, 20, 22, 24];
const BORDER_RADIUS_OPTIONS = [0, 16, 18, 20, 22, 24, 28, 32];

export class SpotlightOverlay {
  constructor(extension) {
    this._extension = extension;
    this._settings = extension._settings;
    this._path = extension.path;
    this._visible = false;
    this._inOverview = false;

    this._hiTimer = null;
    this._loTimer = null;
    this._style = null;

    this._mainContainer = null;
    this._container = null;
    this._background = null;
    this._blurEffect = null;
    this._windowEffect = null;

    this._entry = null;
    this._entryParent = null;
    this._search = null;
    this._searchParent = null;
    this._searchResults = null;

    this._textChangedEventId = null;
    this._animSeq = null;
    this._resultsChangedId = 0;

    this._desktopSettings = null;
    this._settingsChangedIds = [];
  }

  enable() {
    Main.overview.graphene = Graphene;

    this._style = new Style();

    this._hiTimer = new Timer('spotlight-hi-res');
    this._hiTimer.initialize(15);

    this._loTimer = new Timer('spotlight-lo-res');
    this._loTimer.initialize(750);

    this._loadSettings();

    this._desktopSettings = new Gio.Settings({
      schema_id: 'org.gnome.desktop.background',
    });
    this._desktopSettings.connectObject(
      'changed::picture-uri',
      () => {
        this._updateBlurredBackground();
      },
      this,
    );

    this._mainContainer = new SpotlightWidget();
    this._mainContainer._delegate = this;

    this._container = new St.BoxLayout({
      name: 'spotlightBox',
      orientation: Clutter.Orientation.VERTICAL,
      reactive: true,
      track_hover: true,
      can_focus: true,
    });
    this._container._delegate = this;

    Main.layoutManager.addChrome(this._mainContainer, {
      affectsStruts: false,
      trackFullscreen: false,
    });
    this._mainContainer.add_child(this._container);
    this._mainContainer.hide();

    this._setupBackground();

    Main.overview.connectObject(
      'overview-showing',
      () => {
        this._inOverview = true;
      },
      'overview-hidden',
      () => {
        this._inOverview = false;
      },
      this,
    );

    Shell.AppSystem.get_default().connectObject(
      'app-state-changed',
      (_sys, st) => {
        this._lastAppState = st;
        if (this._visible) {
          this._mainContainer.opacity = 0;
        }
      },
      this,
    );

    global.display.connectObject(
      'window-created',
      () => {
        if (this._visible) {
          this._mainContainer.opacity = 0;
        }
      },
      this,
    );

    this._updateBlurredBackground();
    this._updateWindowEffect();
    this._updateCss();

    this._loTimer.runOnce(() => {
      this._updateBlurredBackground();
    }, 500);
  }

  disable() {
    this._hiTimer?.shutdown();
    this._hiTimer = null;
    this._loTimer?.shutdown();
    this._loTimer = null;

    this._release_ui();

    if (this._blurEffect && this._mainContainer) {
      this._mainContainer.remove_effect(this._blurEffect);
      this._blurEffect = null;
    }

    if (this._background) {
      if (this._background.get_parent()) {
        this._background.get_parent().remove_child(this._background);
      }
      this._background = null;
    }

    if (this._mainContainer) {
      Main.layoutManager.removeChrome(this._mainContainer);
      this._mainContainer = null;
    }

    if (this._style) {
      this._style.unloadAll();
      this._style = null;
    }

    this._settingsChangedIds.forEach(([obj, id]) => {
      obj.disconnect(id);
    });
    this._settingsChangedIds = [];

    Main.overview.disconnectObject(this);
    Shell.AppSystem.get_default().disconnectObject(this);
    global.display.disconnectObject(this);

    if (this._desktopSettings) {
      this._desktopSettings.disconnectObject(this);
      this._desktopSettings = null;
    }
  }

  _loadSettings() {
    this.background_color = this._getArray('spotlight-background-color', [0, 0, 0, 0]);
    this.border_radius = this._settings.get_int('spotlight-border-radius');
    this.border_thickness = this._settings.get_int('spotlight-border-thickness');
    this.border_color = this._getArray('spotlight-border-color', [1, 1, 1, 1]);
    this.scale_width = this._settings.get_double('spotlight-scale-width');
    this.scale_height = this._settings.get_double('spotlight-scale-height');
    this.font_size = this._settings.get_int('spotlight-font-size');
    this.entry_font_size = this._settings.get_int('spotlight-entry-font-size');
    this.text_color = this._getArray('spotlight-text-color', [1, 1, 1, 0]);
    this.entry_text_color = this._getArray('spotlight-entry-text-color', [1, 1, 1, 0]);
    this.panel_icon_color = this._getArray('spotlight-panel-icon-color', [1, 1, 1, 0]);
    this.window_effect = this._settings.get_int('spotlight-window-effect');
    this.window_effect_color = this._getArray('spotlight-window-effect-color', [1, 1, 1, 1]);
    this.preferred_monitor = this._settings.get_int('spotlight-preferred-monitor');
    this.popup_at_cursor_monitor = this._settings.get_boolean('spotlight-popup-at-cursor-monitor');
    this.blur_background = this._settings.get_boolean('spotlight-blur-background');
    this.blur_sigma = this._settings.get_int('spotlight-blur-sigma');
    this.blur_brightness = this._settings.get_double('spotlight-blur-brightness');
    this.use_animations = this._settings.get_boolean('spotlight-use-animations');
    this.animation_speed = this._settings.get_int('spotlight-animation-speed');
    this.theme = this._settings.get_string('spotlight-theme');

    const settingsMap = {
      'spotlight-background-color': () => { this.background_color = this._getArray('spotlight-background-color', [0, 0, 0, 0]); this._updateBlurredBackground(); this._updateCss(); },
      'spotlight-border-radius': () => { this.border_radius = this._settings.get_int('spotlight-border-radius'); this._updateCss(); },
      'spotlight-border-thickness': () => { this.border_thickness = this._settings.get_int('spotlight-border-thickness'); this._updateCss(); },
      'spotlight-border-color': () => { this.border_color = this._getArray('spotlight-border-color', [1, 1, 1, 1]); this._updateCss(); },
      'spotlight-scale-width': () => { this.scale_width = this._settings.get_double('spotlight-scale-width'); this._layout(); },
      'spotlight-scale-height': () => { this.scale_height = this._settings.get_double('spotlight-scale-height'); this._layout(); },
      'spotlight-font-size': () => { this.font_size = this._settings.get_int('spotlight-font-size'); this._updateCss(); },
      'spotlight-entry-font-size': () => { this.entry_font_size = this._settings.get_int('spotlight-entry-font-size'); this._updateCss(); },
      'spotlight-text-color': () => { this.text_color = this._getArray('spotlight-text-color', [1, 1, 1, 0]); this._updateCss(); },
      'spotlight-entry-text-color': () => { this.entry_text_color = this._getArray('spotlight-entry-text-color', [1, 1, 1, 0]); this._updateCss(); },
      'spotlight-panel-icon-color': () => { this.panel_icon_color = this._getArray('spotlight-panel-icon-color', [1, 1, 1, 0]); this._updateCss(); },
      'spotlight-window-effect': () => { this.window_effect = this._settings.get_int('spotlight-window-effect'); this._updateWindowEffect(); },
      'spotlight-window-effect-color': () => {
        this.window_effect_color = this._getArray('spotlight-window-effect-color', [1, 1, 1, 1]);
        if (this._windowEffect) this._windowEffect.color = this.window_effect_color;
      },
      'spotlight-preferred-monitor': () => { this.preferred_monitor = this._settings.get_int('spotlight-preferred-monitor'); },
      'spotlight-popup-at-cursor-monitor': () => { this.popup_at_cursor_monitor = this._settings.get_boolean('spotlight-popup-at-cursor-monitor'); },
      'spotlight-blur-background': () => { this.blur_background = this._settings.get_boolean('spotlight-blur-background'); this._updateBlurredBackground(); this._updateCss(); },
      'spotlight-blur-sigma': () => { this.blur_sigma = this._settings.get_int('spotlight-blur-sigma'); this._updateBlurredBackground(); },
      'spotlight-blur-brightness': () => { this.blur_brightness = this._settings.get_double('spotlight-blur-brightness'); this._updateBlurredBackground(); },
      'spotlight-use-animations': () => { this.use_animations = this._settings.get_boolean('spotlight-use-animations'); },
      'spotlight-animation-speed': () => { this.animation_speed = this._settings.get_int('spotlight-animation-speed'); },
      'spotlight-theme': () => { this.theme = this._settings.get_string('spotlight-theme'); this._updateCss(); },
    };

    for (const [key, handler] of Object.entries(settingsMap)) {
      const id = this._settings.connect(`changed::${key}`, handler);
      this._settingsChangedIds.push([this._settings, id]);
    }
  }

  _getArray(key, fallback) {
    try {
      const arr = this._settings.get_value(key);
      if (arr && arr.n_children() > 0) {
        return Array.from({ length: arr.n_children() }, (_, i) => arr.get_child_value(i).get_double());
      }
    } catch (_e) {}
    return fallback;
  }

  _setupBackground() {
    if (this._background && this._background.get_parent()) {
      this._background.get_parent().remove_child(this._background);
    }

    if (!this._blurEffect) {
      this._blurEffect = this._createEffect(1);
    }

    let background = new St.Widget({
      name: 'spotlightBlurredBackground',
      layout_manager: new Clutter.BinLayout(),
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    });

    this._mainContainer.insert_child_below(background, this._container);
    this._background = background;
    this._background.opacity = 0;
    this._background.visible = false;
  }

  _updateBlurredBackground() {
    this.desktop_background = this._desktopSettings.get_string('picture-uri');

    let uuid = GLib.get_user_name();
    this.desktop_background_blurred = `/tmp/mactop-spotlight-${uuid}-bg-blurred.jpg`;

    if (this.blur_background) {
      let cmd = `convert -scale 10% -blur 0x2.5 -resize 200% "${this.desktop_background}" ${this.desktop_background_blurred}`;
      try {
        trySpawnCommandLine(cmd);
      } catch (_e) {}
    }
  }

  _createEffect(idx) {
    let effect = null;
    switch (idx) {
      case 1:
        effect = new TintEffect({
          name: 'color',
          color: this.window_effect_color || [1, 1, 1, 1],
        });
        effect.preload(this._path);
        break;
      case 2:
        effect = new MonochromeEffect({
          name: 'color',
          color: this.window_effect_color || [1, 1, 1, 1],
        });
        effect.preload(this._path);
        break;
      case 3:
        effect = new BlurEffect({
          name: 'color',
          color: this.window_effect_color || [1, 1, 1, 1],
        });
        effect.preload(this._path);
        break;
    }
    return effect;
  }

  _updateWindowEffect() {
    this._container.remove_effect_by_name('window-effect');
    let effect = this._createEffect(this.window_effect);
    if (effect) {
      this._container.add_effect_with_name('window-effect', effect);
    }
    this._windowEffect = effect;
  }

  show() {
    if (Main.overview.visible || this._visible) return;

    if (this._animSeq) {
      this._hiTimer.cancel(this._animSeq);
      this._animSeq = null;
    }

    this._acquire_ui();

    this._updateCss();
    this._layout();

    global.compositor.disable_unredirect();

    this._mainContainer.show();
    this._container.show();
    this._add_events();

    this._animSeq = this._hiTimer.runOnce(() => {
      this._animSeq = null;
      this._layout();

      if (this.use_animations) {
        this._mainContainer.opacity = 0;
        this._mainContainer.scale_x = 0.9;
        this._mainContainer.scale_y = 0.9;
        this._mainContainer.translation_x = (this._width * 0.1) / 2;
        this._mainContainer.translation_y = (this._height * 0.1) / 2;
        this._mainContainer.ease({
          opacity: 255,
          scale_x: 1.0,
          scale_y: 1.0,
          translation_x: 0,
          translation_y: 0,
          duration: this.animation_speed,
          mode: Clutter.AnimationMode.EASE_OUT,
        });
      } else {
        this._mainContainer.scale_x = 1.0;
        this._mainContainer.scale_y = 1.0;
        this._mainContainer.opacity = 255;
      }
    }, 100);

    this._visible = true;
  }

  hide() {
    if (this._isDraggingIcon()) return;

    this._release_ui();
    this._remove_events();

    if (this.use_animations) {
      this._mainContainer.ease({
        opacity: 0,
        scale_x: 0.9,
        scale_y: 0.9,
        translation_x: (this._width * 0.1) / 2,
        translation_y: (this._height * 0.1) / 2,
        duration: this.animation_speed,
        mode: Clutter.AnimationMode.EASE_OUT,
        onComplete: () => {
          this._visible = false;
          this._mainContainer.hide();
          global.compositor.enable_unredirect();
        },
      });
    } else {
      this._mainContainer.opacity = 0;
      this._visible = false;
      this._mainContainer.hide();
      global.compositor.enable_unredirect();
    }
  }

  toggle() {
    if (this._inOverview) return;
    if (!this._visible) {
      this.show();
      if (this._entry) {
        global.stage.set_key_focus(this._entry);
      }
    } else {
      global.stage.set_key_focus(null);
    }
  }

  _isDraggingIcon() {
    let result = false;
    try {
      if (this._searchResults) {
        let grid =
          this._searchResults._content.first_child.first_child.child.child;
        if (grid.style_class == 'grid-search-results') {
          grid.get_children().forEach((c) => {
            if (
              c._draggable &&
              c._draggable._dragState == 1
            ) {
              result = true;
            }
          });
        }
      }
    } catch (_e) {}
    return result;
  }

  _acquire_ui() {
    if (this._entry) return;

    if (!Main.overview._toggle) {
      Main.overview._toggle = Main.overview.toggle;
    }
    Main.overview.toggle = () => {
      if (this._search && this._search.visible) {
        this._search._text.get_parent().grab_key_focus();
      }
    };
    if (!Main.overview._hide) {
      Main.overview._hide = Main.overview.hide;
    }
    Main.overview.hide = () => {
      this._mainContainer.opacity = 0;
      Main.overview._hide();
    };

    this._queryDisplay();

    this._scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    this._entry = Main.overview.searchEntry;
    this._entryParent = this._entry.get_parent();
    this._entry.add_style_class_name('slc');

    this._search = Main.overview.searchController;
    this._search.hide();
    this._searchResults = this._search._searchResults;
    this._searchParent = this._search.get_parent();

    if (!this._searchResults._activateDefault) {
      this._searchResults._activateDefault =
        this._searchResults.activateDefault;
    }
    this._searchResults.activateDefault = () => {
      this._mainContainer.opacity = 0;
      this._searchResults._activateDefault();
    };

    if (this._entry.get_parent()) {
      this._entry.get_parent().remove_child(this._entry);
    }
    this._container.add_child(this._entry);

    if (this._search.get_parent()) {
      this._search.get_parent().remove_child(this._search);
    }
    this._container.add_child(this._search);

    if (!this._search.__searchCancelled) {
      this._search.__searchCancelled = this._search._searchCancelled;
      this._search._searchCancelled = () => {};
    }

    this._search._text.get_parent().grab_key_focus();
    this._textChangedEventId = this._search._text.connect(
      'text-changed',
      () => {
        this._container.set_size(this._width, this._height);
        this._mainContainer.set_size(this._width, this._height);
        this._search.show();
      },
    );

    this._resultsChangedId = this._searchResults?.connect('children-changed', () => {
      this._layout();
    }) ?? 0;
  }

  _release_ui() {
    if (this._resultsChangedId && this._searchResults) {
      this._searchResults.disconnect(this._resultsChangedId);
      this._resultsChangedId = 0;
    }

    if (this._entry) {
      this._entry.remove_style_class_name('slc');
      if (this._entry.get_parent()) {
        this._entry.get_parent().remove_child(this._entry);
      }
      this._entryParent?.add_child(this._entry);
      this._entry = null;
    }

    if (this._search) {
      this._removeProviders();
      this._search.hide();
      if (this._textChangedEventId) {
        this._search._text.disconnect(this._textChangedEventId);
        this._textChangedEventId = null;
      }
      if (this._search.__searchCancelled) {
        this._search._searchCancelled = this._search.__searchCancelled;
        this._search.__searchCancelled = null;
      }
      if (this._search.get_parent()) {
        this._search.get_parent().remove_child(this._search);
      }
      this._searchParent?.add_child(this._search);
      this._search = null;

      if (this._searchResults?._activateDefault) {
        this._searchResults.activateDefault =
          this._searchResults._activateDefault;
        this._searchResults._activateDefault = null;
      }
    }

    if (Main.overview._toggle) {
      Main.overview.toggle = Main.overview._toggle;
      Main.overview._toggle = null;
    }
    if (Main.overview._hide) {
      Main.overview.hide = Main.overview._hide;
      Main.overview._hide = null;
    }
  }

  _queryDisplay() {
    let idx = this.preferred_monitor || 0;
    if (idx == 0) {
      idx = Main.layoutManager.primaryIndex;
    } else if (idx == Main.layoutManager.primaryIndex) {
      idx = 0;
    }
    this.monitor =
      Main.layoutManager.monitors[idx] || Main.layoutManager.primaryMonitor;

    if (this.popup_at_cursor_monitor) {
      let pointer = global.get_pointer();
      Main.layoutManager.monitors.forEach((m) => {
        if (
          pointer[0] >= m.x &&
          pointer[0] <= m.x + m.width &&
          pointer[1] >= m.y &&
          pointer[1] <= m.y + m.height
        ) {
          this.monitor = m;
        }
      });
    }

    this._sw = this.monitor.width;
    this._sh = this.monitor.height;
  }

  _layout() {
    this._queryDisplay();
    if (!this.monitor) return;

    this._width =
      600 + ((this._sw * this._scaleFactor) / 2) * (this.scale_width || 0);
    this._height =
      400 + ((this._sh * this._scaleFactor) / 2) * (this.scale_height || 0);

    this._initial_height = this._entry.height + 4 * this._scaleFactor;

    let x = this.monitor.x + this._sw / 2 - this._width / 2;
    let y = this.monitor.y + this._sh / 2 - this._height / 2;
    this._visible = true;

    this._container.set_size(this._width, this._initial_height);
    this._mainContainer.set_size(this._width, this._initial_height);
    this._mainContainer.set_position(x, y);

    if (this._background) {
      let padding = 0;
      this._background.set_position(padding, padding);
      this._background.set_size(
        this.monitor.width - padding * 2,
        this.monitor.height - padding * 2,
      );
    }
  }

  _themeDefaults() {
    // Glassmorphism presets. Each value is [r, g, b, a] in 0.0-1.0.
    // Dark: deep translucent panel, light text. Light: frosted white, dark text.
    if (this.theme === 'light') {
      return {
        background: [0.95, 0.95, 0.97, 0.72],
        text: [0.05, 0.05, 0.06, 1.0],
        panelIcon: [0.05, 0.05, 0.06, 1.0],
      };
    }
    return {
      background: [0.05, 0.05, 0.07, 0.55],
      text: [1.0, 1.0, 1.0, 1.0],
      panelIcon: [1.0, 1.0, 1.0, 1.0],
    };
  }

  _themeColor(prop, fallback) {
    // User-set value (alpha > 0) always wins; otherwise use theme preset.
    let v = this[prop];
    if (v && v[3] > 0) return v;
    return this._themeDefaults()[fallback];
  }

  _updateCss() {
    let bg = this._themeColor('background_color', 'background');
    let textColor = this._themeColor('text_color', 'text');
    let panelIconColor = this._themeColor('panel_icon_color', 'panelIcon');
    let isLight = this.theme === 'light';

    if (isLight) {
      this._container.add_style_class_name('light');
    } else {
      this._container.remove_style_class_name('light');
    }

    this._background.remove_effect_by_name('blur');
    if (this._blurEffect && this.blur_background) {
      this._background.add_effect_with_name('blur', this._blurEffect);
      this._blurEffect.color = bg;
    }

    this._background.visible = true;
    this._background.opacity = 200;

    let styles = [];
    {
      let ss = [];

      if (!this.blur_background) {
        let clr = this._style.rgba(bg);
        ss.push(`\n  background: rgba(${clr});`);
      }

      if (this.border_thickness) {
        let clr = this._style.rgba(this.border_color);
        ss.push(`\n  border: ${this.border_thickness}px solid rgba(${clr});`);
      }

      styles.push(`#spotlightSearch {${ss.join(' ')}}`);
      styles.push(`#spotlightBlurredBackground {${ss.join(' ')}}`);
    }

    if (
      this.blur_background &&
      this.desktop_background_blurred &&
      this.monitor
    ) {
      let sw = this.monitor.width;
      let sh = this.monitor.height;
      let ss = [];
      ss.push(
        `\n background-image: url("${this.desktop_background_blurred}");`,
      );
      ss.push(`\n background-size: ${sw}px ${sh}px;`);
      ss.push(`\n background-position: top center;`);
      this._background.style = ss.join(' ');
    } else {
      this._background.style = '';
    }

    {
      if (this.border_radius !== null) {
        let r = BORDER_RADIUS_OPTIONS[Math.floor(this.border_radius)];
        if (r) {
          let st = `StBoxLayout.search-section-content { border-radius: ${r}px !important; }`;
          st = '#spotlightBlurredBackgroundImage,\n' + st;
          st = '#spotlightBlurredBackground,\n' + st;
          st = '#spotlightBox,\n' + st;
          st = '#spotlightSearch,\n' + st;
          styles.push(st);
        }
      }
    }

    if (this.font_size !== null) {
      let f = FONT_SIZE_OPTIONS[this.font_size];
      if (f) {
        styles.push(`#spotlightBox * { font-size: ${f}pt !important; }`);
      }
      f = FONT_SIZE_OPTIONS[this.entry_font_size];
      if (f) {
        styles.push(
          `#spotlightBox > StEntry, #spotlightBox > StEntry:focus { font-size: ${f}pt !important; }`,
        );
      }
    }

    let clr = this._style.rgba(textColor);
    if (textColor[3] > 0) {
      styles.push(`#spotlightBox * { color: rgba(${clr}) !important }`);
    }

    {
      let ss = [];
      {
        let clr = this._style.rgba(panelIconColor);
        if (panelIconColor[3] > 0) {
          ss.push(`\n  color: rgba(${clr}) !important;`);
        }
      }
      // Scoped to the spotlight indicator's own icon — never touch the global
      // .system-status-icon class, which recolors every native top-bar icon.
      styles.push(`.mactop-spotlight-icon {${ss.join(' ')}}`);
    }

    this._style?.build('mactop-spotlight', styles);
  }

  _removeProviders() {
    if (!this._providers) return;
    let _search = Main.overview.searchController;
    if (!_search) return;
    if (_search.removeProvider) {
      this._providers.forEach((p) => {
        _search.removeProvider(p);
      });
    }
    this._providers = null;
  }

  _add_events() {
    global.stage.connectObject(
      'notify::key-focus',
      this._onKeyFocusChanged.bind(this),
      'key-press-event',
      this._onKeyPressed.bind(this),
      this,
    );

    global.display.connectObject(
      'notify::focus-window',
      this._onFocusWindow.bind(this),
      'in-fullscreen-changed',
      this._onFullScreen.bind(this),
      this,
    );
  }

  _remove_events() {
    global.display.disconnectObject(this);
    global.stage.disconnectObject(this);
  }

  _onKeyFocusChanged() {
    if (!this._entry) return;
    let focus = global.stage.get_key_focus();
    let appearFocused =
      focus && (this._entry.contains(focus) || this._searchResults?.contains(focus));

    if (!appearFocused) {
      if (
        focus &&
        focus.style_class &&
        focus.style_class.includes('popup-menu')
      ) {
        this._lastPopup = focus;
        this._hidePopups();
      }

      this.hide();
    }

    if (focus && focus.activate) {
      if (!focus._activate) {
        focus._activate = focus.activate;
        focus.activate = () => {
          this._mainContainer.opacity = 0;
          focus._activate();
        };
      }
    }
  }

  _onKeyPressed(_obj, evt) {
    if (!this._entry) return;
    let focus = global.stage.get_key_focus();
    if (!focus || !this._entry.contains(focus)) {
      if (evt.get_key_symbol() === Clutter.KEY_Escape) {
        this.hide();
        return Clutter.EVENT_STOP;
      }
      this._search?._text.get_parent().grab_key_focus();
    }
    return Clutter.EVENT_STOP;
  }

  _onFocusWindow() {}

  _onFullScreen() {
    this.hide();
  }

  _hidePopups() {
    let popup = this._lastPopup;
    this._lastPopup = null;
    try {
      if (!popup.close && popup._getTopMenu()) {
        popup = popup._getTopMenu();
      }
      popup.opacity = 0;
      this._hiTimer.runSequence([
        {
          func: () => {
            popup.opacity = 0;
          },
          delay: 0,
        },
        {
          func: () => {
            popup._delegate.close(false);
          },
          delay: 250,
        },
      ]);
    } catch (_e) {}
  }
}
