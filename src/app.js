'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

// npm modules
const express          = require('express'),
      session          = require('express-session'),
      rethinkdbStore   = require('session-rethinkdb')(session),
      bodyParser       = require('body-parser'),
      config           = require('config'),
      request          = require('request'),
      r                = require('rethinkdb'),
      passport         = require('passport'),
      localStrategy    = require('passport-local').Strategy,
      passportSocketIo = require("passport.socketio");

// custom modules
const global         = require('./logic/global'),
      coreHandler    = require('./logic/coreHandler'),
      socketHandler  = require('./logic/socketHandler'),
      expressHandler = require('./logic/expressHandler');

// setup express and socket.io
const app = express();
const server = app.listen(80);
const io = require('socket.io')(server);

// connect to our database before doing anything else
r.connect( { host: 'localhost', port: 28015, db: 'musare' }, function(err, rc) {
	if (err) {
		console.log(err);
	} else {

		global.rc = rc;
		global.io = io;

        const store = new rethinkdbStore(r);

        app.use(passport.initialize());
        app.use(passport.session());

        app.use(session({
          secret: config.get('secret'),
          store,
          resave: true,
          saveUninitialized: true
        }));

        io.use(passportSocketIo.authorize({
          secret: config.get('secret'),
          store: store,
        }));

        passport.serializeUser(function(user, done) {
            done(null, user);
        });

        passport.deserializeUser(function(user, done) {
            done(null, user);
        });

        passport.use(new localStrategy(function(username, password, done) {
            process.nextTick(function() {
                r.table('users').filter({
                    username: username
                }).run(rc, function (err, cursor) {
                    if (err) return done(err);
                    cursor.toArray(function (err, result) {
                        if (!result) return done(null, false);
                        if (result.password != password) return done(null, false);
                        return done(null, user);
                    });
                });
            });
        }));

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));

		app.use(express.static(__dirname + '/../public'));

		socketHandler(coreHandler, io);
		expressHandler(coreHandler, app);
    }
});
