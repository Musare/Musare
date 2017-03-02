'use strict';

let utils;
let tasks = {};

let testTask = (callback) => {
	//Stuff
	console.log("Starting task");
	setTimeout(() => {
		console.log("Callback");
		callback();
	}, 10000);
};


module.exports = {
	init: function(cb) {
		utils = require('./utils');
		this.createTask("testTask", testTask, 5000);
		this.pauseTask("testTask");

		cb();
	},
	createTask: function(name, fn, timeout) {
		tasks[name] = {
			name,
			fn,
			timeout,
			lastRan: 0,
			timer: null
		};
		this.handleTask(tasks[name]);
	},
	pauseTask: (name) => {
		tasks[name].timer.pause();
	},
	resumeTask: (name) => {
		tasks[name].timer.resume();
	},
	handleTask: function(task) {
		if (task.timer) task.timer.pause();

		task.fn(() => {
			task.lastRan = Date.now();
			task.timer = new utils.Timer(() => {
				this.handleTask(task);
			}, task.timeout, false);
		});
	}
};
