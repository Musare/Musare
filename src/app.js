'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

// npm modules
const express          = require('express'),
    session          = require('express-session'),
    mongoose         = require('mongoose'),
    mongoStore       = require('connect-mongo')(session),
    bodyParser       = require('body-parser'),
    config           = require('config'),
    request          = require('request'),
    passport         = require('passport'),
    localStrategy    = require('passport-local').Strategy,
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

const db = {
    user: require('./schemas/user')(mongoose)
};

// setup express and socket.io
const app = express(MongoDB);
const server = app.listen(80);
const io = require('socket.io')(server);

global.io = io;
global.db = db;

app.use(passport.initialize());
app.use(passport.session());

app.use(session({
    secret: config.get('secret'),
    store: new mongoStore({ mongooseConnection: MongoDB }),
    resave: true,
    saveUninitialized: true
}));

io.use(passportSocketIo.authorize({
  secret: config.get('secret'),
  store: new mongoStore({ mongooseConnection: MongoDB })
}));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('local-signup', new localStrategy (function(username, password, cb) {
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

passport.use('local-login', new localStrategy (function(username, password, cb) {
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

app.use(express.static(__dirname + '/../public'));

socketHandler(coreHandler, io);
expressHandler(coreHandler, app);