'use strict';

// This file contains all the logic for Express

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const config = require('config');

const lib = {

	app: null,
	server: null,

	init: (cb) => {

		let app = lib.app = express();

		lib.server = app.listen(80);

		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));

		let corsOptions = Object.assign({}, config.get('cors'));

		app.use(cors(corsOptions));
		app.options('*', cors(corsOptions));

		cb();
	}
};

module.exports = lib;
