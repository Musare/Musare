import config from "config";

class DeferredPromise {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.promise = new Promise((resolve, reject) => {
			this.reject = reject;
			this.resolve = resolve;
		});
	}
}

class QueueTask {
	// eslint-disable-next-line require-jsdoc
	constructor(job, priority) {
		this.job = job;
		this.priority = priority;
		this.job.setTask(this);
	}
}

class Queue {
	// eslint-disable-next-line require-jsdoc
	constructor(handleTaskFunction, concurrency) {
		this.handleTaskFunction = handleTaskFunction;
		this.concurrency = concurrency;
		this.queue = [];
		this.runningTasks = [];
		this.pausedTasks = [];
		this.paused = false;
	}

	/**
	 * Pauses the queue, meaning no new jobs can be started. Jobs can still be added to the queue, and already running tasks won't be paused.
	 */
	pause() {
		this.paused = true;
	}

	/**
	 * Resumes the queue.
	 */
	resume() {
		this.paused = false;
		setTimeout(() => {
			this._handleQueue();
		}, 0);
	}

	/**
	 * Returns the amount of jobs in the queue.
	 *
	 * @returns {number} - amount of jobs in queue
	 */
	lengthQueue() {
		return this.queue.length;
	}

	/**
	 * Returns the amount of running jobs.
	 *
	 * @returns {number} - amount of running jobs
	 */
	lengthRunning() {
		return this.runningTasks.length;
	}

	/**
	 * Adds a job to the queue, with a given priority.
	 *
	 * @param {object} job - the job that is to be added
	 * @param {number} priority - the priority of the to be added job
	 */
	push(job, priority) {
		this.queue.push(new QueueTask(job, priority));
		setTimeout(() => {
			this._handleQueue();
		}, 0);
	}

	/**
	 * Removes a job currently running from the queue.
	 *
	 * @param {object} job - the job to be removed
	 */
	removeRunningJob(job) {
		this.runningTasks.remove(this.runningTasks.find(task => task.job.toString() === job.toString()));
	}

	/**
	 * Pauses a job currently running from the queue.
	 *
	 * @param {object} job - the job to be pauses
	 */
	pauseRunningJob(job) {
		const task = this.runningTasks.find(task => task.job.toString() === job.toString());
		this.runningTasks.remove(task);
		this.pausedTasks.push(task);
	}

	/**
	 * Resumes a job currently paused, adding the job back to the front of the queue
	 *
	 * @param {object} job - the job to be pauses
	 */
	resumeRunningJob(job) {
		const task = this.pausedTasks.find(task => task.job.toString() === job.toString());
		this.pausedTasks.remove(task);
		this.queue.unshift(task);
		setTimeout(() => {
			this._handleQueue();
		}, 0);
	}

	/**
	 * Check if there's room for a job to be processed, and if there is, run it.
	 */
	_handleQueue() {
		if (this.queue.length > 0) {
			const task = this.queue.reduce((a, b) => (a.priority < b.priority ? b : a));
			if (task) {
				if ((!this.paused && this.runningTasks.length < this.concurrency) || task.priority === -1) {
					this.queue.remove(task);
					this.runningTasks.push(task);
					this._handleTask(task);
					setTimeout(() => {
						this._handleQueue();
					}, 0);
				}
			}
		}
	}

	/**
	 * Handles a task, calling the handleTaskFunction provided in the constructor
	 *
	 * @param {object} task - the task to be handled
	 */
	_handleTask(task) {
		this.handleTaskFunction(task.job).finally(() => {
			this.runningTasks.remove(task);
			this._handleQueue();
		});
	}
}

class Job {
	// eslint-disable-next-line require-jsdoc
	constructor(name, payload, onFinish, module, parentJob) {
		this.name = name;
		this.payload = payload;
		this.response = null;
		this.responseType = null;
		this.onFinish = onFinish;
		this.module = module;
		this.parentJob = parentJob;
		this.childJobs = [];
		/* eslint-disable no-bitwise, eqeqeq */
		this.uniqueId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
			const r = (Math.random() * 16) | 0;
			const v = c == "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
		this.status = "INITIALIZED";
		this.task = null;
	}

	/**
	 * Adds a child job to this job
	 *
	 * @param {object} childJob - the child job
	 */
	addChildJob(childJob) {
		this.childJobs.push(childJob);
	}

	/**
	 * Sets the job status
	 *
	 * @param {string} status - the new status
	 */
	setStatus(status) {
		// console.log(`Job ${this.toString()} has changed status from ${this.status} to ${status}`);
		this.status = status;
	}

	setTask(task) {
		this.task = task;
	}

	/**
	 * Returns the UUID of the job, allowing you to compare jobs with toString
	 *
	 * @returns {string} - the job's UUID/uniqueId
	 */
	toString() {
		return this.uniqueId;
	}

	/**
	 * Sets the response that will be provided to the onFinish DeferredPromise resolve/reject function, as soon as the job is done if it has no parent, or when the parent job is resumed
	 *
	 * @param {object} response - the response
	 */
	setResponse(response) {
		this.response = response;
	}

