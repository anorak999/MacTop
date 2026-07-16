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

export default class MacTopPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.mactop');

        const page = new Adw.PreferencesPage();
        window.add(page);

        // General group
        const group = new Adw.PreferencesGroup();
        group.title = 'General';
        page.add(group);

        // Show OS icon
        const showOsIconRow = new Adw.SwitchRow({
            title: 'Show OS icon',
            subtitle: 'Show the logo icon in the top panel.',
        });
        settings.bind('show-os-icon', showOsIconRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(showOsIconRow);

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

        group.add(iconRow);

        // Lock to focused app
        const lockRow = new Adw.SwitchRow({
            title: 'Lock to focused app',
            subtitle: 'Only update menu when switching windows.',
        });
        settings.bind('lock-to-focused-app', lockRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(lockRow);

        // Show user switcher
        const showUserSwitcherRow = new Adw.SwitchRow({
            title: 'Show User Switcher',
            subtitle: 'Show user switcher in the right side of the panel.',
        });
        settings.bind('show-user-switcher', showUserSwitcherRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(showUserSwitcherRow);

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

        group.add(displayModeRow);

        // Spotlight group
        const spotlightGroup = new Adw.PreferencesGroup();
        spotlightGroup.title = 'Spotlight Search';
        page.add(spotlightGroup);

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
    }
}
