import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk';

function loadIconsMetadata(sourcePath) {
  const filePath = GLib.build_filenamev([sourcePath, 'icons.json']);
  try {
    const file = Gio.File.new_for_path(filePath);
    const [, contents] = file.load_contents(null);
    const data = JSON.parse(new TextDecoder().decode(contents));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadMetadata(sourcePath) {
  const filePath = GLib.build_filenamev([sourcePath, 'metadata.json']);
  try {
    const file = Gio.File.new_for_path(filePath);
    const [, contents] = file.load_contents(null);
    return JSON.parse(new TextDecoder().decode(contents));
  } catch {
    return {};
  }
}

function _createLinkRow(title, url, subtitle) {
  const row = new Adw.ActionRow({
    title,
    subtitle,
    activatable: true,
  });
  row.add_suffix(new Gtk.Image({
    icon_name: 'external-link-symbolic',
  }));
  row.connect('activated', () => {
    Gtk.show_uri(row.get_root(), url, 0);
  });
  return row;
}

export default class MacTopPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.mactop');

        // Register extension icons/ directory so Gtk.Image can resolve
        // 'mactop-symbolic' and other extension-local icon names.
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        iconTheme.add_search_path(GLib.build_filenamev([this.path, 'icons']));

        if (window.set_search_enabled) window.set_search_enabled(true);

        // === General Page ===
        const generalPage = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-desktop-appearance-symbolic',
        });
        window.add(generalPage);

        const generalGroup = new Adw.PreferencesGroup();
        generalGroup.title = 'General';
        generalPage.add(generalGroup);

        // Show OS icon
        const showOsIconRow = new Adw.SwitchRow({
            title: 'Show OS icon',
            subtitle: 'Show the logo icon in the top panel.',
        });
        settings.bind('show-os-icon', showOsIconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(showOsIconRow);

        // Icon selector
        const icons = loadIconsMetadata(this.path);
        const iconTitles = new Gtk.StringList();
        icons.forEach(icon => iconTitles.append(icon.title));

        const deriveIconName = (path) => path.endsWith('.svg') ? path.slice(0, -4) : path;

        const iconRow = new Adw.ComboRow({
            title: 'Icon',
            model: iconTitles,
        });

        const iconMap = {};
        icons.forEach((icon, idx) => {
            iconMap[deriveIconName(icon.path)] = idx;
        });

        const currentIcon = settings.get_string('menu-icon');
        iconRow.selected = (currentIcon && iconMap[currentIcon] !== undefined) ? iconMap[currentIcon] : 0;

        iconRow.connect('notify::selected', () => {
            const selected = icons[iconRow.selected];
            if (selected) {
                settings.set_string('menu-icon', deriveIconName(selected.path));
            }
        });

        settings.connect('changed::menu-icon', () => {
            const name = settings.get_string('menu-icon');
            iconRow.selected = (iconMap[name] !== undefined) ? iconMap[name] : 0;
        });

        generalGroup.add(iconRow);

        // Lock to focused app
        const lockRow = new Adw.SwitchRow({
            title: 'Lock to focused app',
            subtitle: 'Only update menu when switching windows.',
        });
        settings.bind('lock-to-focused-app', lockRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        generalGroup.add(lockRow);

        // User Switcher group
        const userSwitcherGroup = new Adw.PreferencesGroup();
        userSwitcherGroup.title = 'User Switcher';
        generalPage.add(userSwitcherGroup);

        // Show user switcher
        const showUserSwitcherRow = new Adw.SwitchRow({
            title: 'Show User Switcher',
            subtitle: 'Show user switcher in the right side of the panel.',
        });
        settings.bind('show-user-switcher', showUserSwitcherRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        userSwitcherGroup.add(showUserSwitcherRow);

        // User switcher display mode
        const displayModeModel = new Gtk.StringList();
        displayModeModel.append('Icon');
        displayModeModel.append('Username');
        displayModeModel.append('Both');

        const displayModeRow = new Adw.ComboRow({
            title: 'User Switcher Display',
            subtitle: 'Show icon, username, or both in the panel button.',
            model: displayModeModel,
        });

        const displayModeMap = { 'icon': 0, 'username': 1, 'both': 2 };
        const reverseDisplayModeMap = ['icon', 'username', 'both'];

        const currentMode = settings.get_string('user-switcher-display-mode');
        displayModeRow.selected = displayModeMap[currentMode] ?? 0;

        displayModeRow.connect('notify::selected', () => {
            settings.set_string('user-switcher-display-mode', reverseDisplayModeMap[displayModeRow.selected]);
        });

        settings.connect('changed::user-switcher-display-mode', () => {
            const mode = settings.get_string('user-switcher-display-mode');
            displayModeRow.selected = displayModeMap[mode] ?? 0;
        });

        userSwitcherGroup.add(displayModeRow);

        // === Spotlight Page ===
        const spotlightPage = new Adw.PreferencesPage({
            title: 'Spotlight',
            icon_name: 'edit-find-symbolic',
        });
        window.add(spotlightPage);

        const spotlightGroup = new Adw.PreferencesGroup();
        spotlightGroup.title = 'Spotlight Search';
        spotlightPage.add(spotlightGroup);

        // Show panel icon
        const showSpotlightIconRow = new Adw.SwitchRow({
            title: 'Show Spotlight Panel Icon',
            subtitle: 'Show a search icon in the top panel to toggle Spotlight search.',
        });
        settings.bind('spotlight-show-panel-icon', showSpotlightIconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(showSpotlightIconRow);

        // Use animations
        const useAnimationsRow = new Adw.SwitchRow({
            title: 'Enable Animations',
            subtitle: 'Smooth open/close animations for the Spotlight overlay.',
        });
        settings.bind('spotlight-use-animations', useAnimationsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(useAnimationsRow);

        // Blur background
        const blurBackgroundRow = new Adw.SwitchRow({
            title: 'Blur Background',
            subtitle: 'Apply blurred background effect (requires imagemagick).',
        });
        settings.bind('spotlight-blur-background', blurBackgroundRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(blurBackgroundRow);

        // Keybinding
        const keybindingRow = new Adw.EntryRow({
            title: 'Keyboard Shortcut',
        });
        settings.bind('spotlight-keybinding', keybindingRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(keybindingRow);

        // Theme
        const themeModel = new Gtk.StringList();
        themeModel.append('Light');
        themeModel.append('Dark');

        const themeRow = new Adw.ComboRow({
            title: 'Theme',
            subtitle: 'Choose between Light and Dark glassmorphism.',
            model: themeModel,
        });

        const themeMap = { 'light': 0, 'dark': 1 };
        const reverseThemeMap = ['light', 'dark'];

        const currentTheme = settings.get_string('spotlight-theme');
        themeRow.selected = themeMap[currentTheme] ?? 0;

        themeRow.connect('notify::selected', () => {
            settings.set_string('spotlight-theme', reverseThemeMap[themeRow.selected]);
        });

        settings.connect('changed::spotlight-theme', () => {
            const theme = settings.get_string('spotlight-theme');
            themeRow.selected = themeMap[theme] ?? 0;
        });

        spotlightGroup.add(themeRow);

        // Animation speed
        const animSpeedRow = new Adw.SpinRow({
            title: 'Animation Speed (ms)',
            subtitle: 'Duration of open/close animations in milliseconds.',
            adjustment: new Gtk.Adjustment({
                lower: 50,
                upper: 500,
                step_increment: 10,
                page_increment: 50,
            }),
        });
        settings.bind('spotlight-animation-speed', animSpeedRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(animSpeedRow);

        // Scale width
        const scaleWidthRow = new Adw.SpinRow({
            title: 'Scale Width',
            subtitle: 'Width scaling factor for the overlay (0.0-1.0).',
            adjustment: new Gtk.Adjustment({
                lower: 0.0,
                upper: 1.0,
                step_increment: 0.05,
                page_increment: 0.1,
            }),
        });
        settings.bind('spotlight-scale-width', scaleWidthRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(scaleWidthRow);

        // Scale height
        const scaleHeightRow = new Adw.SpinRow({
            title: 'Scale Height',
            subtitle: 'Height scaling factor for the overlay (0.0-1.0).',
            adjustment: new Gtk.Adjustment({
                lower: 0.0,
                upper: 1.0,
                step_increment: 0.05,
                page_increment: 0.1,
            }),
        });
        settings.bind('spotlight-scale-height', scaleHeightRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(scaleHeightRow);

        // Border radius
        const borderRadiusRow = new Adw.SpinRow({
            title: 'Border Radius',
            subtitle: 'Border radius index (0=none, 7=32px).',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 7,
                step_increment: 1,
                page_increment: 1,
            }),
        });
        settings.bind('spotlight-border-radius', borderRadiusRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(borderRadiusRow);

        // Border thickness
        const borderThicknessRow = new Adw.SpinRow({
            title: 'Border Thickness (px)',
            subtitle: 'Border thickness in pixels (0=none).',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 4,
                step_increment: 1,
                page_increment: 1,
            }),
        });
        settings.bind('spotlight-border-thickness', borderThicknessRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(borderThicknessRow);

        // Font size
        const fontSizeModel = new Gtk.StringList();
        fontSizeModel.append('Auto');
        fontSizeModel.append('16pt');
        fontSizeModel.append('18pt');
        fontSizeModel.append('20pt');
        fontSizeModel.append('22pt');
        fontSizeModel.append('24pt');

        const fontSizeRow = new Adw.ComboRow({
            title: 'Font Size',
            subtitle: 'Font size for result text.',
            model: fontSizeModel,
        });
        settings.bind('spotlight-font-size', fontSizeRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(fontSizeRow);

        // Entry font size
        const entryFontSizeRow = new Adw.ComboRow({
            title: 'Entry Font Size',
            subtitle: 'Font size for the search entry.',
            model: fontSizeModel,
        });
        settings.bind('spotlight-entry-font-size', entryFontSizeRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(entryFontSizeRow);

        // Window effect
        const windowEffectModel = new Gtk.StringList();
        windowEffectModel.append('None');
        windowEffectModel.append('Tint');
        windowEffectModel.append('Monochrome');
        windowEffectModel.append('Blur');

        const windowEffectRow = new Adw.ComboRow({
            title: 'Window Effect',
            subtitle: 'Visual effect applied to the overlay background.',
            model: windowEffectModel,
        });
        settings.bind('spotlight-window-effect', windowEffectRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(windowEffectRow);

        // Preferred monitor
        const monitorModel = new Gtk.StringList();
        monitorModel.append('Auto (Primary)');
        monitorModel.append('Monitor 1');
        monitorModel.append('Monitor 2');

        const monitorRow = new Adw.ComboRow({
            title: 'Preferred Monitor',
            subtitle: 'Which monitor to show the overlay on.',
            model: monitorModel,
        });
        settings.bind('spotlight-preferred-monitor', monitorRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(monitorRow);

        // Popup at cursor monitor
        const popupAtCursorRow = new Adw.SwitchRow({
            title: 'Follow Cursor',
            subtitle: 'Show overlay on the monitor where the cursor is.',
        });
        settings.bind('spotlight-popup-at-cursor-monitor', popupAtCursorRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(popupAtCursorRow);

        // Blur sigma
        const blurSigmaRow = new Adw.SpinRow({
            title: 'Blur Sigma',
            subtitle: 'Blur radius for background blur effect.',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
            }),
        });
        settings.bind('spotlight-blur-sigma', blurSigmaRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(blurSigmaRow);

        // === About Page ===
        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });
        window.add(aboutPage);

        const aboutGroup = new Adw.PreferencesGroup();
        aboutPage.add(aboutGroup);

        const metadata = loadMetadata(this.path);
        const extName = metadata.name || 'MacTop';
        const extVersion = metadata.version || '?';

        // Logo + title header
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            margin_top: 24,
            margin_bottom: 12,
            spacing: 8,
        });

        const logo = new Gtk.Image({
            icon_name: 'mactop-symbolic',
            pixel_size: 96,
        });
        headerBox.append(logo);

        const titleLabel = new Gtk.Label({
            use_markup: true,
            label: `<span size="xx-large" weight="bold">${extName}</span>`,
        });
        headerBox.append(titleLabel);

        const versionLabel = new Gtk.Label({
            label: `Version ${extVersion}`,
        });
        headerBox.append(versionLabel);

        const descLabel = new Gtk.Label({
            label: metadata.description || '',
            wrap: true,
            justify: Gtk.Justification.CENTER,
        });
        headerBox.append(descLabel);

        aboutGroup.add(headerBox);

        // Links
        const linksGroup = new Adw.PreferencesGroup();
        linksGroup.title = 'Links';
        aboutPage.add(linksGroup);

        linksGroup.add(_createLinkRow(
            'Repository',
            metadata.url || 'https://github.com/anorak999/MacTop',
            'Source code and releases',
        ));

        linksGroup.add(_createLinkRow(
            'Report an Issue',
            (metadata.url || 'https://github.com/anorak999/MacTop') + '/issues',
            'Found a bug? Let us know.',
        ));
    }
}
