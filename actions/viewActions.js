import Gio from 'gi://Gio';

const NAUTILUS_PREFS = 'org.gnome.nautilus.preferences';
const _settings = new Gio.Settings({ schema_id: NAUTILUS_PREFS });

function gsettingsSet(key, value) {
    try {
        _settings.set_string(key, value);
    } catch (e) {
        console.error(`[mactop] gsettings error: ${e}`);
    }
}

function gsettingsToggle(key) {
    try {
        _settings.set_boolean(key, !_settings.get_boolean(key));
    } catch (e) {
        console.error(`[mactop] gsettings error: ${e}`);
    }
}

export const viewActions = {
    'nautilus-icon-view': () => gsettingsSet('default-folder-viewer', 'icon-view'),
    'nautilus-list-view': () => gsettingsSet('default-folder-viewer', 'list-view'),
    'nautilus-sort-name': () => gsettingsSet('default-sort-order', 'name'),
    'nautilus-sort-date': () => gsettingsSet('default-sort-order', 'mtime'),
    'nautilus-sort-size': () => gsettingsSet('default-sort-order', 'size'),
    'nautilus-sort-type': () => gsettingsSet('default-sort-order', 'type'),
    'nautilus-reverse-sort': () => gsettingsToggle('default-sort-in-reverse-order'),
    'nautilus-toggle-path-bar': () => gsettingsToggle('always-use-location-entry'),
    'nautilus-toggle-hidden': () => gsettingsToggle('show-hidden-files'),
};
