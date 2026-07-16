import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const HOME = GLib.get_home_dir();
const specialDir = (d) => GLib.get_user_special_dir(d) || `${HOME}/${d === GLib.UserDirectory.DIRECTORY_DOCUMENTS ? 'Documents' : d === GLib.UserDirectory.DIRECTORY_DESKTOP ? 'Desktop' : 'Downloads'}`;

/**
 * Nautilus DBus proxy for activating actions.
 * Cached to avoid repeated proxy creation.
 */
let _nautilusProxy = null;
let _nautilusProxyPromise = null;

async function getNautilusProxy() {
    if (_nautilusProxy) return _nautilusProxy;
    if (_nautilusProxyPromise) return _nautilusProxyPromise;

    _nautilusProxyPromise = (async () => {
        try {
            const proxy = await Gio.DBusProxy.new(
                Gio.DBus.session, Gio.DBusProxyFlags.NONE, null,
                'org.gnome.Nautilus', '/org/gnome/Nautilus',
                'org.gtk.Actions', null
            );
            _nautilusProxy = proxy;
            return proxy;
        } catch (e) {
            console.error(`[mactop] Failed to get Nautilus DBus proxy: ${e}`);
            _nautilusProxy = null;
            return null;
        } finally {
            _nautilusProxyPromise = null;
        }
    })();

    return _nautilusProxyPromise;
}

/**
 * Activate a Nautilus action via DBus.
 * Returns true if successful, false otherwise.
 */
async function activateNautilusAction(actionName, parameter = null) {
    const proxy = await getNautilusProxy();
    if (!proxy) return false;

    try {
        await proxy.call(
            'Activate',
            new GLib.Variant('(sav)', [actionName, parameter ? [parameter] : [], {}]),
            Gio.DBusCallFlags.NONE, -1, null
        );
        return true;
    } catch (e) {
        console.error(`[mactop] Failed to activate Nautilus action ${actionName}: ${e}`);
        return false;
    }
}

/**
 * Get the focused Nautilus window.
 */
function getNautilusWindow() {
    try {
        const focusedWindow = global.display.get_focus_window();
        if (!focusedWindow) return null;
        const wmClass = (focusedWindow.get_wm_class() || '').toLowerCase();
        if (!wmClass.includes('nautilus')) return null;
        return focusedWindow;
    } catch (e) {
        return null;
    }
}

/**
 * Detect if Nautilus is the currently focused application.
 */
function isNautilusFocused() {
    return getNautilusWindow() !== null;
}

/**
 * Create a new folder in Nautilus's currently viewed directory.
 * Falls back to Desktop if Nautilus is not focused.
 */
function createNewFolder() {
    if (isNautilusFocused()) {
        const timestamp = Date.now();
        GLib.spawn_command_line_async(`mkdir -p "${HOME}/Desktop/Untitled Folder ${timestamp}"`);
        return;
    }
    GLib.spawn_command_line_async(`mkdir -p "${HOME}/Desktop/Untitled Folder"`);
}

/**
 * Get the currently focused Nautilus window's URI.
 * Returns null if Nautilus is not focused or cannot determine URI.
 */
