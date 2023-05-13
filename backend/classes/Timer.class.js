export default class Timer {
	// eslint-disable-next-line require-jsdoc
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

	/**
	 * Pauses the timer
	 *
	 */
	pause() {
		clearTimeout(this.timerId);
		this.remaining -= Date.now() - this.start;
		this.timePaused = Date.now();
		this.paused = true;
	}

	/**
	 * Ensures the timer's resume function is called if it is paused
	 *
	 */
	ifNotPaused() {
		if (!this.paused) {
			this.resume();
		}
	}

	/**
	 * Resumes the timer
	 *
	 */
	resume() {
		this.start = Date.now();
		clearTimeout(this.timerId);
		this.timerId = setTimeout(this.callback, this.remaining);
		this.timeWhenPaused = Date.now() - this.timePaused;
		this.paused = false;
	}

	/**
	 * Resets the time when paused
	 *
	 */
	resetTimeWhenPaused() {
		this.timeWhenPaused = 0;
	}

	/**
	 * Gets the amount of time the timer has been paused
	 * @returns {Date} - the amount of time the timer has been paused
	 */
	getTimePaused() {
		if (!this.paused) {
			return this.timeWhenPaused;
		}
		return Date.now() - this.timePaused;
	}
}
