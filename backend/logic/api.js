const coreClass = require("../core");

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["app", "db", "cache"];
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.app = this.moduleManager.modules["app"];

			this.app.app.get('/', (req, res) => {
				res.json({
					status: 'success',
					message: 'Coming Soon'
				});
			});

			const actions = require("../logic/actions");
	
			Object.keys(actions).forEach((namespace) => {
				Object.keys(actions[namespace]).forEach((action) => {
					let name = `/${namespace}/${action}`;
	
					this.app.app.get(name, (req, res) => {
						actions[namespace][action](null, (result) => {
							if (typeof cb === 'function') return res.json(result);
						});
					});
				})
			});

			resolve();
		});
	}
}
