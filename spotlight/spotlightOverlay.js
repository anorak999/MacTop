// Ported from search-light (GPL-3.0) with permission consideration.
// Spotlight overlay widget - search entry + results with optional blur/tint background.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { Timer } from './timer.js';
import { Style } from './style.js';
import { TintEffect } from './effects/tint_effect.js';

/**
 * Main overlay container for spotlight search.
 */
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

export class SpotlightOverlay {
    constructor(extension) {
        this._extension = extension;
        this._settings = extension._settings;
        this._visible = false;
        this._inOverview = false;
        this._hiTimer = null;
        this._loTimer = null;
        this._style = null;
        this._mainContainer = null;
        this._container = null;
        this._background = null;
        this._entry = null;
        this._search = null;
        this._searchResults = null;
        this._entryParent = null;
        this._searchParent = null;
        this._textChangedEventId = null;
        this._animSeq = null;
    }

    enable() {
        this._style = new Style();

        this._hiTimer = new Timer('spotlight-hi-res');
        this._hiTimer.initialize(15);

        this._loTimer = new Timer('spotlight-lo-res');
        this._loTimer.initialize(750);

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

        this._mainContainer.add_child(this._container);

        this._setupBackground();

        Main.layoutManager.addChrome(this._mainContainer, {
            affectsStruts: false,
            trackFullscreen: false,
        });
        this._mainContainer.hide();

        Main.overview.connectObject(
            'overview-showing', () => { this._inOverview = true; },
            'overview-hidden', () => { this._inOverview = false; },
            this,
        );

        Shell.AppSystem.get_default().connectObject(
            'app-state-changed', () => {
                if (this._visible) this._mainContainer.opacity = 0;
            },
            this,
        );

        global.display.connectObject(
            'window-created', () => {
                if (this._visible) this._mainContainer.opacity = 0;
            },
            this,
        );

        this._updateCss();
    }

    disable() {
        if (this._hiTimer) {
            this._hiTimer.shutdown();
            this._hiTimer = null;
        }
        if (this._loTimer) {
            this._loTimer.shutdown();
            this._loTimer = null;
        }

        if (this._mainContainer) {
            if (this._mainContainer.get_parent()) {
                this._mainContainer.get_parent().remove_child(this._mainContainer);
            }
            this._mainContainer = null;
        }

        if (this._style) {
            this._style.unloadAll();
            this._style = null;
        }

        Main.overview.disconnectObject(this);
        Shell.AppSystem.get_default().disconnectObject(this);
        global.display.disconnectObject(this);

        this._release_ui();
    }

