module.exports = (app) => {
	'use strict';

	app.get('/', (req, res) => {
		res.json({
			status: 'success',
			message: 'Coming Soon'
		});
	});

}