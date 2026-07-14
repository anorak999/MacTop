import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const home = () => GLib.get_home_dir();
const specialDir = (d) => GLib.get_user_special_dir(d) || `${home()}/${d === GLib.UserDirectory.DIRECTORY_DOCUMENTS ? 'Documents' : d === GLib.UserDirectory.DIRECTORY_DESKTOP ? 'Desktop' : 'Downloads'}`;

export const fileActions = {
    'open-finder': () => GLib.spawn_command_line_async(`xdg-open ${home()}`),
    'new-finder-win': () => GLib.spawn_command_line_async(`xdg-open ${home()}`),
    'new-folder': () => GLib.spawn_command_line_async(`mkdir -p ${home()}/Desktop/'Untitled Folder'`),
    'open-settings': () => GLib.spawn_command_line_async('gnome-control-center'),
    'empty-bin': () => GLib.spawn_command_line_async('gio trash --empty'),
    'open-system-help': () => GLib.spawn_command_line_async('yelp'),
    'go-home': () => GLib.spawn_command_line_async(`xdg-open ${home()}`),
    'go-recents': () => GLib.spawn_command_line_async('xdg-open recent:///'),
    'go-documents': () => GLib.spawn_command_line_async(`xdg-open "${specialDir(GLib.UserDirectory.DIRECTORY_DOCUMENTS)}"`),
    'go-desktop': () => GLib.spawn_command_line_async(`xdg-open "${specialDir(GLib.UserDirectory.DIRECTORY_DESKTOP)}"`),
    'go-downloads': () => GLib.spawn_command_line_async(`xdg-open "${specialDir(GLib.UserDirectory.DIRECTORY_DOWNLOAD)}"`),

    'send-feedback': () => {
        Gio.AppInfo.launch_default_for_uri(
            'https://github.com/anorak999/MacTop',
            global.create_app_launch_context(0, -1)
        );
    },

    'app-details': (ctx, appId) => {
        if (appId) GLib.spawn_command_line_async(`gnome-software --details=${appId}`);
    },
};