function getNautilusCurrentUri() {
    try {
        const focusedWindow = global.display.get_focus_window();
        if (!focusedWindow) return null;
        const wmClass = (focusedWindow.get_wm_class() || '').toLowerCase();
        if (!wmClass.includes('nautilus')) return null;

        // Try to get URI from window title (Nautilus shows "foldername - Files")
        const title = focusedWindow.get_title() || '';
        // Nautilus title format: "foldername - Files" or "Files"
        // We can't reliably get the URI from title, so return null
        // and let callers use HOME as fallback
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Get list of removable drives/block devices using udisks2.
 * Returns array of {device, name, size, isRemovable, mountPoints}
 * Cached for 5s to avoid repeated subprocess spawns.
 */
let _drivesCache = null;
let _drivesCacheTime = 0;
const DRIVES_CACHE_TTL_MS = 5000;

async function getRemovableDrives() {
    const now = Date.now();
    if (_drivesCache && (now - _drivesCacheTime) < DRIVES_CACHE_TTL_MS) {
        return _drivesCache;
    }

    const drives = await new Promise((resolve) => {
        try {
            const subprocess = Gio.Subprocess.new(
                ['udisksctl', 'dump', '--object-info'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            const stream = new Gio.DataInputStream({ base_stream: subprocess.get_stdout_pipe() });
            let stdout = '';
            const readLine = () => {
                stream.read_line_utf8_async(GLib.PRIORITY_DEFAULT, null, (src, res) => {
                    try {
                        const [line] = src.read_line_utf8_finish(res);
                        if (line !== null) {
                            stdout += line + '\n';
                            readLine();
                        } else {
                            resolve(parseUdisksOutput(stdout));
                        }
                    } catch (_e) {
                        resolve(parseUdisksOutput(stdout));
                    }
                });
            };
            readLine();
        } catch (e) {
            console.error(`[mactop] Failed to run udisksctl: ${e}`);
            resolve([]);
        }
    });

    _drivesCache = drives;
    _drivesCacheTime = Date.now();
    return drives;
}

function parseUdisksOutput(stdout) {
    const drives = [];
    try {
        const lines = stdout.split('\n');
        let currentDrive = null;

        for (const line of lines) {
            if (line.startsWith('/org/freedesktop/UDisks2/Block_devices/')) {
                if (currentDrive && currentDrive.isRemovable) {
                    drives.push(currentDrive);
                }
                currentDrive = {
                    device: line.trim().split('/').pop(),
                    name: '',
                    size: 0,
                    isRemovable: false,
                    mountPoints: []
                };
            } else if (currentDrive) {
                if (line.includes('IdUsage=') && line.includes('filesystem')) {
                    currentDrive.name = currentDrive.device;
                }
                if (line.includes('HintSystem=true')) {
                    currentDrive.isRemovable = false;
                }
                if (line.includes('Size=') && !line.includes('PartitionSize')) {
                    const match = line.match(/Size=(\d+)/);
                    if (match) currentDrive.size = parseInt(match[1], 10);
                }
                if (line.includes('MountPoints=[') && line.includes('/')) {
                    const mountMatch = line.match(/MountPoints=\[(.*?)\]/);
                    if (mountMatch) {
                        currentDrive.mountPoints = mountMatch[1]
                            .split(',')
                            .map(s => s.trim().replace(/'/g, ''))
                            .filter(s => s.length > 0);
                    }
                }
            }
        }
        if (currentDrive && currentDrive.isRemovable) {
            drives.push(currentDrive);
        }
    } catch (e) {
        console.error(`[mactop] Failed to parse udisksctl output: ${e}`);
    }
    return drives;
}

/**
 * Eject/unmount a block device.
 */
async function ejectDevice(device) {
    return new Promise((resolve) => {
        try {
            // First unmount if mounted
            const subprocess = Gio.Subprocess.new(
                ['udisksctl', 'unmount', '-b', `/dev/${device}`],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            subprocess.wait_check_async(null, (source, result) => {
                try {
                    source.finish(result);
                    // Then power off the drive
                    const powerOff = Gio.Subprocess.new(
                        ['udisksctl', 'power-off', '-b', `/dev/${device}`],
                        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                    );
                    powerOff.wait_check_async(null, (source, result) => {
                        try {
                            source.finish(result);
                            resolve(true);
                        } catch (e) {
                            console.error(`[mactop] Failed to power off device: ${e}`);
                            resolve(false);
                        }
                    });
                } catch (e) {
                    console.error(`[mactop] Failed to unmount device: ${e}`);
                    resolve(false);
                }
            });
        } catch (e) {
            console.error(`[mactop] Failed to eject device: ${e}`);
            resolve(false);
        }
    });
}

export const fileActions = {
    // Apple Menu
    'about-this-mac': () => GLib.spawn_command_line_async('gnome-control-center about'),
    'system-settings': () => GLib.spawn_command_line_async('gnome-control-center'),
    'app-store': () => GLib.spawn_command_line_async('gnome-software'),
    'recent-items': () => GLib.spawn_command_line_async('xdg-open recent:///'),
    'force-quit': () => GLib.spawn_command_line_async('gnome-system-monitor'),
    'sleep': () => GLib.spawn_command_line_async('systemctl suspend'),
    'restart': () => GLib.spawn_command_line_async('gnome-session-quit --reboot'),
    'shut-down': () => GLib.spawn_command_line_async('gnome-session-quit --power-off'),
    'lock-screen': () => GLib.spawn_command_line_async('loginctl lock-session'),
    'log-out': () => GLib.spawn_command_line_async('gnome-session-quit'),

    // Finder Menu
    'open-settings-ext': () => GLib.spawn_command_line_async('gnome-extensions prefs mactop@anorak'),
    // hide-app, hide-others, show-all — moved to windowActions.js (direct JS eval)

    // File Menu - use DBus for Nautilus actions when focused
    'open-finder': () => GLib.spawn_command_line_async(`xdg-open ${HOME}`),
    'new-finder-win': async () => {
        if (isNautilusFocused()) {
            const ok = await activateNautilusAction('new-window');
            if (ok) return;
        }
        GLib.spawn_command_line_async(`xdg-open ${HOME}`);
    },
    'new-folder': () => createNewFolder(),

    'open-settings': async () => {
        if (isNautilusFocused()) {
            const ok = await activateNautilusAction('preferences');
            if (ok) return;
        }
        GLib.spawn_command_line_async('gnome-control-center');
    },
    'empty-bin': () => GLib.spawn_command_line_async('gio trash --empty'),

    'eject': async () => {
        const drives = await getRemovableDrives();
        if (drives.length === 0) {
            console.log('[mactop] No removable drives found');
            return;
        }

        for (const drive of drives) {
            if (drive.mountPoints.length > 0 || drive.size > 0) {
                await ejectDevice(drive.device);
            }
        }
    },

    // Go Menu
    'go-home': () => GLib.spawn_command_line_async(`xdg-open ${HOME}`),
    'go-recents': () => GLib.spawn_command_line_async('xdg-open recent:///'),
    'go-documents': () => GLib.spawn_command_line_async(`xdg-open "${specialDir(GLib.UserDirectory.DIRECTORY_DOCUMENTS)}"`),
    'go-desktop': () => GLib.spawn_command_line_async(`xdg-open "${specialDir(GLib.UserDirectory.DIRECTORY_DESKTOP)}"`),
    'go-downloads': () => GLib.spawn_command_line_async(`xdg-open "${specialDir(GLib.UserDirectory.DIRECTORY_DOWNLOAD)}"`),
    'go-computer': () => GLib.spawn_command_line_async('xdg-open computer:///'),
    'go-network': () => GLib.spawn_command_line_async('xdg-open network:///'),
    'go-applications': () => GLib.spawn_command_line_async('xdg-open /usr/share/applications'),
    'go-utilities': () => GLib.spawn_command_line_async('xdg-open /usr/bin'),

    // Help
    'open-system-help': () => GLib.spawn_command_line_async('yelp'),

    // Window — tile-left, tile-right, bring-all-front moved to windowActions.js

    // Feedback
    'send-feedback': () => {
        Gio.AppInfo.launch_default_for_uri(
            'https://github.com/anorak999/MacTop',
            global.create_app_launch_context(0, -1)
        );
    },

    'app-details': (ctx, appId) => {
        if (appId) GLib.spawn_command_line_async(`gnome-software --details=${appId}`);
    },

    'about-mactop': () => {
        Gio.AppInfo.launch_default_for_uri(
            'https://github.com/anorak999/MacTop',
            global.create_app_launch_context(0, -1)
        );
    },
};
