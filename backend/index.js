import "./loadEnvVariables.js";

import util from "util";
import config from "config";

process.on("uncaughtException", err => {
	if (err.code === "ECONNREFUSED" || err.code === "UNCERTAIN_STATE") return;
	console.log(`UNCAUGHT EXCEPTION: ${err.stack}`);
});

const blacklistedConsoleLogs = [
	"Running job IO",
	"Ran job IO successfully",
	"Running job HGET",
	"Ran job HGET successfully",
	"Running job HGETALL",
	"Ran job HGETALL successfully",
	"Running job GET_ERROR",
	"Ran job GET_ERROR successfully",
	"Running job GET_SCHEMA",
	"Ran job GET_SCHEMA successfully",
	"Running job SUB",
	"Ran job SUB successfully",
	"Running job GET_MODEL",
	"Ran job GET_MODEL successfully",
	"Running job HSET",
	"Ran job HSET successfully",
	"Running job CAN_USER_VIEW_STATION",
	"Ran job CAN_USER_VIEW_STATION successfully"
];

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
// 		this.modules["discord"].sendAdminAlertMessage("The backend server started successfully.", "#00AA00", "Startup", false, []);
// 	}

// 	aModuleFailed(failedModule) {
// 		this.logger.error("MODULE_MANAGER", `A module has failed, locking down. Module: ${failedModule.name}`);
// 		this.modules["discord"].sendAdminAlertMessage(`The backend server failed to start due to a failing module: ${failedModule.name}.`, "#AA0000", "Startup", false, []);

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
// moduleManager.addModule("discord");
// moduleManager.addModule("io");
// moduleManager.addModule("logger");
// moduleManager.addModule("notifications");
// moduleManager.addModule("activities");
// moduleManager.addModule("playlists");
// moduleManager.addModule("punishments");
// moduleManager.addModule("songs");
// moduleManager.addModule("spotify");
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
	}

	async addModule(moduleName) {
		console.log("add module", moduleName);
		// import(`./logic/${moduleName}`).then(Module => {
		// 	// eslint-disable-next-line new-cap

		// 	const instantiatedModule = new Module.default();
		// 	this.modules[moduleName] = instantiatedModule;
		// 	this.modulesNotInitialized.push(instantiatedModule);
		// 	if (moduleName === "cache") console.log(56, this.modules);
		// });

		this.modules[moduleName] = import(`./logic/${moduleName}`);
	}

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

		for (let moduleId = 0, moduleNames = Object.keys(this.modules); moduleId < moduleNames.length; moduleId += 1) {
			const module = this.modules[moduleNames[moduleId]];

			module.setModuleManager(this);

			if (this.lockdown) break;

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
		}
	}

	onInitialize(module) {
		if (this.modulesNotInitialized.indexOf(module) !== -1) {
			this.modulesNotInitialized.splice(this.modulesNotInitialized.indexOf(module), 1);

			console.log(
				"MODULE_MANAGER",
				`Initialized: ${Object.keys(this.modules).length - this.modulesNotInitialized.length}/${
					Object.keys(this.modules).length
				}.`
			);

			if (this.modulesNotInitialized.length === 0) this.onAllModulesInitialized();
		}
	}

	onFail(module) {
		if (this.modulesNotInitialized.indexOf(module) !== -1) {
			console.log("A module failed to initialize!");
		}
	}

	onAllModulesInitialized() {
		console.log("All modules initialized!");
		this.modules.discord.runJob("SEND_ADMIN_ALERT_MESSAGE", {
			message: "The backend server started successfully.",
			color: "#00AA00",
			type: "Startup",
			critical: false,
			extraFields: []
		});
	}
}

const moduleManager = new ModuleManager();

moduleManager.addModule("cache");
moduleManager.addModule("db");
moduleManager.addModule("mail");
moduleManager.addModule("activities");
moduleManager.addModule("api");
moduleManager.addModule("app");
moduleManager.addModule("discord");
moduleManager.addModule("io");
moduleManager.addModule("notifications");
moduleManager.addModule("playlists");
moduleManager.addModule("punishments");
moduleManager.addModule("songs");
moduleManager.addModule("spotify");
moduleManager.addModule("stations");
moduleManager.addModule("tasks");
moduleManager.addModule("utils");

moduleManager.initialize();

process.stdin.on("data", data => {
	const command = data.toString().replace(/\r?\n|\r/g, "");
	if (command === "lockdown") {
		console.log("Locking down.");
		moduleManager._lockdown();
	}
	if (command === "status") {
		console.log("Status:");

		for (
			let moduleName = 0, moduleKeys = Object.keys(moduleManager.modules);
			moduleName < moduleKeys.length;
			moduleName += 1
		) {
			const module = moduleManager.modules[moduleName];
			const tabsNeeded = 4 - Math.ceil((moduleName.length + 1) / 8);
			console.log(
				`${moduleName.toUpperCase()}${Array(tabsNeeded).join(
					"\t"
				)}${module.getStatus()}. Jobs in queue: ${module.jobQueue.length()}. Jobs in progress: ${module.jobQueue.running()}. Concurrency: ${
					module.jobQueue.concurrency
				}. Stage: ${module.getStage()}`
			);
		}
		// moduleManager._lockdown();
	}
	if (command.startsWith("running")) {
		const parts = command.split(" ");

		console.log(moduleManager.modules[parts[1]].runningJobs);
	}
	if (command.startsWith("stats")) {
		const parts = command.split(" ");

		console.log(moduleManager.modules[parts[1]].jobStatistics);
	}
	if (command.startsWith("debug")) {
		moduleManager.modules.utils.runJob("DEBUG");
	}
});

export default moduleManager;
