import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

export default class MacTopPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.mactop');

        // --- General page ---
        const generalPage = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-other-symbolic',
        });
        window.add(generalPage);

        // Indicator group
        const indicatorGroup = new Adw.PreferencesGroup({
            title: 'Indicator',
        });
        generalPage.add(indicatorGroup);

        const indicatorRow = new Adw.SwitchRow({
            title: 'Show panel indicator',
            subtitle: 'Show the MacTop indicator in the top panel.',
        });
        settings.bind('show-indicator', indicatorRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        indicatorGroup.add(indicatorRow);

        // Appearance group
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
        });
        generalPage.add(appearanceGroup);

        const iconRow = new Adw.EntryRow({
            title: 'System Menu Icon',
        });
        const currentIcon = settings.get_string('menu-icon');
        iconRow.set_text(currentIcon);
        iconRow.connect('changed', () => {
            settings.set_string('menu-icon', iconRow.get_text());
        });
        appearanceGroup.add(iconRow);

        const iconHelpRow = new Adw.ActionRow({
            title: 'Leave empty to auto-detect distro icon',
            subtitle: 'Accepts: icon name (e.g. debian-logo, ubuntu-logo), emoji, or text.',
            activatable: false,
        });
        appearanceGroup.add(iconHelpRow);

        // --- Blacklist page ---
        const blacklistPage = new Adw.PreferencesPage({
            title: 'Blacklist',
            icon_name: 'dialog-cancel-symbolic',
        });
        window.add(blacklistPage);

        const blacklistGroup = new Adw.PreferencesGroup({
            title: 'App Blacklist',
            description: 'Applications matching these names, IDs, or WM classes will not appear in the menu bar.',
        });
        blacklistPage.add(blacklistGroup);

        // List box for blacklist entries
        const listStore = new Gtk.StringList();
        const currentBlacklist = settings.get_strv('app-blacklist');
        currentBlacklist.forEach(item => listStore.append(item));

        const blacklistBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
        });

        const listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
        });
        blacklistBox.append(listBox);

        // Populate list
        const updateList = () => {
            // Clear existing rows
            while (listBox.get_first_child()) {
                listBox.remove(listBox.get_first_child());
            }

            const items = settings.get_strv('app-blacklist');
            items.forEach((item, index) => {
                const row = new Adw.ActionRow({
                    title: item,
                });

                const removeBtn = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    css_classes: ['flat', 'destructive-action'],
                    valign: Gtk.Align.CENTER,
                });
                removeBtn.connect('clicked', () => {
                    const current = settings.get_strv('app-blacklist');
                    current.splice(index, 1);
                    settings.set_strv('app-blacklist', current);
                    updateList();
                });
                row.add_suffix(removeBtn);
                listBox.append(row);
            });
        };

        updateList();

        // Add entry row
        const addBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            margin_top: 12,
        });

        const entry = new Gtk.Entry({
            hexpand: true,
            placeholder_text: 'App name, ID, or WM class...',
        });
        addBox.append(entry);

        const addBtn = new Gtk.Button({
            label: 'Add',
            css_classes: ['suggested-action'],
        });
        addBtn.connect('clicked', () => {
            const text = entry.get_text().trim();
            if (!text) return;
            const current = settings.get_strv('app-blacklist');
            if (!current.includes(text)) {
                current.push(text);
                settings.set_strv('app-blacklist', current);
                updateList();
            }
            entry.set_text('');
        });
        addBox.append(addBtn);

        // Connect entry activation
        entry.connect('activate', () => addBtn.emit('clicked'));

        blacklistBox.append(addBox);
        blacklistGroup.add(blacklistBox);
    }
}
