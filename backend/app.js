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
      passport         = require('passport'),
      bcrypt           = require('bcrypt'),
      LocalStrategy    = require('passport-local').Strategy,
      GitHubStrategy   = require('passport-github').Strategy,
      DiscordStrategy  = require('passport-discord').Strategy,
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
		saveUninitialized: true
	}));

	app.use(passport.initialize());
	app.use(passport.session());

	passport.serializeUser((user, done) => done(null, user));
	passport.deserializeUser((user, done) => done(null, user));

	globals.io.use(passportSocketIo.authorize({
		passport: require('passport'),
		cookieParser: require('cookie-parser'),
		key: 'connect.sid',
		secret: config.get('secret'),
		store: globals.db.store,
		success: (data, accept) => {
			console.log('success', data);
			accept();
		},
		fail: (data, message, error, accept) => {
			console.log('error', error, message);
			accept();
		}
	}));

	passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
		process.nextTick(() => {
			globals.db.user.findOne({ "email.address": email }, (err, user) => {
				if (err) return done(err);
				if (!user) return done(null, false);
				bcrypt.compare(password, user.services.password.password, function(err, res) {
					if (res) {
						return done(null, user);
					} else if (err) {
						return done(err);
					} else {
						return done(null, false);
					}
				});
			});
		});
	}));

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	let corsOptions = Object.assign({}, config.get('cors'));

	app.use(cors(corsOptions));
	app.options('*', cors(corsOptions));

	const coreHandler = require('./logic/coreHandler');
	require('./logic/socketHandler')(coreHandler, globals.io, app);
	require('./logic/expressHandler')(coreHandler, app);
});

