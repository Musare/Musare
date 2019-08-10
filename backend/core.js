const EventEmitter = require('events');

const bus = new EventEmitter();

module.exports = class {
	constructor(name, moduleManager) {
		this.name = name;
		this.moduleManager = moduleManager;
		this.lockdown = false;
		this.dependsOn = [];
		this.eventHandlers = [];
		this.state = "NOT_INITIALIZED";
	}

	_initialize() {
		this.logger = this.moduleManager.modules["logger"];
		this.setState("INITIALIZING");

		this.initialize().then(() => {
			this.setState("INITIALIZED");
		}).catch(() => {
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

	_validateHook() {
		return Promise.race([this._onInitialize, this._isInitialized]).then(
			() => this._isNotLocked()
		);
	}

	_lockdown() {
		this.lockdown = true;
	}
}