import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';

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

        // Background color
        const bgColorRow = new Adw.EntryRow({
            title: 'Background Color (CSS rgba)',
        });
        settings.bind('spotlight-background-color', bgColorRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(bgColorRow);

        // Panel icon color
        const iconColorRow = new Adw.EntryRow({
            title: 'Panel Icon Color (CSS rgba)',
        });
        settings.bind('spotlight-panel-icon-color', iconColorRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        spotlightGroup.add(iconColorRow);

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
