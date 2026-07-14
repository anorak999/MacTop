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
};
