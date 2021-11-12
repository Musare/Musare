import "./loadEnvVariables.js";

import util from "util";
import config from "config";

const REQUIRED_CONFIG_VERSION = 7;

// eslint-disable-next-line
Array.prototype.remove = function (item) {
	this.splice(this.indexOf(item), 1);
};

process.on("uncaughtException", err => {
	if (err.code === "ECONNREFUSED" || err.code === "UNCERTAIN_STATE") return;
	console.log(`UNCAUGHT EXCEPTION: ${err.stack}`);
});

const blacklistedConsoleLogs = [];

const oldConsole = {};
oldConsole.log = console.log;

console.log = (...args) => {
	const string = util.format.apply(null, args);
	let blacklisted = false;
	blacklistedConsoleLogs.forEach(blacklistedConsoleLog => {
		if (string.indexOf(blacklistedConsoleLog) !== -1) blacklisted = true;
	});
	if (!blacklisted) oldConsole.log.apply(null, args);
};

if (
	(!config.has("configVersion") || config.get("configVersion") !== REQUIRED_CONFIG_VERSION) &&
	!(config.has("skipConfigVersionCheck") && config.get("skipConfigVersionCheck"))
) {
	console.log(
		"CONFIG VERSION IS WRONG. PLEASE UPDATE YOUR CONFIG WITH THE HELP OF THE TEMPLATE FILE AND THE README FILE."
	);
	process.exit();
}

if (config.debug && config.debug.traceUnhandledPromises === true) {
	console.log("Enabled trace-unhandled/register");
	import("trace-unhandled/register");
}

class JobManager {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.runningJobs = {};
	}

	/**
	 * Adds a job to the list of running jobs
	 *
	 * @param {object} job - the job object
	 */
	addJob(job) {
		if (!this.runningJobs[job.module.name]) this.runningJobs[job.module.name] = {};
		this.runningJobs[job.module.name][job.toString()] = job;
	}

	/**
	 * Removes a job from the list of running jobs (after it's completed)
	 *
	 * @param {object} job - the job object
	 */
	removeJob(job) {
		if (!this.runningJobs[job.module.name]) this.runningJobs[job.module.name] = {};
		delete this.runningJobs[job.module.name][job.toString()];
	}

	/**
	 * Returns detail about a job via a identifier
	 *
	 * @param {string} uuid - the job identifier
	 * @returns {object} - the job object
	 */
	getJob(uuid) {
		let job = null;
		Object.keys(this.runningJobs).forEach(moduleName => {
			if (this.runningJobs[moduleName][uuid]) job = this.runningJobs[moduleName][uuid];
		});
		return job;
	}
}

class ModuleManager {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.modules = {};
		this.modulesNotInitialized = [];
		this.jobManager = new JobManager();
		this.i = 0;
		this.lockdown = false;
		this.debugLogs = {
			stationIssue: []
		};
		this.debugJobs = {
			all: [],
			completed: []
		};
		this.name = "MODULE_MANAGER";
	}

	/**
	 * Adds a new module to the backend server/module manager
	 *
	 * @param {string} moduleName - the name of the module (also needs to be the same as the filename of a module located in the logic folder or "logic/moduleName/index.js")
	 */
	async addModule(moduleName) {
		this.log("INFO", "Adding module", moduleName);

		this.modules[moduleName] = import(`./logic/${moduleName}`);
	}

	/**
	 * Initialises a new module to the backend server/module manager
	 *
	 */
	async initialize() {
		this.reservedLines = Object.keys(this.modules).length + 5;

		await Promise.all(Object.values(this.modules)).then(modules => {
			for (let module = 0; module < modules.length; module += 1) {
				this.modules[modules[module].default.name] = modules[module].default;
				this.modulesNotInitialized.push(modules[module].default);
			}
		}); // ensures all modules are imported, then converts promise to the default export of the import

		Object.keys(this.modules).every(moduleKey => {
			const module = this.modules[moduleKey];

			module.setModuleManager(this);

			if (this.lockdown) return false;

			module._initialize();

			return true;
		});
	}

	/**
	 * Called when a module is initialised
	 *
	 * @param {object} module - the module object/class
	 */
	onInitialize(module) {
		if (this.modulesNotInitialized.indexOf(module) !== -1) {
			this.modulesNotInitialized.splice(this.modulesNotInitialized.indexOf(module), 1);

			this.log(
				"INFO",
				`Initialized: ${Object.keys(this.modules).length - this.modulesNotInitialized.length}/${
					Object.keys(this.modules).length
				}.`
			);

			if (this.modulesNotInitialized.length === 0) this.onAllModulesInitialized();
		}
	}

	/**
	 * Called when a module fails to initialise
	 *
	 * @param {object} module - the module object/class
	 */
	onFail(module) {
		if (this.modulesNotInitialized.indexOf(module) !== -1) {
			this.log("ERROR", "A module failed to initialize!");
		}
	}

	/**
	 * Called when every module has initialised
	 *
	 */
	onAllModulesInitialized() {
		this.log("INFO", "All modules initialized!");
	}

	/**
	 * Creates a new log message
	 *
	 * @param {...any} args - anything to be included in the log message, the first argument is the type of log
	 */
	log(...args) {
		const _arguments = Array.from(args);
		const type = _arguments[0];

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
	 * Locks down all modules
	 */
	_lockdown() {
		this.lockdown = true;
		Object.keys(this.modules).every(moduleKey => {
			const module = this.modules[moduleKey];
			module.setStatus("LOCKDOWN");
			return true;
		});
	}
}