    _setupBackground() {
        if (this._background && this._background.get_parent()) {
            this._background.get_parent().remove_child(this._background);
        }

        this._background = new St.Widget({
            name: 'spotlightBackground',
            layout_manager: new Clutter.BinLayout(),
            x: 0, y: 0, width: 20, height: 20,
        });
        this._mainContainer.insert_child_below(this._background, this._container);
        this._background.opacity = 0;
        this._background.visible = false;
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

            if (this._settings?.get_boolean('spotlight-use-animations')) {
                this._mainContainer.opacity = 0;
                this._mainContainer.scale_x = 0.9;
                this._mainContainer.scale_y = 0.9;
                this._mainContainer.ease({
                    opacity: 255,
                    scale_x: 1.0,
                    scale_y: 1.0,
                    duration: 100,
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
        if (!this._visible) return;

        this._release_ui();
        this._remove_events();

        if (this._settings?.get_boolean('spotlight-use-animations')) {
            this._mainContainer.ease({
                opacity: 0,
                scale_x: 0.9,
                scale_y: 0.9,
                duration: 100,
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
            if (this._entry) global.stage.set_key_focus(this._entry);
        } else {
            global.stage.set_key_focus(null);
        }
    }

    _acquire_ui() {
        if (this._entry) return;

        if (!Main.overview._toggle) Main.overview._toggle = Main.overview.toggle;
        Main.overview.toggle = () => {
            if (this._search?.visible) this._search._text.get_parent().grab_key_focus();
        };

        if (!Main.overview._hide) Main.overview._hide = Main.overview.hide;
        Main.overview.hide = () => {
            this._mainContainer.opacity = 0;
            Main.overview._hide();
        };

        this._queryDisplay();

        this._scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

        this._entry = Main.overview.searchEntry;
        this._entryParent = this._entry.get_parent();
        this._entry.add_style_class_name('spotlight');

        this._search = Main.overview.searchController;
        this._search.hide();
        this._searchResults = this._search._searchResults;
        this._searchParent = this._search.get_parent();

        if (!this._searchResults._activateDefault) {
            this._searchResults._activateDefault = this._searchResults.activateDefault;
        }
        this._searchResults.activateDefault = () => {
            this._mainContainer.opacity = 0;
            this._searchResults._activateDefault();
        };

        if (this._entry.get_parent()) this._entry.get_parent().remove_child(this._entry);
        this._container.add_child(this._entry);

        if (this._search.get_parent()) this._search.get_parent().remove_child(this._search);
        this._container.add_child(this._search);

        if (!this._search.__searchCancelled) {
            this._search.__searchCancelled = this._search._searchCancelled;
            this._search._searchCancelled = () => {};
        }

        this._search._text.get_parent().grab_key_focus();
        this._textChangedEventId = this._search._text.connect('text-changed', () => {
            this._container.set_size(this._width, this._height);
            this._mainContainer.set_size(this._width, this._height);
            this._search.show();
        });

        this._search._text.get_parent().grab_key_focus();
    }

    _release_ui() {
        if (this._entry) {
            if (this._entry.get_parent()) this._entry.get_parent().remove_child(this._entry);
            this._entryParent?.add_child(this._entry);
            this._entry = null;
        }

        if (this._search) {
            this._search.hide();
            if (this._textChangedEventId) {
                this._search._text.disconnect(this._textChangedEventId);
                this._textChangedEventId = null;
            }
            if (this._search.__searchCancelled) {
                this._search._searchCancelled = this._search.__searchCancelled;
                this._search.__searchCancelled = null;
            }
            if (this._search.get_parent()) this._search.get_parent().remove_child(this._search);
            this._searchParent?.add_child(this._search);
            this._search = null;

            if (this._searchResults?._activateDefault) {
                this._searchResults.activateDefault = this._searchResults._activateDefault;
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
        let pointer = global.get_pointer();
        this._monitor = Main.layoutManager.primaryMonitor;
        Main.layoutManager.monitors.forEach(m => {
            if (pointer[0] >= m.x && pointer[0] <= m.x + m.width &&
                pointer[1] >= m.y && pointer[1] <= m.y + m.height) {
                this._monitor = m;
            }
        });
        this._sw = this._monitor.width;
        this._sh = this._monitor.height;
    }

    _layout() {
        this._queryDisplay();
        if (!this._monitor) return;

        this._width = Math.min(600, this._sw * 0.8);
        this._height = Math.min(500, this._sh * 0.7);

        let x = this._monitor.x + this._sw / 2 - this._width / 2;
        let y = this._monitor.y + this._sh / 2 - this._height / 2;

        this._container.set_size(this._width, this._height);
        this._mainContainer.set_size(this._width, this._height);
        this._mainContainer.set_position(x, y);

        if (this._background) {
            this._background.set_position(0, 0);
            this._background.set_size(this._sw, this._sh);
        }
    }

    _updateCss() {
        let bgColor = this._settings?.get_string('spotlight-background-color') || 'rgba(0,0,0,0.8)';
        let iconColor = this._settings?.get_string('spotlight-panel-icon-color') || 'rgba(255,255,255,1)';

        let styles = [
            `#spotlightSearch { background: ${bgColor}; border-radius: 12px; }`,
            `#spotlightBox { padding: 20px; }`,
            `.spotlight > * { font-size: 16pt; }`,
            `.panel-status-indicator-icon { color: ${iconColor}; }`,
        ];

        this._style?.build('mactop-spotlight', styles);
    }

    _add_events() {
        global.stage.connectObject(
            'notify::key-focus', this._onKeyFocusChanged.bind(this),
            'key-press-event', this._onKeyPressed.bind(this),
            this,
        );
    }

    _remove_events() {
        global.stage.disconnectObject(this);
    }

    _onKeyFocusChanged() {
        if (!this._entry) return;
        let focus = global.stage.get_key_focus();
        let appearFocused = focus && (this._entry.contains(focus) || this._searchResults?.contains(focus));
        if (!appearFocused) this.hide();
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
}
