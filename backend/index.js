'use strict';

const util = require("util");

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

const config = require("config");

process.on('uncaughtException', err => {
	if (err.code === 'ECONNREFUSED' || err.code === 'UNCERTAIN_STATE') return;
	console.log(`UNCAUGHT EXCEPTION: ${err.stack}`);
});

const fancyConsole = config.get("fancyConsole");

class ModuleManager {
	constructor() {
		this.modules = {};
		this.modulesInitialized = 0;
		this.totalModules = 0;
		this.modulesLeft = [];
		this.i = 0;
		this.lockdown = false;
		this.fancyConsole = fancyConsole;
	}

	addModule(moduleName) {
		console.log("add module", moduleName);
		const moduleClass = new require(`./logic/${moduleName}`);
		this.modules[moduleName] = new moduleClass(moduleName, this);
		this.totalModules++;
		this.modulesLeft.push(moduleName);
	}

	initialize() {
		if (!this.modules["logger"]) return console.error("There is no logger module");
		this.logger = this.modules["logger"];
		if (this.fancyConsole) {
			this.replaceConsoleWithLogger();
			this.logger.reservedLines = Object.keys(this.modules).length + 5;
		}
		
		for (let moduleName in this.modules) {
			let module = this.modules[moduleName];
			if (this.lockdown) break;

			module._onInitialize().then(() => {
				this.moduleInitialized(moduleName);
			});

			let dependenciesInitializedPromises = [];
			
			module.dependsOn.forEach(dependencyName => {
				let dependency = this.modules[dependencyName];
				dependenciesInitializedPromises.push(dependency._onInitialize());
			});

			module.lastTime = Date.now();

			Promise.all(dependenciesInitializedPromises).then((res, res2) => {
				if (this.lockdown) return;
				this.logger.info("MODULE_MANAGER", `${moduleName} dependencies have been completed`);
				module._initialize();
			});
		}
	}

	async printStatus() {
		try { await Promise.race([this.logger._onInitialize, this.logger._isInitialized]); } catch { return; }
		if (!this.fancyConsole) return;
		
		let colors = this.logger.colors;

		const rows = process.stdout.rows;

		process.stdout.cursorTo(0, rows - this.logger.reservedLines);
		process.stdout.clearScreenDown();

		process.stdout.cursorTo(0, (rows - this.logger.reservedLines) + 2);

		process.stdout.write(`${colors.FgYellow}Modules${colors.FgWhite}:\n`);

		for (let moduleName in this.modules) {
			let module = this.modules[moduleName];
			let tabsAmount = Math.max(0, Math.ceil(2 - (moduleName.length / 8)));

			let tabs = Array(tabsAmount).fill(`\t`).join("");

			let timing = module.timeDifferences.map((timeDifference) => {
				return `${colors.FgMagenta}${timeDifference}${colors.FgCyan}ms${colors.FgWhite}`;
			}).join(", ");

			let stateColor;
			if (module.state === "NOT_INITIALIZED") stateColor = colors.FgWhite;
			else if (module.state === "INITIALIZED") stateColor = colors.FgGreen;
			else if (module.state === "LOCKDOWN" && !module.failed) stateColor = colors.FgRed;
			else if (module.state === "LOCKDOWN" && module.failed) stateColor = colors.FgMagenta;
			else stateColor = colors.FgYellow;
			
			process.stdout.write(`${moduleName}${tabs}${stateColor}${module.state}\t${colors.FgYellow}Stage: ${colors.FgRed}${module.stage}${colors.FgWhite}. ${colors.FgYellow}Timing${colors.FgWhite}: [${timing}]${colors.FgWhite}${colors.FgWhite}. ${colors.FgYellow}Total time${colors.FgWhite}: ${colors.FgRed}${module.totalTimeInitialize}${colors.FgCyan}ms${colors.Reset}\n`);
		}
	}

	moduleInitialized(moduleName) {
		this.modulesInitialized++;
		this.modulesLeft.splice(this.modulesLeft.indexOf(moduleName), 1);

		this.logger.info("MODULE_MANAGER", `Initialized: ${this.modulesInitialized}/${this.totalModules}.`);

		if (this.modulesLeft.length === 0) this.allModulesInitialized();
	}

	allModulesInitialized() {
		this.logger.success("MODULE_MANAGER", "All modules have started!");
		this.modules["discord"].sendAdminAlertMessage("The backend server started successfully.", "#00AA00", "Startup", false, []);
	}

	aModuleFailed(failedModule) {
		this.logger.error("MODULE_MANAGER", `A module has failed, locking down. Module: ${failedModule.name}`);
		this.modules["discord"].sendAdminAlertMessage(`The backend server failed to start due to a failing module: ${failedModule.name}.`, "#AA0000", "Startup", false, []);

		this._lockdown();
	}

	replaceConsoleWithLogger() {
		this.oldConsole = {
			log: console.log,
			debug: console.debug,
			info: console.info,
			warn: console.warn,
			error: console.error
		};
		console.log = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
		console.debug = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
		console.info = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
		console.warn = (...args) => this.logger.debug(args.map(arg => util.format(arg)));
		console.error = (...args) => this.logger.error("CONSOLE", args.map(arg => util.format(arg)));
	}

	replaceLoggerWithConsole() {
		console.log = this.oldConsole.log;
		console.debug = this.oldConsole.debug;
		console.info = this.oldConsole.info;
		console.warn = this.oldConsole.warn;
		console.error = this.oldConsole.error;
	}

	_lockdown() {
		this.lockdown = true;
		
		for (let moduleName in this.modules) {
			let module = this.modules[moduleName];
			if (module.lockdownImmune) continue;
			module._lockdown();
		}
	}
}

const moduleManager = new ModuleManager();

module.exports = moduleManager;

moduleManager.addModule("cache");
moduleManager.addModule("db");
moduleManager.addModule("mail");
moduleManager.addModule("api");
moduleManager.addModule("app");
moduleManager.addModule("discord");
moduleManager.addModule("io");
moduleManager.addModule("logger");
moduleManager.addModule("notifications");
moduleManager.addModule("playlists");
moduleManager.addModule("punishments");
moduleManager.addModule("songs");
moduleManager.addModule("spotify");
moduleManager.addModule("stations");
moduleManager.addModule("tasks");
moduleManager.addModule("utils");

moduleManager.initialize();

process.stdin.on("data", function (data) {
    if(data.toString() === "lockdown\r\n"){
        console.log("Locking down.");
       	moduleManager._lockdown();
    }
});


if (fancyConsole) {
	const rows = process.stdout.rows;

	for(let i = 0; i < rows; i++) {
		process.stdout.write("\n");
	}
}
