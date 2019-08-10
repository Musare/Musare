'use strict';

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

process.on('uncaughtException', err => {
	if (lockdownB || err.code === 'ECONNREFUSED' || err.code === 'UNCERTAIN_STATE') return;
	console.log(`UNCAUGHT EXCEPTION: ${err.stack}`);
});

class ModuleManager {
	constructor() {
		this.modules = {};
		this.modulesInitialized = 0;
		this.totalModules = 0;
		this.modulesLeft = [];
		this.i = 0;
		this.lockdown = false;
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

			Promise.all(dependenciesInitializedPromises).then((res, res2) => {
				if (this.lockdown) return;
				this.logger.info("MODULE_MANAGER", `${moduleName} dependencies have been completed`);
				module._initialize();
			});
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

		this.lockdown = true;

		for (let moduleName in this.modules) {
			let module = this.modules[moduleName];
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
