import GLib from 'gi://GLib';

const NAUTILUS_PREFS = 'org.gnome.nautilus.preferences';

function gsettingsSet(schema, key, value) {
    try {
        GLib.spawn_command_line_async(`gsettings set ${schema} ${key} "${value}"`);
    } catch (e) {
        console.error(`[mactop] gsettings error: ${e}`);
    }
}

function gsettingsToggle(schema, key) {
    try {
        GLib.spawn_command_line_async(`gsettings set ${schema} ${key} !$(gsettings get ${schema} ${key})`);
    } catch (e) {
        console.error(`[mactop] gsettings error: ${e}`);
    }
}

export const viewActions = {
    'nautilus-icon-view': () => gsettingsSet(NAUTILUS_PREFS, 'default-folder-viewer', 'icon-view'),
    'nautilus-list-view': () => gsettingsSet(NAUTILUS_PREFS, 'default-folder-viewer', 'list-view'),
    'nautilus-sort-name': () => gsettingsSet(NAUTILUS_PREFS, 'default-sort-order', 'name'),
    'nautilus-sort-date': () => gsettingsSet(NAUTILUS_PREFS, 'default-sort-order', 'mtime'),
    'nautilus-sort-size': () => gsettingsSet(NAUTILUS_PREFS, 'default-sort-order', 'size'),
    'nautilus-sort-type': () => gsettingsSet(NAUTILUS_PREFS, 'default-sort-order', 'type'),
    'nautilus-reverse-sort': () => gsettingsToggle(NAUTILUS_PREFS, 'default-sort-in-reverse-order'),
    'nautilus-toggle-path-bar': () => gsettingsToggle(NAUTILUS_PREFS, 'always-use-location-entry'),
    'nautilus-toggle-hidden': () => gsettingsToggle(NAUTILUS_PREFS, 'show-hidden-files'),
};
