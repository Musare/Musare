'use strict';

const mongoose = require('mongoose');

let lib = {

	connection: null,
	schemas: {},
	models: {},

	init: (url, cb) => {

		lib.connection = mongoose.connect(url).connection;

		lib.connection.on('error', err => console.error('Database error: ' + err.message));

		lib.connection.once('open', _ => {

			lib.schemas = {
				song: new mongoose.Schema(require(`./schemas/song`)),
				queueSong: new mongoose.Schema(require(`./schemas/queueSong`)),
				station: new mongoose.Schema(require(`./schemas/station`)),
				user: new mongoose.Schema(require(`./schemas/user`)),
				playlist: new mongoose.Schema(require(`./schemas/playlist`)),
				news: new mongoose.Schema(require(`./schemas/news`)),
				reports: new mongoose.Schema(require(`./schemas/reports`))
			};

			lib.models = {
				song: mongoose.model('song', lib.schemas.song),
				queueSong: mongoose.model('queueSong', lib.schemas.queueSong),
				station: mongoose.model('station', lib.schemas.station),
				user: mongoose.model('user', lib.schemas.user),
				playlist: mongoose.model('playlist', lib.schemas.playlist),
				news: mongoose.model('news', lib.schemas.news),
				reports: mongoose.model('reports', lib.schemas.reports)
			};

			cb();
		});
	}
};

module.exports = lib;
