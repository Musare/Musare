import "./loadEnvVariables.js";

import util from "util";
import config from "config";

// eslint-disable-next-line no-extend-native
Array.prototype.remove = item => {
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

const fancyConsole = config.get("fancyConsole");

if (config.debug && config.debug.traceUnhandledPromises === true) {
	console.log("Enabled trace-unhandled/register");
	import("trace-unhandled/register");
}

// class ModuleManager {
// 	constructor() {
// 		this.modules = {};
// 		this.modulesInitialized = 0;
// 		this.totalModules = 0;
// 		this.modulesLeft = [];
// 		this.i = 0;
// 		this.lockdown = false;
// 		this.fancyConsole = fancyConsole;
// 	}

// 	addModule(moduleName) {
// 		console.log("add module", moduleName);
// 		const moduleClass = new require(`./logic/${moduleName}`);
// 		this.modules[moduleName] = new moduleClass(moduleName, this);
// 		this.totalModules++;
// 		this.modulesLeft.push(moduleName);
// 	}

// 	initialize() {
// 		if (!this.modules["logger"]) return console.error("There is no logger module");
// 		this.logger = this.modules["logger"];
// 		if (this.fancyConsole) {
// 			this.replaceConsoleWithLogger();
// 			this.logger.reservedLines = Object.keys(this.modules).length + 5;
// 		}

// 		for (let moduleName in this.modules) {
// 			let module = this.modules[moduleName];
// 			if (this.lockdown) break;

// 			module._onInitialize().then(() => {
// 				this.moduleInitialized(moduleName);
// 			});

// 			let dependenciesInitializedPromises = [];

// 			module.dependsOn.forEach(dependencyName => {
// 				let dependency = this.modules[dependencyName];
// 				dependenciesInitializedPromises.push(dependency._onInitialize());
// 			});

// 			module.lastTime = Date.now();

// 			Promise.all(dependenciesInitializedPromises).then((res, res2) => {
// 				if (this.lockdown) return;
// 				this.logger.info("MODULE_MANAGER", `${moduleName} dependencies have been completed`);
// 				module._initialize();
// 			});
// 		}
// 	}

// 	async printStatus() {
// 		try { await Promise.race([this.logger._onInitialize(), this.logger._isInitialized()]); } catch { return; }
// 		if (!this.fancyConsole) return;

// 		let colors = this.logger.colors;

// 		const rows = process.stdout.rows;

// 		process.stdout.cursorTo(0, rows - this.logger.reservedLines);
// 		process.stdout.clearScreenDown();

// 		process.stdout.cursorTo(0, (rows - this.logger.reservedLines) + 2);

// 		process.stdout.write(`${colors.FgYellow}Modules${colors.FgWhite}:\n`);

// 		for (let moduleName in this.modules) {
// 			let module = this.modules[moduleName];
// 			let tabsAmount = Math.max(0, Math.ceil(2 - (moduleName.length / 8)));

// 			let tabs = Array(tabsAmount).fill(`\t`).join("");

// 			let timing = module.timeDifferences.map((timeDifference) => {
// 				return `${colors.FgMagenta}${timeDifference}${colors.FgCyan}ms${colors.FgWhite}`;
// 			}).join(", ");

// 			let stateColor;
// 			if (module.state === "NOT_INITIALIZED") stateColor = colors.FgWhite;
// 			else if (module.state === "INITIALIZED") stateColor = colors.FgGreen;
// 			else if (module.state === "LOCKDOWN" && !module.failed) stateColor = colors.FgRed;
// 			else if (module.state === "LOCKDOWN" && module.failed) stateColor = colors.FgMagenta;
// 			else stateColor = colors.FgYellow;

// 			process.stdout.write(`${moduleName}${tabs}${stateColor}${module.state}\t${colors.FgYellow}Stage: ${colors.FgRed}${module.stage}${colors.FgWhite}. ${colors.FgYellow}Timing${colors.FgWhite}: [${timing}]${colors.FgWhite}${colors.FgWhite}. ${colors.FgYellow}Total time${colors.FgWhite}: ${colors.FgRed}${module.totalTimeInitialize}${colors.FgCyan}ms${colors.Reset}\n`);
// 		}
// 	}

// 	moduleInitialized(moduleName) {
// 		this.modulesInitialized++;
// 		this.modulesLeft.splice(this.modulesLeft.indexOf(moduleName), 1);

// 		this.logger.info("MODULE_MANAGER", `Initialized: ${this.modulesInitialized}/${this.totalModules}.`);

// 		if (this.modulesLeft.length === 0) this.allModulesInitialized();
// 	}

// 	allModulesInitialized() {
// 		this.logger.success("MODULE_MANAGER", "All modules have started!");
// 	}

// 	aModuleFailed(failedModule) {
// 		this.logger.error("MODULE_MANAGER", `A module has failed, locking down. Module: ${failedModule.name}`);

// 		this._lockdown();
// 	}

// 	replaceConsoleWithLogger() {
// 		this.oldConsole = {
// 			log: console.log,
// 			debug: console.debug,
// 			info: console.info,
// 			warn: console.warn,
// 			error: console.error
// 		};
// 		console.log = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
// 		console.debug = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
// 		console.info = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
// 		console.warn = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
// 		console.error = (...args) => this.logger.error("CONSOLE", args.map(arg => util.format(arg)));
// 	}

// 	replaceLoggerWithConsole() {
// 		console.log = this.oldConsole.log;
// 		console.debug = this.oldConsole.debug;
// 		console.info = this.oldConsole.info;
// 		console.warn = this.oldConsole.warn;
// 		console.error = this.oldConsole.error;
// 	}

// 	_lockdown() {
// 		this.lockdown = true;

// 		for (let moduleName in this.modules) {
// 			let module = this.modules[moduleName];
// 			if (module.lockdownImmune) continue;
// 			module._lockdown();
// 		}
// 	}
// }

// const moduleManager = new ModuleManager();

// module.exports = moduleManager;

// moduleManager.addModule("cache");
// moduleManager.addModule("db");
// moduleManager.addModule("mail");
// moduleManager.addModule("api");
// moduleManager.addModule("app");
// moduleManager.addModule("io");
// moduleManager.addModule("logger");
// moduleManager.addModule("notifications");
// moduleManager.addModule("activities");
// moduleManager.addModule("playlists");
// moduleManager.addModule("punishments");
// moduleManager.addModule("songs");
// moduleManager.addModule("stations");
// moduleManager.addModule("tasks");
// moduleManager.addModule("utils");

// moduleManager.initialize();

// process.stdin.on("data", function (data) {
//     if(data.toString() === "lockdown\r\n"){
//         console.log("Locking down.");
//        	moduleManager._lockdown();
//     }
// });

// if (fancyConsole) {
// 	const rows = process.stdout.rows;

// 	for(let i = 0; i < rows; i++) {
// 		process.stdout.write("\n");
// 	}
// }

class ModuleManager {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.modules = {};
		this.modulesNotInitialized = [];
		this.i = 0;
		this.lockdown = false;
		this.fancyConsole = fancyConsole;
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
		// import(`./logic/${moduleName}`).then(Module => {
		// 	// eslint-disable-next-line new-cap

		// 	const instantiatedModule = new Module.default();
		// 	this.modules[moduleName] = instantiatedModule;
		// 	this.modulesNotInitialized.push(instantiatedModule);
		// 	if (moduleName === "cache") console.log(56, this.modules);
		// });

		this.modules[moduleName] = import(`./logic/${moduleName}`);
	}

	/**
	 * Initialises a new module to the backend server/module manager
	 *
	 */
	async initialize() {
		// if (!this.modules["logger"]) return console.error("There is no logger module");
		// this.logger = this.modules["logger"];
		// if (this.fancyConsole) {
		// this.replaceConsoleWithLogger();
		this.reservedLines = Object.keys(this.modules).length + 5;
		// }

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

			// let dependenciesInitializedPromises = [];

			// module.dependsOn.forEach(dependencyName => {
			// 	let dependency = this.modules[dependencyName];
			// 	dependenciesInitializedPromises.push(dependency._onInitialize());
			// });

			// module.lastTime = Date.now();

			// Promise.all(dependenciesInitializedPromises).then((res, res2) => {
			// 	if (this.lockdown) return;
			// 	this.logger.info("MODULE_MANAGER", `${moduleName} dependencies have been completed`);
			// 	module._initialize();
			// });
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
}

const moduleManager = new ModuleManager();

moduleManager.addModule("cache");
moduleManager.addModule("db");
moduleManager.addModule("mail");
moduleManager.addModule("activities");
moduleManager.addModule("api");
moduleManager.addModule("app");
moduleManager.addModule("io");
moduleManager.addModule("notifications");
moduleManager.addModule("playlists");
moduleManager.addModule("punishments");
moduleManager.addModule("songs");
moduleManager.addModule("stations");
moduleManager.addModule("tasks");
moduleManager.addModule("utils");
moduleManager.addModule("youtube");

moduleManager.initialize();

/**
 * Prints a job
 *
 * @param {object} job - the job
 * @param {number} layer - the layer
 */
function printJob(job, layer) {
	const tabs = Array(layer).join("\t");
	console.log(`${tabs}${job.name} (${job.toString()}) ${job.status}`);
	job.childJobs.forEach(childJob => {
		printJob(childJob, layer + 1);
	});
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
		// moduleManager._lockdown();
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
		let jobFound = null;

		Object.keys(moduleManager.modules).forEach(moduleName => {
			const module = moduleManager.modules[moduleName];
			const task1 = module.jobQueue.runningTasks.find(task => task.job.uniqueId === uuid);
			const task2 = module.jobQueue.queue.find(task => task.job.uniqueId === uuid);
			const task3 = module.jobQueue.pausedTasks.find(task => task.job.uniqueId === uuid);
			if (task1) jobFound = task1.job;
			if (task2) jobFound = task2.job;
			if (task3) jobFound = task3.job;
		});

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
		} else console.log("Could not find job in any running, queued or paused lists in any module.");
	}
	// if (command.startsWith("debug")) {
	// }

	if (command.startsWith("eval")) {
		const evalCommand = command.replace("eval ", "");
		console.log(`Running eval command: ${evalCommand}`);
		// eslint-disable-next-line no-eval
		const response = eval(evalCommand);
		console.log(`Eval response: `, response);
	}
});

export default moduleManager;