const moduleManager = new ModuleManager();

if (!config.get("migration")) {
	moduleManager.addModule("cache");
	moduleManager.addModule("db");
	moduleManager.addModule("mail");
	moduleManager.addModule("activities");
	moduleManager.addModule("api");
	moduleManager.addModule("app");
	moduleManager.addModule("ws");
	moduleManager.addModule("notifications");
	moduleManager.addModule("playlists");
	moduleManager.addModule("punishments");
	moduleManager.addModule("songs");
	moduleManager.addModule("stations");
	moduleManager.addModule("tasks");
	moduleManager.addModule("utils");
	moduleManager.addModule("youtube");
} else {
	moduleManager.addModule("migration");
}

moduleManager.initialize();

/**
 * Prints a job
 *
 * @param {object} job - the job
 * @param {number} layer - the layer
 */
function printJob(job, layer) {
	const tabs = Array(layer).join("\t");
	if (job) {
		console.log(`${tabs}${job.name} (${job.toString()}) ${job.status}`);
		job.childJobs.forEach(childJob => {
			printJob(childJob, layer + 1);
		});
	} else console.log(`${tabs}JOB WAS REMOVED`);
}

/**
 * Prints a task
 *
 * @param {object} task - the task
 * @param {number} layer - the layer
 */
function printTask(task, layer) {
	const tabs = Array(layer).join("\t");
	console.log(`${tabs}${task.job.name} (${task.job.toString()}) ${task.job.status} (priority: ${task.priority})`);
	task.job.childJobs.forEach(childJob => {
		printJob(childJob, layer + 1);
	});
}

process.stdin.on("data", data => {
	const command = data.toString().replace(/\r?\n|\r/g, "");
	if (command === "lockdown") {
		console.log("Locking down.");
		moduleManager._lockdown();
	}
	if (command === "status") {
		console.log("Status:");

		Object.keys(moduleManager.modules).forEach(moduleName => {
			const module = moduleManager.modules[moduleName];
			const tabsNeeded = 4 - Math.ceil((moduleName.length + 1) / 8);
			console.log(
				`${moduleName.toUpperCase()}${Array(tabsNeeded).join(
					"\t"
				)}${module.getStatus()}. Jobs in queue: ${module.jobQueue.lengthQueue()}. Jobs in progress: ${module.jobQueue.lengthRunning()}. Jobs paused: ${module.jobQueue.lengthPaused()} Concurrency: ${
					module.jobQueue.concurrency
				}. Stage: ${module.getStage()}`
			);
		});
	}
	if (command.startsWith("running")) {
		const parts = command.split(" ");

		moduleManager.modules[parts[1]].jobQueue.runningTasks.forEach(task => {
			printTask(task, 1);
		});
	}
	if (command.startsWith("queued")) {
		const parts = command.split(" ");

		moduleManager.modules[parts[1]].jobQueue.queue.forEach(task => {
			printTask(task, 1);
		});
	}
	if (command.startsWith("paused")) {
		const parts = command.split(" ");

		moduleManager.modules[parts[1]].jobQueue.pausedTasks.forEach(task => {
			printTask(task, 1);
		});
	}
	if (command.startsWith("stats")) {
		const parts = command.split(" ");

		console.log(moduleManager.modules[parts[1]].jobStatistics);
	}
	if (command.startsWith("jobinfo")) {
		const parts = command.split(" ");

		const uuid = parts[1];
		const jobFound = moduleManager.jobManager.getJob(uuid);

		if (jobFound) {
			let topParent = jobFound;
			let levelsDeep = 0;
			while (topParent.parentJob && topParent !== topParent.parentJob) {
				topParent = jobFound.parentJob;
				levelsDeep += 1;
			}
			console.log(
				`Found job, displaying that job and the full tree from the top parent job. The job is ${levelsDeep} levels deep from the top parent.`
			);
			console.log(jobFound);
			printJob(topParent, 1);
		} else console.log("Could not find job in job manager.");
	}
	if (command.startsWith("runjob")) {
		const parts = command.split(" ");
		const module = parts[1];
		const jobName = parts[2];
		const payload = JSON.parse(parts[3]);

		moduleManager.modules[module]
			.runJob(jobName, payload)
			.then(response => {
				console.log("runjob success", response);
			})
			.catch(err => {
				console.log("runjob error", err);
			});
	}
	if (command.startsWith("eval")) {
		const evalCommand = command.replace("eval ", "");
		console.log(`Running eval command: ${evalCommand}`);
		// eslint-disable-next-line no-eval
		const response = eval(evalCommand);
		console.log(`Eval response: `, response);
	}
});

export default moduleManager;
