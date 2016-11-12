'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

// npm modules
const express          = require('express'),
      session          = require('express-session'),
      mongoose         = require('mongoose'),
      bodyParser       = require('body-parser'),
      config           = require('config'),
      cookieParser     = require('cookie-parser'),
      cors             = require('cors'),
      request          = require('request'),
      bcrypt           = require('bcrypt'),
      passportSocketIo = require("passport.socketio");

// global module
const globals = require('./logic/globals');

// database
globals.db.connection = mongoose.connect('mongodb://mongo:27017/musare').connection;

globals.db.connection.on('error', err => console.log('Database error: ' + err.message));

globals.db.connection.once('open', _ => {

	console.log('Connected to database');

	const app = express(globals.db.connection);
	const server = app.listen(80);

	globals.io = require('socket.io')(server);

	// load all the schemas from the schemas folder into an object
	globals.db.models =
		// get an array of all the files in the schemas folder
		fs.readdirSync(`${__dirname}/schemas`)
		// remove the .js from the file names
		.map(name => name.split('.').shift())
		// create an object with
		.reduce((db, name) => {
			db[name] = mongoose.model(name, new mongoose.Schema(require(`${__dirname}/schemas/${name}`)));
			return db;
		}, {});

	globals.db.store = new (require('connect-mongo')(session))({ 'mongooseConnection': globals.db.connection });

	app.use(session({
		secret: config.get('secret'),
		key: 'connect.sid',
		store: globals.db.store,
		resave: true,
		saveUninitialized: true,
		cookie: { httpOnly: false }
	}));

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	let corsOptions = Object.assign({}, config.get('cors'));

	app.use(cors(corsOptions));
	app.options('*', cors(corsOptions));

	const coreHandler = require('./logic/coreHandler');
	require('./logic/socketHandler')(coreHandler, globals.io);
	require('./logic/expressHandler')(coreHandler, app);
});
