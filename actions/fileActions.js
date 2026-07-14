import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const home = () => GLib.get_home_dir();
const specialDir = (d) => GLib.get_user_special_dir(d) || `${home()}/${d === GLib.UserDirectory.DIRECTORY_DOCUMENTS ? 'Documents' : d === GLib.UserDirectory.DIRECTORY_DESKTOP ? 'Desktop' : 'Downloads'}`;

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

    // File Menu
    'open-finder': () => GLib.spawn_command_line_async(`xdg-open ${home()}`),
    'new-finder-win': () => GLib.spawn_command_line_async(`xdg-open ${home()}`),
    'new-folder': () => GLib.spawn_command_line_async(`mkdir -p ${home()}/Desktop/'Untitled Folder'`),
    'open-settings': () => GLib.spawn_command_line_async('gnome-control-center'),
    'empty-bin': () => GLib.spawn_command_line_async('gio trash --empty'),
    'find': () => GLib.spawn_command_line_async('gnome-search-tool'),
    'eject': () => GLib.spawn_command_line_async('udisksctl power-off --no-user-interaction'),

    // Go Menu
    'go-home': () => GLib.spawn_command_line_async(`xdg-open ${home()}`),
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

    // Window
    'tile-left': () => GLib.spawn_command_line_async('gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval "global.get_window_actors().find(a => a.meta_window.has_focus())?.meta_window.move_to_monitor(0)" 2>/dev/null'),
    'tile-right': () => GLib.spawn_command_line_async('gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval "global.get_window_actors().find(a => a.meta_window.has_focus())?.meta_window.move_to_monitor(1)" 2>/dev/null'),
    'bring-all-front': () => GLib.spawn_command_line_async('wmctrl -r :ACTIVE: -b add,above'),

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
