function Timer(callback, delay, paused) {
	var timerId, start, remaining = delay;
	var timeWhenPaused = 0;
	var timePaused = Date.now();

	this.pause = function () {
		clearTimeout(timerId);
		remaining -= Date.now() - start;
		timePaused = Date.now();
	};

	this.resume = function () {
		start = Date.now();
		clearTimeout(timerId);
		timerId = setTimeout(callback, remaining);
		timeWhenPaused += Date.now() - timePaused;
	};

	this.resetTimeWhenPaused = function() {
		timeWhenPaused = 0;
	};

	this.timeWhenPaused = function () {
		return timeWhenPaused;
	};

	if (paused === false) {
		this.resume();
	}
}

module.exports = {
	rc: null, // RethinkDB Connection, this gets set in app.js
	io: null, // Socket.io
	htmlEntities: function(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},
	Timer: Timer
};
