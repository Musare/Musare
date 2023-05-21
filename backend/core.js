import config from "config";
import { EventEmitter } from "events";

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
	constructor(job, options, priority) {
		this.job = job;
		this.options = options;
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
	 * @returns {number} - amount of jobs in queue
	 */
	lengthQueue() {
		return this.queue.length;
	}

	/**
	 * Returns the amount of running jobs.
	 * @returns {number} - amount of running jobs
	 */
	lengthRunning() {
		return this.runningTasks.length;
	}

	/**
	 * Returns the amount of running jobs.
	 * @returns {number} - amount of running jobs
	 */
	lengthPaused() {
		return this.pausedTasks.length;
	}

	/**
	 * Adds a job to the queue, with a given priority.
	 * @param {object} job - the job that is to be added
	 * @param {object} options - custom options e.g. isQuiet. Optional.
	 * @param {number} priority - the priority of the to be added job
	 */
	push(job, options, priority) {
		this.queue.push(new QueueTask(job, options, priority));
		setTimeout(() => {
			this._handleQueue();
		}, 0);
	}

	/**
	 * Removes a job currently running from the queue.
	 * @param {object} job - the job to be removed
	 */
	removeRunningJob(job) {
		this.runningTasks.remove(this.runningTasks.find(task => task.job.toString() === job.toString()));
	}

	/**
	 * Pauses a job currently running from the queue.
	 * @param {object} job - the job to be pauses
	 */
	pauseRunningJob(job) {
		const task = this.runningTasks.find(task => task.job.toString() === job.toString());
		if (!task) {
			console.log(
				`Attempted to pause job ${job.name} (${job.toString()}), but couldn't find it in running tasks.`
			);
			return;
		}
		this.runningTasks.remove(task);
		this.pausedTasks.push(task);
	}

	/**
	 * Resumes a job currently paused, adding the job back to the front of the queue
	 * @param {object} job - the job to be pauses
	 */
	resumeRunningJob(job) {
		const task = this.pausedTasks.find(task => task.job.toString() === job.toString());
		if (!task) {
			console.log(
				`Attempted to resume job ${job.name} (${job.toString()}), but couldn't find it in paused tasks.`
			);
			return;
		}
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
			const task = this.queue.reduce((a, b) => (a.priority < b.priority ? a : b));
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
	 * @param {object} task - the task to be handled
	 */
	_handleTask(task) {
		this.handleTaskFunction(task.job, task.options).finally(() => {
			this.runningTasks.remove(task);
			this._handleQueue();
		});
	}
}

class Job {
	// eslint-disable-next-line require-jsdoc
	constructor(name, payload, onFinish, module, parentJob, options) {
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
		this.onProgress = options.onProgress;
		this.lastProgressData = null;
		this.lastProgressTime = Date.now();
		this.lastProgressTimeout = null;
		this.longJob = false;
		this.longJobTitle = "";
		this.longJobStatus = "";
	}

	/**
	 * Adds a child job to this job
	 * @param {object} childJob - the child job
	 */
	addChildJob(childJob) {
		this.childJobs.push(childJob);
	}

	/**
	 * Sets the job status
	 * @param {string} status - the new status
	 */
	setStatus(status) {
		this.status = status;
	}

	/**
	 * Sets the task for a job
	 * @param {string} task - the job task
	 */
	setTask(task) {
		this.task = task;
	}

	/**
	 * Returns the UUID of the job, allowing you to compare jobs with toString
	 * @returns {string} - the job's UUID/uniqueId
	 */
	toString() {
		return this.uniqueId;
	}

	/**
	 * Sets the response that will be provided to the onFinish DeferredPromise resolve/reject function, as soon as the job is done if it has no parent, or when the parent job is resumed
	 * @param {object} response - the response
	 */
	setResponse(response) {
		this.response = response;
	}

	/**
	 * Sets the response type that is paired with the response. If it is RESOLVE/REJECT, then it will resolve/reject with the response. If it is RESOLVED/REJECTED, then it has already resolved/rejected with the response.
	 * @param {string} responseType - the response type, so RESOLVE/REJECT/RESOLVED/REJECTED
	 */
	setResponseType(responseType) {
		this.responseType = responseType;
	}

	/**
	 * Removes child jobs to prevent memory leak
	 */
	cleanup() {
		this.childJobs = this.childJobs.map(() => null);
	}

	/**
	 * Logs to the module of the job
	 * @param  {any} args - Anything to be added to the log e.g. log type, log message
	 */
	log(...args) {
		args.splice(1, 0, this.name); // Adds the name of the job as the first argument (after INFO/SUCCESS/ERROR).
		this.module.log(...args);
	}

	/**
	 * Set whether this job is a long job.
	 */
	keepLongJob() {
		this.longJob = true;
	}

	/**
	 * Forget long job.
	 */
	forgetLongJob() {
		this.longJob = false;
		this.module.moduleManager.jobManager.removeJob(this);
	}

	/**
	 * Update and emit progress of job
	 * @param {data} data - Data to publish upon progress
	 * @param {boolean} notALongJob - Whether job is not a long job
	 */
	publishProgress(data, notALongJob) {
		if (this.longJob || notALongJob) {
			if (this.onProgress) {
				if (notALongJob) {
					this.onProgress.emit("progress", data);
				} else {
					this.lastProgressData = data;

					if (data.status === "update") {
						if (Date.now() - this.lastProgressTime > 1000) {
							this.lastProgressTime = Date.now();
						} else {
							if (this.lastProgressTimeout) clearTimeout(this.lastProgressTimeout);
							this.lastProgressTimeout = setTimeout(() => {
								this.lastProgressTime = Date.now();
								this.lastProgressTimeout = null;
								this.onProgress.emit("progress", data);
							}, Date.now() - this.lastProgressTime);
							return;
						}
					} else if (data.status === "success" || data.status === "error")
						if (this.lastProgressTimeout) clearTimeout(this.lastProgressTimeout);

					if (data.title) this.longJobTitle = data.title;

					this.onProgress.emit("progress", data);
				}
			} else this.log("Progress published, but no onProgress specified.");
		} else {
			this.parentJob.publishProgress(data);
		}
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
	 * @param {number} newValue - the new time it took to complete a job
	 */
	update(newValue) {
		this.count += 1;
		const differential = (newValue - this._mean) / this.count;
		this._mean += differential;
	}

	/**
	 * Returns the mean average
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
	/**
	 *
	 * @param {string} name - the name of the class
	 * @param {object} options - optional options
	 * @param {number} options.concurrency - how many jobs can run at the same time
	 * @param {object} options.priorities - custom priorities for jobs
	 */
	constructor(name, options) {
		this.name = name;
		this.status = "UNINITIALIZED";
		this.concurrency = options && options.concurrency ? options.concurrency : 10;
		this.jobQueue = new Queue((job, options) => this._runJob(job, options), this.concurrency);
		this.jobQueue.pause();
		this.priorities = options && options.priorities ? options.priorities : {};
		this.stage = 0;
		this.jobStatistics = {};
		this.jobNames = [];

		this.logRules = config.get("customLoggingPerModule")[name]
			? config.get("customLoggingPerModule")[name]
			: config.get("defaultLogging");

		this.registerJobs();
	}

	/**
	 * Sets the status of a module
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
	 * @returns {string} - the status of a module
	 */
	getStatus() {
		return this.status;
	}

	/**
	 * Changes the current stage of a module
	 * @param {string} stage - the new stage of a module
	 */
	setStage(stage) {
		this.stage = stage;
	}

	/**
	 * Returns the current stage of a module
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
	 * @param {...any} args - anything to be included in the log message, the first argument is the type of log
	 */
	log(...args) {
		const _arguments = Array.from(args);
		const type = _arguments[0];

		if (config.debug && config.debug.stationIssue === true && type === "STATION_ISSUE") {
			this.moduleManager.debugLogs.stationIssue.push(_arguments);
			return;
		}

		if (this.logRules.hideType.indexOf(type) !== -1) return;

		_arguments.splice(0, 1);
		const start = `|${this.name.toUpperCase()}|`;
		const numberOfSpacesNeeded = 20 - start.length;
		_arguments.unshift(`${start}${Array(numberOfSpacesNeeded).join(" ")}`);

		if (this.logRules.blacklistedTerms.some(blacklistedTerm => _arguments.join().indexOf(blacklistedTerm) !== -1))
			return;

		if (type === "INFO" || type === "SUCCESS") {
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
		this.jobNames = jobNames;
	}

	/**
	 * Runs a job
	 * @param {string} name - the name of the job e.g. GET_PLAYLIST
	 * @param {object} payload - any expected payload for the job itself
	 * @param {object} parentJob - the parent job, if any
	 * @param {number} priority - custom priority. Optional.
	 * @param {object} options - custom options e.g. isQuiet. Optional.
	 * @returns {Promise} - returns a promise
	 */
	runJob(name, payload, parentJob, priority, options) {
		/** Allows for any combination of optional parameters (parentJob, priority, options) */

		let _options;
		let _priority;
		let _parentJob;

		if (parentJob) {
			if (typeof parentJob === "object")
				if (!parentJob.name) _options = parentJob;
				else _parentJob = parentJob;
			else if (typeof parentJob === "number") _priority = parentJob;
		}

		if (options) {
			if (typeof options === "object")
				if (options.name) _parentJob = options;
				else _options = options;
			if (typeof options === "number") _priority = options;
		}

		if (priority && typeof priority === "object") {
			if (!priority.name) _options = priority;
			else _parentJob = priority;
		} else _priority = priority;

		if (!_options) _options = { isQuiet: false };
		if (_options && typeof _options.onProgress === "function") {
			const onProgress = new EventEmitter();
			onProgress.on("progress", _options.onProgress);
			_options.onProgress = onProgress;
		}
		if (!_options.onProgress && parentJob) _options.onProgress = parentJob.onProgress;

		const deferredPromise = new DeferredPromise();
		const job = new Job(name, payload, deferredPromise, this, _parentJob, { onProgress: _options.onProgress });

		this.log("INFO", `Queuing job ${name} (${job.toString()})`);

		if (_parentJob) {
			_parentJob.addChildJob(job);
			if (_parentJob.status === "RUNNING") {
				this.log(
					"INFO",
					`Pausing job ${_parentJob.name} (${_parentJob.toString()}) since a child job has to run first`
				);
				_parentJob.setStatus("WAITING_ON_CHILD_JOB");
				_parentJob.module.jobQueue.pauseRunningJob(_parentJob);
			} else {
				this.log(
					"INFO",
					`Not pausing job ${_parentJob.name} (${_parentJob.toString()}) since it's already paused`
				);
			}
		}

		job.setStatus("QUEUED");

		let calculatedPriority = null;
		if (_priority) calculatedPriority = _priority;
		else if (this.priorities[name]) calculatedPriority = this.priorities[name];
		else if (_parentJob) calculatedPriority = _parentJob.task.priority;
		else calculatedPriority = 10;

		this.jobQueue.push(job, _options, calculatedPriority);

		if (
			config.debug &&
			config.debug.stationIssue === true &&
			config.debug.captureJobs &&
			config.debug.captureJobs.indexOf(name) !== -1
		) {
			this.moduleManager.debugJobs.all.push({ job, _priority });
		}

		return deferredPromise.promise;
	}

	/**
	 * UNKNOWN
	 * @param {object} moduleManager - UNKNOWN
	 */
	setModuleManager(moduleManager) {
		this.moduleManager = moduleManager;
	}

	/**
	 * Actually runs the job? UNKNOWN
	 * @param {object} job - object containing details of the job
	 * @param {string} job.name - the name of the job e.g. GET_PLAYLIST
	 * @param {string} job.payload - any expected payload for the job itself
	 * @param {Promise} job.onFinish - deferred promise when the job is complete
	 * @param {object} options - custom options e.g. isQuiet. Optional.
	 * @returns {Promise} - returns a promise
	 */
	_runJob(job, options) {
		if (!options.isQuiet) this.log("INFO", `Running job ${job.name} (${job.toString()})`);
		return new Promise(resolve => {
			const startTime = Date.now();

			const previousStatus = job.status;
			job.setStatus("RUNNING");
			this.moduleManager.jobManager.addJob(job);

			if (previousStatus === "QUEUED") {
				if (!options.isQuiet) this.log("INFO", `Job ${job.name} (${job.toString()}) is queued, so calling it`);

				if (this[job.name])
					this[job.name]
						.apply(job, [job.payload])
						.then(response => {
							if (!options.isQuiet)
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
									priority: job.task.priority,
									response
								});
							}
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
						})
						.finally(() => {
							const endTime = Date.now();
							const executionTime = endTime - startTime;
							this.jobStatistics[job.name].total += 1;
							this.jobStatistics[job.name].averageTiming.update(executionTime);
							if (!job.longJob) this.moduleManager.jobManager.removeJob(job);
							job.cleanup();

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
								job.parentJob.childJobs.find(childJob =>
									childJob ? childJob.status !== "FINISHED" : true
								) === undefined
							) {
								if (job.parentJob.status !== "WAITING_ON_CHILD_JOB") {
									this.log(
										"ERROR",
										`Job ${
											job.parentJob.name
										} (${job.parentJob.toString()}) had a child job complete even though it is not waiting on a child job. This should never happen.`
									);
								} else {
									job.parentJob.setStatus("REQUEUED");
									job.parentJob.module.jobQueue.resumeRunningJob(job.parentJob);
								}
							}
							resolve();
						});
				else this.log("ERROR", `Job not found! ${job.name}`);
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
