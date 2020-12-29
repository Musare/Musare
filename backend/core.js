import async from "async";
import config from "config";

class DeferredPromise {
	constructor() {
		this.promise = new Promise((resolve, reject) => {
			this.reject = reject;
			this.resolve = resolve;
		});
	}
}

class MovingAverageCalculator {
	constructor() {
		this.count = 0;
		this._mean = 0;
	}

	update(newValue) {
		this.count += 1;
		const differential = (newValue - this._mean) / this.count;
		this._mean += differential;
	}

	get mean() {
		this.validate();
		return this._mean;
	}

	validate() {
		if (this.count === 0) throw new Error("Mean is undefined");
	}
}

export default class CoreClass {
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

	setStatus(status) {
		this.status = status;
		this.log("INFO", `Status changed to: ${status}`);
		if (this.status === "READY") this.jobQueue.resume();
		else if (this.status === "FAIL" || this.status === "LOCKDOWN") this.jobQueue.pause();
	}

	getStatus() {
		return this.status;
	}

	setStage(stage) {
		this.stage = stage;
	}

	getStage() {
		return this.stage;
	}

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

	setModuleManager(moduleManager) {
		this.moduleManager = moduleManager;
	}

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