	/**
	 * Sets the response type that is paired with the response. If it is RESOLVE/REJECT, then it will resolve/reject with the response. If it is RESOLVED/REJECTED, then it has already resolved/rejected with the response.
	 *
	 * @param {string} responseType - the response type, so RESOLVE/REJECT/RESOLVED/REJECTED
	 */
	setResponseType(responseType) {
		this.responseType = responseType;
	}
}

class MovingAverageCalculator {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.count = 0;
		this._mean = 0;
	}

	/**
	 * Updates the mean average
	 *
	 * @param {number} newValue - the new time it took to complete a job
	 */
	update(newValue) {
		this.count += 1;
		const differential = (newValue - this._mean) / this.count;
		this._mean += differential;
	}

	/**
	 * Returns the mean average
	 *
	 * @returns {number} - returns the mean average
	 */
	get mean() {
		this.validate();
		return this._mean;
	}

	/**
	 * Checks that the mean is valid
	 */
	validate() {
		if (this.count === 0) throw new Error("Mean is undefined");
	}
}

export default class CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor(name) {
		this.name = name;
		this.status = "UNINITIALIZED";
		// this.log("Core constructor");
		this.jobQueue = new Queue(job => this._runJob(job), 10);
		this.jobQueue.pause();
		this.runningJobs = [];
		this.priorities = {};
		this.stage = 0;
		this.jobStatistics = {};

