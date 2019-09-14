const EventEmitter = require('events');

const bus = new EventEmitter();

bus.setMaxListeners(1000);

module.exports = class {
	constructor(name, moduleManager) {
		this.name = name;
		this.moduleManager = moduleManager;
		this.lockdown = false;
		this.dependsOn = [];
		this.eventHandlers = [];
		this.state = "NOT_INITIALIZED";
		this.stage = 0;
		this.lastTime = 0;
		this.totalTimeInitialize = 0;
		this.timeDifferences = [];
		this.failed = false;
	}

	_initialize() {
		this.logger = this.moduleManager.modules["logger"];
		this.setState("INITIALIZING");

		this.initialize().then(() => {
			this.setState("INITIALIZED");
			this.setStage(0);
			this.moduleManager.printStatus();
		}).catch(async (err) => {			
			this.failed = true;

			this.logger.error(err.stack);

			this.moduleManager.aModuleFailed(this);
		});
	}

	_onInitialize() {
		return new Promise(resolve => bus.once(`stateChange:${this.name}:INITIALIZED`, resolve));
	}

	_isInitialized() {
		return new Promise(resolve => {
			if (this.state === "INITIALIZED") resolve();
		});
	}

	_isNotLocked() {
		return new Promise((resolve, reject) => {
			if (this.state === "LOCKDOWN") reject();
			else resolve();
		});
	}

	setState(state) {
		this.state = state;
		bus.emit(`stateChange:${this.name}:${state}`);
		this.logger.info(`MODULE_STATE`, `${state}: ${this.name}`);
	}

	setStage(stage) {
		if (stage !== 1)
			this.totalTimeInitialize += (Date.now() - this.lastTime);
		//this.timeDifferences.push(this.stage + ": " + (Date.now() - this.lastTime) + "ms");
		this.timeDifferences.push(Date.now() - this.lastTime);

		this.lastTime = Date.now();
		this.stage = stage;
		this.moduleManager.printStatus();
	}

	_validateHook() {
		return Promise.race([this._onInitialize(), this._isInitialized()]).then(
			() => this._isNotLocked()
		);
	}

	_lockdown() {
		if (this.lockdown) return;
		this.lockdown = true;
		this.setState("LOCKDOWN");
		this.moduleManager.printStatus();
	}
}