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
        this._style = null;
        this._mainContainer = null;
        this._container = null;
        this._entry = null;
        this._search = null;
        this._searchResults = null;
        this._entryParent = null;
        this._searchParent = null;
        this._textChangedEventId = null;
        this._animSeq = null;
        this._blurEffect = null;
        this._divider = null;
        this._suggestionRow = null;
        this._resultsChangedId = 0;
    }

    enable() {
        this._style = new Style();

        this._hiTimer = new Timer('spotlight-hi-res');
        this._hiTimer.initialize(15);

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

        this._setupBlurEffect();

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

        this._themeChangedId = this._settings?.connect('changed::spotlight-theme', () => {
            this._updateCss();
        });

        this._updateCss();
    }

    disable() {
        if (this._hiTimer) {
            this._hiTimer.shutdown();
            this._hiTimer = null;
        }

        if (this._blurEffect && this._mainContainer) {
            this._mainContainer.remove_effect(this._blurEffect);
            this._blurEffect = null;
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

        if (this._themeChangedId && this._settings) {
            this._settings.disconnect(this._themeChangedId);
            this._themeChangedId = null;
        }

        this._release_ui();
    }

    _setupBlurEffect() {
        if (this._blurEffect) {
            this._mainContainer.remove_effect(this._blurEffect);
            this._blurEffect = null;
        }
        try {
            this._blurEffect = new Shell.BlurEffect({
                sigma: 40,
                mode: Shell.BlurMode.BACKDROP,
            });
            this._mainContainer.add_effect(this._blurEffect);
        } catch (_e) {
            this._blurEffect = null;
        }
    }

    _setupSuggestionRow() {
        if (this._suggestionWrapper) return;

        this._suggestionWrapper = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_expand: true,
            style_class: 'spotlight-suggestion-wrapper'
        });

        // 1. Categories Row
        this._categoryRow = new St.BoxLayout({
            style_class: 'spotlight-category-row',
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
        });

        let catScroll = new St.ScrollView({
            vscrollbar_policy: St.PolicyType.NEVER,
            hscrollbar_policy: St.PolicyType.NEVER,
            style_class: 'spotlight-category-scroll',
            x_expand: true,
        });
        catScroll.add_actor(this._categoryRow);

        let categories = ['Utilities', 'Social', 'Productivity & Finance', 'Photo & Video', 'Health & Fitness', 'Information'];
        for (let cat of categories) {
            let btn = new St.Button({
                label: cat,
                style_class: 'spotlight-category-pill',
            });
            this._categoryRow.add_child(btn);
        }
        
        this._suggestionWrapper.add_child(catScroll);

        // 2. Apps Grid
        this._appGrid = new Clutter.FlowLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            homogeneous: true,
            column_spacing: 16,
            row_spacing: 24,
        });

        let gridWidget = new St.Widget({
            layout_manager: this._appGrid,
            style_class: 'spotlight-app-grid',
            x_expand: true,
            y_expand: true,
        });
        
        // Populate apps
        const appSys = Shell.AppSystem.get_default();
        let apps = appSys.get_running().concat(appSys.get_installed());
        // Simple distinct
        apps = apps.filter((v, i, a) => a.findIndex(app => app.get_id() === v.get_id()) === i);
        
        let count = 0;
        for (let i = 0; i < apps.length && count < 25; i++) {
            const app = apps[i];
            if (!app || !app.get_id()) continue;
            
            let icon = app.create_icon_texture(64);
            if (!icon) continue;

            let name = app.get_name();
            
            let btn = new St.Button({
                style_class: 'spotlight-app-btn',
                x_expand: true,
                y_expand: true,
            });

            let box = new St.BoxLayout({
                orientation: Clutter.Orientation.VERTICAL,
                x_align: Clutter.ActorAlign.CENTER,
            });
            
            box.add_child(icon);
            
            let label = new St.Label({
                text: name,
                style_class: 'spotlight-app-label',
            });
            // Approximate ellipsize for Clutter.Text (using internal actor if needed, but styling usually handles this)
            
            box.add_child(label);
            btn.set_child(box);
            
            btn.connect('clicked', () => {
                app.open_new_window(-1);
                this.hide();
            });
            
            gridWidget.add_child(btn);
            count++;
        }

        let gridScroll = new St.ScrollView({
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            hscrollbar_policy: St.PolicyType.NEVER,
            style_class: 'spotlight-grid-scroll',
            x_expand: true,
            y_expand: true,
        });
        gridScroll.add_actor(gridWidget);

        this._suggestionWrapper.add_child(gridScroll);
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
            this.hide();
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

        this._headerContainer = new St.BoxLayout({
            style_class: 'spotlight-header-container',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        if (this._entry.get_parent()) this._entry.get_parent().remove_child(this._entry);
        this._entry.x_expand = true;
        this._headerContainer.add_child(this._entry);

        this._moreButton = new St.Button({
            style_class: 'spotlight-more-button',
            child: new St.Icon({
                icon_name: 'view-more-symbolic',
                icon_size: 20
            }),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._headerContainer.add_child(this._moreButton);

        this._container.add_child(this._headerContainer);

        // Add divider between entry and results
        if (!this._divider) {
            this._divider = new St.Widget({
                style: 'height: 1px; background-color: rgba(0,0,0,0.08); margin: 4px 0;',
                x_expand: true,
            });
        }
        if (this._divider.get_parent()) this._divider.get_parent().remove_child(this._divider);
        this._container.add_child(this._divider);

        this._setupSuggestionRow();
        if (this._suggestionWrapper.get_parent()) this._suggestionWrapper.get_parent().remove_child(this._suggestionWrapper);
        this._container.add_child(this._suggestionWrapper);

        if (this._search.get_parent()) this._search.get_parent().remove_child(this._search);
        this._container.add_child(this._search);

        if (!this._search.__searchCancelled) {
            this._search.__searchCancelled = this._search._searchCancelled;
            this._search._searchCancelled = () => {};
        }

        this._search._text.get_parent().grab_key_focus();
        this._textChangedEventId = this._search._text.connect('text-changed', () => {
            const hasText = this._search._text.get_text().length > 0;
            if (this._suggestionWrapper) {
                this._suggestionWrapper.visible = !hasText;
            }
            this._search.show();
            this._layout();
        });

        this._resultsChangedId = this._searchResults?.connect('children-changed', () => {
            this._layout();
        }) ?? 0;
    }

    _release_ui() {
        if (this._divider && this._divider.get_parent()) {
            this._divider.get_parent().remove_child(this._divider);
        }

        if (this._suggestionWrapper && this._suggestionWrapper.get_parent()) {
            this._suggestionWrapper.get_parent().remove_child(this._suggestionWrapper);
        }

        if (this._resultsChangedId && this._searchResults) {
            this._searchResults.disconnect(this._resultsChangedId);
            this._resultsChangedId = 0;
        }

        if (this._entry) {
            if (this._entry.get_parent()) this._entry.get_parent().remove_child(this._entry);
            this._entryParent?.add_child(this._entry);
            this._entry = null;
        }

        if (this._headerContainer && this._headerContainer.get_parent()) {
            this._headerContainer.get_parent().remove_child(this._headerContainer);
            this._headerContainer = null;
            this._moreButton = null;
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

        // Count visible result children for dynamic height
        const resultChildren = this._searchResults?.get_children() ?? [];
        const nResults = resultChildren.filter(c => c.visible).length;
        const hasQuery = this._search?._text?.get_text()?.length > 0;
        const showSuggestions = !hasQuery && nResults === 0;

        // Narrower width for empty/suggestion state
        this._width = showSuggestions
            ? Math.min(840, this._sw * 0.65)
            : Math.min(720, this._sw * 0.55);

        const BAR_ONLY_HEIGHT = 70;
        const ROW_HEIGHT = 42;
        const SUGGESTION_HEIGHT = 580;
        const MAX_RESULTS_HEIGHT = 420;

        let extraHeight = 0;
        if (showSuggestions) {
            extraHeight = SUGGESTION_HEIGHT;
        } else if (nResults > 0) {
            extraHeight = Math.min(nResults * ROW_HEIGHT, MAX_RESULTS_HEIGHT);
        }
        this._height = BAR_ONLY_HEIGHT + extraHeight;

        // Toggle suggestion visibility
        if (this._suggestionWrapper) {
            this._suggestionWrapper.visible = showSuggestions;
        }

        let x = this._monitor.x + (this._sw - this._width) / 2;
        let y = this._monitor.y + this._sh * 0.30;

        const animate = this._settings?.get_boolean('spotlight-use-animations') && this._visible;

        if (animate) {
            this._container.ease({
                width: this._width,
                height: this._height,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_OUT,
            });
            this._mainContainer.ease({
                width: this._width,
                height: this._height,
                x: x,
                y: y,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_OUT,
            });
        } else {
            this._container.set_size(this._width, this._height);
            this._mainContainer.set_size(this._width, this._height);
            this._mainContainer.set_position(x, y);
        }

        // Show divider only when results are present (hide for suggestion state)
        if (this._divider) {
            this._divider.visible = nResults > 0;
        }
    }

    _updateCss() {
        let theme = this._settings?.get_string('spotlight-theme') || 'light';
        let isDark = theme === 'dark';

        let bgColor = isDark ? 'rgba(30, 30, 35, 0.85)' : 'rgba(230, 238, 255, 0.88)';
        let textColor = isDark ? '#eaeaea' : '#1a1a24';
        let subTextColor = isDark ? '#aaa' : '#666';
        let borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)';
        let hoverBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
        let pillBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.6)';
        let pillHoverBg = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)';
        let iconColor = isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(33, 33, 33, 1)';
        let moreBtnBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
        let moreBtnHoverBg = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
        let shadowColor = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)';

        let styles = [
            `#spotlightSearch { background: ${bgColor}; border-radius: 24px; border: 1px solid ${borderColor}; box-shadow: 0 12px 48px ${shadowColor}; }`,
            `#spotlightBox { padding: 16px 20px; }`,
            `.spotlight-header-container { spacing: 12px; margin-bottom: 4px; }`,
            `.spotlight-entry, .spotlight-entry .clutter-text { font-size: 20pt; color: ${textColor}; caret-color: ${textColor}; font-weight: 500; }`,
            `.spotlight-entry { background-color: transparent; border: none; box-shadow: none; }`,
            `.spotlight-entry:focus { background-color: transparent; box-shadow: none; }`,
            `.spotlight-more-button { border-radius: 99px; width: 32px; height: 32px; color: ${textColor}; background-color: ${moreBtnBg}; border: 1px solid ${borderColor}; padding: 5px; }`,
            `.spotlight-more-button:hover { background-color: ${moreBtnHoverBg}; }`,
            `.spotlight-result-name { color: ${textColor}; }`,
            `.spotlight-result-description { color: ${subTextColor}; }`,
            `.spotlight-result-item:hover, .spotlight-result-item:focus { background-color: ${hoverBg}; }`,
            `.spotlight-placeholder, .spotlight-error { color: ${subTextColor}; }`,
            `.spotlight-suggestion-wrapper { padding-top: 8px; }`,
            `.spotlight-category-row { spacing: 10px; padding: 4px 0 16px 0; }`,
            `.spotlight-category-pill { padding: 6px 16px; border-radius: 99px; background-color: ${pillBg}; color: ${textColor}; font-weight: 600; font-size: 11pt; border: 1px solid ${borderColor}; transition: background-color 0.2s; }`,
            `.spotlight-category-pill:hover { background-color: ${pillHoverBg}; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }`,
            `.spotlight-app-grid { padding: 8px 12px 24px 12px; }`,
            `.spotlight-app-btn { width: 110px; height: 130px; border-radius: 16px; transition: background-color 0.2s, scale 0.2s; }`,
            `.spotlight-app-btn:hover { background-color: ${hoverBg}; }`,
            `.spotlight-app-btn:active { background-color: ${hoverBg}; scale: 0.95; }`,
            `.spotlight-app-label { margin-top: 10px; text-align: center; font-size: 10.5pt; color: ${textColor}; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }`,
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
        if (evt.get_key_symbol() === Clutter.KEY_Escape) {
            this.hide();
            return Clutter.EVENT_STOP;
        }
        let focus = global.stage.get_key_focus();
        if (!focus || !this._entry.contains(focus)) {
            this._search?._text.get_parent().grab_key_focus();
        }
        return Clutter.EVENT_STOP;
    }
}