		this.registerJobs();
	}

	/**
	 * Sets the status of a module
	 *
	 * @param {string} status - the new status of a module
	 */
	setStatus(status) {
		this.status = status;
		this.log("INFO", `Status changed to: ${status}`);
		if (this.status === "READY") this.jobQueue.resume();
		else if (this.status === "FAIL" || this.status === "LOCKDOWN") this.jobQueue.pause();
	}

	/**
	 * Returns the status of a module
	 *
	 * @returns {string} - the status of a module
	 */
	getStatus() {
		return this.status;
	}

	/**
	 * Changes the current stage of a module
	 *
	 * @param {string} stage - the new stage of a module
	 */
	setStage(stage) {
		this.stage = stage;
	}

	/**
	 * Returns the current stage of a module
	 *
	 * @returns {string} - the current stage of a module
	 */
	getStage() {
		return this.stage;
	}

	/**
	 * Initialises a module and handles initialise successes and failures
	 */
	_initialize() {
		this.setStatus("INITIALIZING");

		this.initialize()
			.then(() => {
				this.setStatus("READY");
				this.moduleManager.onInitialize(this);
			})
			.catch(err => {
				console.error(err);
				this.setStatus("FAILED");
				this.moduleManager.onFail(this);
			});
	}

	/**
	 * Creates a new log message
	 *
	 * @param {...any} args - anything to be included in the log message, the first argument is the type of log
	 */
	log(...args) {
		const _arguments = Array.from(args);
		const type = _arguments[0];

		if (config.debug && config.debug.stationIssue === true && type === "STATION_ISSUE") {
			this.moduleManager.debugLogs.stationIssue.push(_arguments);
			return;
		}

		_arguments.splice(0, 1);
		const start = `|${this.name.toUpperCase()}|`;
		const numberOfSpacesNeeded = 20 - start.length;
		_arguments.unshift(`${start}${Array(numberOfSpacesNeeded).join(" ")}`);

		if (type === "INFO") {
			_arguments[0] += "\x1b[36m";
			_arguments.push("\x1b[0m");
			console.log.apply(null, _arguments);
		} else if (type === "ERROR") {
			_arguments[0] += "\x1b[31m";
			_arguments.push("\x1b[0m");
			console.error.apply(null, _arguments);
		}
	}

	/**
	 * Sets up each job with the statistics service (includes mean average for job completion)
	 */
	registerJobs() {
		let props = [];
		let obj = this;
		do {
			props = props.concat(Object.getOwnPropertyNames(obj));
			// eslint-disable-next-line no-cond-assign
		} while ((obj = Object.getPrototypeOf(obj)));

		const jobNames = props.sort().filter(prop => typeof this[prop] === "function" && prop === prop.toUpperCase());

		jobNames.forEach(jobName => {
			this.jobStatistics[jobName] = {
				successful: 0,
				failed: 0,
				total: 0,
				averageTiming: new MovingAverageCalculator()
			};
		});
	}

	/**
	 * Runs a job
	 *
	 * @param {string} name - the name of the job e.g. GET_PLAYLIST
	 * @param {object} payload - any expected payload for the job itself
	 * @param {object} parentJob - the parent job, if any
	 * @param {number} priority - custom priority. Optional.
	 * @returns {Promise} - returns a promise
	 */
	runJob(name, payload, parentJob, priority) {
		const deferredPromise = new DeferredPromise();
		const job = new Job(name, payload, deferredPromise, this, parentJob);
		this.log("INFO", `Queuing job ${name} (${job.toString()})`);
		if (parentJob) {
			parentJob.addChildJob(job);
			if (parentJob.status === "RUNNING") {
				this.log(
					"INFO",
					`Pausing job ${parentJob.name} (${parentJob.toString()}) since a child job has to run first`
				);
				parentJob.setStatus("WAITING_ON_CHILD_JOB");
				parentJob.module.jobQueue.pauseRunningJob(parentJob);
				// console.log(111, parentJob.module.jobQueue.length());
				// console.log(
				// 	222,
				// 	parentJob.module.jobQueue.workersList().map(data => data.data.job)
				// );
			} else {
				this.log(
					"INFO",
					`Not pausing job ${parentJob.name} (${parentJob.toString()}) since it's already paused`
				);
			}
		}

		// console.log(this);

		// console.log(321, parentJob);

		if (
			config.debug &&
			config.debug.stationIssue === true &&
			config.debug.captureJobs &&
			config.debug.captureJobs.indexOf(name) !== -1
		) {
			this.moduleManager.debugJobs.all.push(job);
		}

		job.setStatus("QUEUED");

		// if (options.bypassQueue) this._runJob(job, options, () => {});
		// else {
		const _priority = Math.min(
			priority || Infinity,
			parentJob ? parentJob.task.priority : Infinity,
			this.priorities[name] ? this.priorities[name] : 10
		);
		console.log(_priority);
		this.jobQueue.push(job, _priority);
		// }

		return deferredPromise.promise;
	}

	/**
	 * UNKNOWN
	 *
	 * @param {object} moduleManager - UNKNOWN
	 */
	setModuleManager(moduleManager) {
		this.moduleManager = moduleManager;
	}

	/**
	 * Actually runs the job? UNKNOWN
	 *
	 * @param {object} job - object containing details of the job
	 * @param {string} job.name - the name of the job e.g. GET_PLAYLIST
	 * @param {string} job.payload - any expected payload for the job itself
	 * @param {Promise} job.onFinish - deferred promise when the job is complete
	 * @returns {Promise} - returns a promise
	 */
	_runJob(job) {
		this.log("INFO", `Running job ${job.name} (${job.toString()})`);
		return new Promise(resolve => {
			const startTime = Date.now();

			const previousStatus = job.status;
			job.setStatus("RUNNING");
			this.runningJobs.push(job);

			if (previousStatus === "QUEUED") {
				this.log("INFO", `Job ${job.name} (${job.toString()}) is queued, so calling it`);
				this[job.name]
					.apply(job, [job.payload])
					.then(response => {
						// if (!options.isQuiet)
						this.log("INFO", `Ran job ${job.name} (${job.toString()}) successfully`);
						job.setStatus("FINISHED");
						job.setResponse(response);
						this.jobStatistics[job.name].successful += 1;
						job.setResponseType("RESOLVE");
						if (
							config.debug &&
							config.debug.stationIssue === true &&
							config.debug.captureJobs &&
							config.debug.captureJobs.indexOf(job.name) !== -1
						) {
							this.moduleManager.debugJobs.completed.push({
								status: "success",
								job,
								response
							});
						}
						// job.onFinish.resolve(response);
					})
					.catch(error => {
						this.log("INFO", `Running job ${job.name} (${job.toString()}) failed`);
						job.setStatus("FINISHED");
						job.setResponse(error);
						job.setResponseType("REJECT");
						this.jobStatistics[job.name].failed += 1;
						if (
							config.debug &&
							config.debug.stationIssue === true &&
							config.debug.captureJobs &&
							config.debug.captureJobs.indexOf(job.name) !== -1
						) {
							this.moduleManager.debugJobs.completed.push({
								status: "error",
								job,
								error
							});
						}
						// job.onFinish.reject(error);
					})
					.finally(() => {
						const endTime = Date.now();
						const executionTime = endTime - startTime;
						this.jobStatistics[job.name].total += 1;
						this.jobStatistics[job.name].averageTiming.update(executionTime);
						this.runningJobs.splice(this.runningJobs.indexOf(job), 1);
						if (!job.parentJob) {
							if (job.responseType === "RESOLVE") {
								job.onFinish.resolve(job.response);
								job.responseType = "RESOLVED";
							} else if (job.responseType === "REJECT") {
								job.onFinish.reject(job.response);
								job.responseType = "REJECTED";
							}
						} else if (
							job.parentJob &&
							job.parentJob.childJobs.find(childJob => childJob.status !== "FINISHED") === undefined
						) {
							this.log(
								"INFO",
								`Requeing/resuming job ${
									job.parentJob.name
								} (${job.parentJob.toString()}) since all child jobs are complete.`
							);
							job.parentJob.setStatus("REQUEUED");
							job.parentJob.module.jobQueue.resumeRunningJob(job.parentJob);
						}
						resolve();
					});
			} else {
				this.log(
					"INFO",
					`Job ${job.name} (${job.toString()}) is re-queued, so resolving/rejecting all child jobs.`
				);
				job.childJobs.forEach(childJob => {
					if (childJob.responseType === "RESOLVE") {
						childJob.onFinish.resolve(childJob.response);
						childJob.responseType = "RESOLVED";
					} else if (childJob.responseType === "REJECT") {
						childJob.onFinish.reject(childJob.response);
						childJob.responseType = "REJECTED";
					}
				});
			}
		});
	}
}
