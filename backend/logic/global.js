function Timer(callback, delay, paused) {
	let timerId, start, remaining = delay;
	let timeWhenPaused = 0;
	const timePaused = Date.now();

	this.pause = () => {
		clearTimeout(timerId);
		remaining -= Date.now() - start;
		timePaused = Date.now();
	};

	this.resume = () => {
		start = Date.now();
		clearTimeout(timerId);
		timerId = setTimeout(callback, remaining);
		timeWhenPaused += Date.now() - timePaused;
	};

	this.resetTimeWhenPaused = () => {
		timeWhenPaused = 0;
	};

	this.timeWhenPaused = () => {
		return timeWhenPaused;
	};

	if (paused === false) {
		this.resume();
	}
}

module.exports = {
	io: null, // Socket.io
	db: null, // Database
	htmlEntities: function(str) {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},
	Timer
};
