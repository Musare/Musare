'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

process.env.NODE_CONFIG_DIR = process.cwd() + '/backend/config';

// npm modules
const express          = require('express'),
      session          = require('express-session'),
      mongoose         = require('mongoose'),
      mongoStore       = require('connect-mongo')(session),
      bodyParser       = require('body-parser'),
      config           = require('config'),
      request          = require('request'),
      passport         = require('passport'),
      LocalStrategy    = require('passport-local').Strategy,
      passportSocketIo = require("passport.socketio");

// custom modules
const global         = require('./logic/global'),
      coreHandler    = require('./logic/coreHandler'),
      socketHandler  = require('./logic/socketHandler'),
      expressHandler = require('./logic/expressHandler');


// database
const MongoDB = mongoose.connect('mongodb://localhost:27017/musare').connection;

MongoDB.on('error', function(err) {
	console.log('Database error: ' + err.message);
});

MongoDB.once('open', function() {
	console.log('Connected to database');
});

global.db = {
	user: require('./schemas/user')(mongoose),
	station: require('./schemas/station')(mongoose)
};

// setup express and socket.io
const app = express(MongoDB);
const server = app.listen(80);
global.io = require('socket.io')(server);

app.use(passport.initialize());
app.use(passport.session());

app.use(session({
	secret: config.get('secret'),
	store: new mongoStore({ mongooseConnection: MongoDB }),
	resave: true,
	saveUninitialized: true
}));

global.io.use(passportSocketIo.authorize({
	secret: config.get('secret'),
	store: new mongoStore({ mongooseConnection: MongoDB })
}));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

passport.use('local-signup', new LocalStrategy(function(username, password, cb) {
	process.nextTick(function() {
		db.user.findOne({'username' : username }, function(err, user) {
			if (err) return cb(err);
			if (user) return cb(null, false);
			else {
				var newUser = new db.user({
					username: username
				});
				newUser.save(function(err) {
					if (err) throw err;
					return cb(null, newUser);
				});
			}
		});
	});
}));

passport.use('local-login', new LocalStrategy(function(username, password, cb) {
	process.nextTick(function() {
		db.user.findOne({'username' : username }, function(err, user) {
			if (err) return cb(err);
			if (!user) return cb(null, false);
			if (!user.services.token.password == password) return done(null, false);
			return done(null, user);
		});
	});
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(express.static(__dirname + '/../frontend/build/'));

socketHandler(coreHandler, global.io);
expressHandler(coreHandler, app);
