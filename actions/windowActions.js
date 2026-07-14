import GLib from 'gi://GLib';

export const windowActions = {
    close: (ctx) => {
        if (ctx.window) ctx.window.delete(global.get_current_time());
    },

    minimize: (ctx) => {
        if (ctx.window) ctx.window.minimize();
    },

    maximize: (ctx) => {
        if (!ctx.window) return;
        if (ctx.window.is_maximized()) ctx.window.unmaximize();
        else ctx.window.maximize();
    },

    'activate-window': (ctx, winId) => {
        if (!ctx.app) return;
        const target = ctx.app.get_windows().find(w => w.get_id().toString() === winId);
        if (target) target.activate(global.get_current_time());
    },

    'new-app-window': (ctx) => {
        if (ctx.app) ctx.app.open_new_window(-1);
    },

    // Direct JS eval — runs inside GNOME Shell, no gdbus fork+exec
    'hide-app': () => {
        const actors = global.get_window_actors();
        actors.forEach(a => {
            if (a.meta_window.has_focus()) a.meta_window.minimize();
        });
    },

    'hide-others': () => {
        const actors = global.get_window_actors();
        actors.forEach(a => {
            if (!a.meta_window.has_focus() && !a.meta_window.is_skip_taskbar()) {
                a.meta_window.minimize();
            }
        });
    },

    'show-all': () => {
        const actors = global.get_window_actors();
        actors.forEach(a => {
            if (a.meta_window.is_minimized()) {
                a.meta_window.activate(global.get_current_time());
            }
        });
    },

    'tile-left': () => {
        const actors = global.get_window_actors();
        const focused = actors.find(a => a.meta_window.has_focus());
        if (focused) focused.meta_window.move_to_monitor(0);
    },

    'tile-right': () => {
        const actors = global.get_window_actors();
        const focused = actors.find(a => a.meta_window.has_focus());
        if (focused) focused.meta_window.move_to_monitor(1);
    },

    'bring-all-front': () => {
        const actors = global.get_window_actors();
        actors.forEach(a => {
            if (a.meta_window.is_minimized()) {
                a.meta_window.activate(global.get_current_time());
            }
        });
    },
};
