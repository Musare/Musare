'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

// npm modules
const express          = require('express'),
      session          = require('express-session'),
      store            = require('session-rethinkdb')(session),
      bodyParser       = require('body-parser'),
      config           = require('config'),
      request          = require('request'),
      r                = require('rethinkdb'),
      passport         = require('passport'),
      local            = require('passport-local').Strategy,
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
r.connect( { host: 'localhost', port: 28015, db: 'musare' }, (err, rc) => {
	if (err) {
		console.log(err);
	} else {

		global.rc = rc;
		global.io = io;
    global.passport = passport;
    global.localStrategy = local;

    const store = new RDBStore(r);

    app.use(session({
      secret: config.get('secret'),
      store,
      resave: true,
      saveUninitialized: true
    }));

    io.use(passportSocketIo.authorize({
      secret: config.get('secret'),
      store,
    }));

		app.use(express.static(__dirname + '/../public'));

		socketHandler(coreHandler, io);
		expressHandler(coreHandler, app);
	}
});
