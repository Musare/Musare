import async from "async";
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
		this.jobQueue = async.priorityQueue(
			({ job, options }, callback) => this._runJob(job, options, callback),
			10 // How many jobs can run concurrently
		);
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
	 * @param {object} options - object containing any additional options for the job
	 * @param {boolean} options.isQuiet - whether or not the job should be advertised in the logs, useful for repetitive/unimportant jobs
	 * @param {boolean} options.bypassQueue - UNKNOWN
	 * @returns {Promise} - returns a promise
	 */
	runJob(name, payload, options = { isQuiet: false, bypassQueue: false }) {
		const deferredPromise = new DeferredPromise();
		const job = { name, payload, onFinish: deferredPromise };

		if (
			config.debug &&
			config.debug.stationIssue === true &&
			config.debug.captureJobs &&
			config.debug.captureJobs.indexOf(name) !== -1
		) {
			this.moduleManager.debugJobs.all.push(job);
		}

		if (options.bypassQueue) this._runJob(job, options, () => { });
		else {
			const priority = this.priorities[name] ? this.priorities[name] : 10;
			this.jobQueue.push({ job, options }, priority);
		}

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
	 * @param {object} options - object containing any additional options for the job
	 * @param {boolean} options.isQuiet - whether or not the job should be advertised in the logs, useful for repetitive/unimportant jobs
	 * @param {boolean} options.bypassQueue - UNKNOWN
	 * @param {Function} cb - Callback after the job has completed
	 */
	_runJob(job, options, cb) {
		if (!options.isQuiet) this.log("INFO", `Running job ${job.name}`);

		const startTime = Date.now();

		this.runningJobs.push(job);

		const newThis = Object.assign(Object.create(Object.getPrototypeOf(this)), this);

		newThis.runJob = (...args) => {
			if (args.length === 1) args.push({});
			args[1].bypassQueue = true;

			return this.runJob(...args);
		};

		this[job.name]
			.apply(newThis, [job.payload])
			.then(response => {
				if (!options.isQuiet) this.log("INFO", `Ran job ${job.name} successfully`);
				this.jobStatistics[job.name].successful += 1;
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
				job.onFinish.resolve(response);
			})
			.catch(error => {
				this.log("INFO", `Running job ${job.name} failed`);
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
				job.onFinish.reject(error);
			})
			.finally(() => {
				const endTime = Date.now();
				const executionTime = endTime - startTime;
				this.jobStatistics[job.name].total += 1;
				this.jobStatistics[job.name].averageTiming.update(executionTime);
				this.runningJobs.splice(this.runningJobs.indexOf(job), 1);
				cb();
			});
	}
}
