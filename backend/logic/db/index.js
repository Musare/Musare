'use strict';

const mongoose = require('mongoose');

const bluebird = require('bluebird');

mongoose.Promise = bluebird;

let lib = {

	connection: null,
	schemas: {},
	models: {},

	init: (url, cb) => {

		lib.connection = mongoose.connect(url).connection;

		lib.connection.on('error', err => {
			console.error('Database error: ' + err.message)
			process.exit();
		});

		lib.connection.once('open', _ => {

			lib.schemas = {
				song: new mongoose.Schema(require(`./schemas/song`)),
				queueSong: new mongoose.Schema(require(`./schemas/queueSong`)),
				station: new mongoose.Schema(require(`./schemas/station`)),
				user: new mongoose.Schema(require(`./schemas/user`)),
				playlist: new mongoose.Schema(require(`./schemas/playlist`)),
				news: new mongoose.Schema(require(`./schemas/news`)),
				report: new mongoose.Schema(require(`./schemas/report`))
			};

			lib.schemas.station.path('_id').validate((id) => {
				return /^[a-z]+$/.test(id);
			}, 'The id can only have the letters a-z.');

			lib.models = {
				song: mongoose.model('song', lib.schemas.song),
				queueSong: mongoose.model('queueSong', lib.schemas.queueSong),
				station: mongoose.model('station', lib.schemas.station),
				user: mongoose.model('user', lib.schemas.user),
				playlist: mongoose.model('playlist', lib.schemas.playlist),
				news: mongoose.model('news', lib.schemas.news),
				report: mongoose.model('report', lib.schemas.report)
			};

			cb();
		});
	}
};

module.exports = lib;
