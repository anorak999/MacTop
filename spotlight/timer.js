// Ported from search-light (GPL-3.0) with permission consideration.
// Timer utility for deferred/debounced work.
// Timers must only run while the spotlight overlay is visible.

import GLib from 'gi://GLib';

export const Timer = class {
    constructor(name) {
        this._name = name;
        this._subscribers = [];
        this._subscriberId = 0xff;
    }

    initialize(resolution) {
        this._resolution = resolution || 1000;
        this._autoStart = true;
        this._autoHibernate = true;
        this._hibernating = false;
        this._hibernatCounter = 0;
        this._hibernateWait = 250 + this._resolution * 2;
    }

    shutdown() {
        this._autoStart = false;
        this._hibernating = false;
        this.stop();
    }

    start(resolution) {
        if (this.is_running()) return;
        this._resolution = resolution || 1000;
        this._time = 0;
        this._timeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this._resolution,
            this.onUpdate.bind(this),
        );
        this._hibernating = false;
        this.onStart();
    }

    stop() {
        if (!this.is_running()) return;
        GLib.source_remove(this._timeoutId);
        this._timeoutId = null;
        this.onStop();
    }

    is_running() {
        return this._timeoutId != null;
    }

    onStart() {
        this._subscribers.forEach(s => s.onStart?.(s));
    }

    onStop() {
        this._subscribers.forEach(s => s.onStop?.(s));
    }

    onUpdate() {
        if (!this._timeoutId) return true;
        this._subscribers.forEach(s => s.onUpdate?.(s, this._resolution));
        this._time += this._resolution;

        if (this._autoHibernate && !this._subscribers.length) {
            this._hibernatCounter += this._resolution;
            if (this._hibernatCounter >= this._hibernateWait) {
                this.hibernate();
            }
        } else {
            this._hibernatCounter = 0;
        }
        return true;
    }

    hibernate() {
        if (!this.is_running()) return;
        this.stop();
        this._hibernating = true;
        this._hibernatCounter = 0;
    }

    subscribe(obj) {
        if (!obj._id) obj._id = this._subscriberId++;
        let idx = this._subscribers.findIndex(s => s._id === obj._id);
        if (idx === -1) {
            this._subscribers.push(obj);
        } else {
            this._subscribers[idx] = { ...this._subscribers[idx], ...obj };
        }

        if ((this._hibernating || this._autoStart) && this._subscribers.length === 1) {
            this.start(this._resolution);
        }
        return obj;
    }

    unsubscribe(obj) {
        let idx = this._subscribers.findIndex(s => s._id === obj._id);
        if (idx !== -1) {
            this._subscribers = [
                ...this._subscribers.slice(0, idx),
                ...this._subscribers.slice(idx + 1),
            ];
        }
    }

    runOnce(func, delay, name) {
        if (typeof func === 'object') {
            func._time = 0;
            return this.subscribe(func);
        }
        let obj = {
            _name: name,
            _type: 'once',
            _time: 0,
            _delay: delay,
            _func: func,
            onUpdate: (s, dt) => {
                s._time += dt;
                if (s._time >= s._delay) {
                    s._func(s);
                    this.unsubscribe(s);
                }
            },
        };
        return this.subscribe(obj);
    }

    cancel(obj) {
        if (obj) this.unsubscribe(obj);
    }
};
