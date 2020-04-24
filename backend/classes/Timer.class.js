module.exports = class Timer {
    constructor(callback, delay, paused) {
        this.callback = callback;
        this.timerId = undefined;
        this.start = undefined;
        this.paused = paused;
        this.remaining = delay;
        this.timeWhenPaused = 0;
        this.timePaused = Date.now();

        if (!paused) {
            this.resume();
        }
    }

    pause() {
        clearTimeout(this.timerId);
        this.remaining -= Date.now() - this.start;
        this.timePaused = Date.now();
        this.paused = true;
    }

    ifNotPaused() {
        if (!this.paused) {
            this.resume();
        }
    }

    resume() {
        this.start = Date.now();
        clearTimeout(this.timerId);
        this.timerId = setTimeout(this.callback, this.remaining);
        this.timeWhenPaused = Date.now() - this.timePaused;
        this.paused = false;
    }

    resetTimeWhenPaused() {
        this.timeWhenPaused = 0;
    }

    getTimePaused() {
        if (!this.paused) {
            return this.timeWhenPaused;
        } else {
            return Date.now() - this.timePaused;
        }
    }
};
