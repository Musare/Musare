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
	  MongoStore       = require('connect-mongo')(session),
      bodyParser       = require('body-parser'),
      config           = require('config'),
	  cors			   = require('cors'),
      request          = require('request'),
      passport         = require('passport'),
      bcrypt           = require('bcrypt'),
      LocalStrategy    = require('passport-local').Strategy,
      GitHubStrategy   = require('passport-github').Strategy,
	  DiscordStrategy  = require('passport-discord').Strategy,
      passportSocketIo = require("passport.socketio");

// global module
const global = require('./logic/global');

// database
const MongoDB = mongoose.connect(`mongodb://${config.get('domain')}:27017/musare`).connection;

MongoDB.on('error', err => {
	console.log('Database error: ' + err.message);
});

MongoDB.once('open', () => {
	console.log('Connected to database');
	setupExpress();
});

// setup express and socket.io
function setupExpress() {
	const app = express(MongoDB);
	const server = app.listen(80);
	global.io = require('socket.io')(server);

	// other custom modules
	const coreHandler = require('./logic/coreHandler'),
		  socketHandler = require('./logic/socketHandler'),
		  expressHandler = require('./logic/expressHandler');

	global.db = {
		user: require('./schemas/user')(mongoose),
		station: require('./schemas/station')(mongoose)
	};

	const mongoStore = new MongoStore({'mongooseConnection': MongoDB});

	app.use(session({
		secret: config.get('secret'),
		key: 'connect.sid',
		store: mongoStore,
		resave: true,
		saveUninitialized: true
	}));

	global.io.use(passportSocketIo.authorize({
		cookieParser: require('cookie-parser'),
		key: 'connect.sid',
		secret: config.get('secret'),
		store: mongoStore,
		success: (data, accept) => {
			accept();
		},
		fail: (data, message, error, accept) => {
			accept();
		}
	}));

	passport.use(new LocalStrategy({usernameField: 'email'}, (email, password, done) => {
		process.nextTick(() => {
			global.db.user.findOne({"email.address": email}, (err, user) => {
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
	app.use(bodyParser.urlencoded({
		extended: true
	}));

	app.use(cors());

	socketHandler(coreHandler, global.io);
	expressHandler(coreHandler, app);
}
