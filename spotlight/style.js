// Ported from search-light (GPL-3.0) with permission consideration.
// Style utility for dynamic CSS generation.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

const CustomStylesPath = '/tmp';

export const Style = class {
    constructor() {
        this.uId = GLib.uuid_string_random();
        this.styles = {};
        this.style_contents = {};
    }

    unloadAll() {
        let ctx = St.ThemeContext.get_for_stage(global.stage);
        let theme = ctx.get_theme();
        Object.keys(this.styles).forEach(k => {
            let fn = this.styles[k];
            theme.unload_stylesheet(fn);
            try { fn.delete(null); } catch (_e) { /* ignore */ }
        });
        this.styles = {};
        this.style_contents = {};
    }

    build(name, style_array) {
        let fn = this.styles[name];
        let ctx = St.ThemeContext.get_for_stage(global.stage);
        let theme = ctx.get_theme();

        let content = style_array.join('\n');
        if (this.style_contents[name] === content) return;

        if (fn) {
            theme.unload_stylesheet(fn);
        } else {
            fn = Gio.File.new_for_path(`${CustomStylesPath}/${name}_${this.uId}.css`);
            this.styles[name] = fn;
        }

        this.style_contents[name] = content;
        fn.replace_contents(content, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        theme.load_stylesheet(fn);
    }

    rgba(color) {
        let clr = color || [1, 1, 1, 1];
        let res = clr.map(r => Math.floor(255 * r));
        res[3] = clr[3].toFixed(1);
        return res.join(',');
    }
};
