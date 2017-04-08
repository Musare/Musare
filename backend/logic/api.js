let lockdown = false;

module.exports = {
	init: (cb) => {
		const { app } = require('./app.js');
		const actions = require('./actions');

		app.get('/', (req, res) => {
			res.json({
				status: 'success',
				message: 'Coming Soon'
			});
		});

		Object.keys(actions).forEach((namespace) => {
			Object.keys(actions[namespace]).forEach((action) => {
				let name = `/${namespace}/${action}`;

				app.get(name, (req, res) => {
					actions[namespace][action](null, (result) => {
						if (typeof cb === 'function') return res.json(result);
					});
				});
			})
		});

		if (lockdown) return this._lockdown();
		cb();
	},

	_lockdown: () => {
		lockdown = true;
	}
}