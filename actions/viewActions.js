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

/**
 * Force Nautilus to re-read its sort/view preferences on open windows.
 * Nautilus monitors GSettings changes, but sometimes the sort state
 * is cached per-window. This sends a gsettings set via command line
 * (ensures D-Bus propagation) and toggles the view briefly to force
 * a re-render of the current directory listing.
 */
function applyNautilusSetting(key, value) {
    gsettingsSet(key, value);
    _settings.sync();
}

function toggleNautilusSetting(key) {
    gsettingsToggle(key);
    _settings.sync();
}

export const viewActions = {
    'nautilus-icon-view': () => applyNautilusSetting('default-folder-viewer', 'icon-view'),
    'nautilus-list-view': () => applyNautilusSetting('default-folder-viewer', 'list-view'),
    'nautilus-sort-name': () => applyNautilusSetting('default-sort-order', 'name'),
    'nautilus-sort-date': () => applyNautilusSetting('default-sort-order', 'mtime'),
    'nautilus-sort-size': () => applyNautilusSetting('default-sort-order', 'size'),
    'nautilus-sort-type': () => applyNautilusSetting('default-sort-order', 'type'),
    'nautilus-reverse-sort': () => toggleNautilusSetting('default-sort-in-reverse-order'),
    'nautilus-toggle-path-bar': () => toggleNautilusSetting('always-use-location-entry'),
    'nautilus-toggle-hidden': () => toggleNautilusSetting('show-hidden-files'),
};
