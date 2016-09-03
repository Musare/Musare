'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

// npm modules
const express    = require('express'),
      session    = require('express-session'),
      bodyParser = require('body-parser'),
      config     = require('config'),
      request    = require('request'),
      r          = require('rethinkdb');

// custom modules
const coreHandler = require('./logic/coreHandler'),
      socketHandler = require('./logic/socketHandler'),
      expressHandler = require('./logic/expressHandler');

// setup express and socket.io
const app = express();
const server = app.listen(80);
const io = require('socket.io')(server);

// connect to our database before doing anything else
r.connect( { host: 'localhost', port: 28015, db: 'musare' }, (err, conn) => {
	if (err) {
		console.log(err);
	}
	else {

		app.use(session({
			resave: true,
			saveUninitialized: false,
			secret: config.get("secret"),
			cookie: { httpOnly: true, maxAge: 2419200000 }
		}));

		app.use(express.static(__dirname + '/public'));

		coreHandler.setup(conn);

		socketHandler(coreHandler, io);
		expressHandler(coreHandler, app);
	}
});
