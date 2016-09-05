'use strict';

// nodejs modules
const path   = require('path'),
      fs     = require('fs'),
      os     = require('os'),
      events = require('events');

// npm modules
const config    = require('config'),
      request   = require('request'),
      waterfall = require('async/waterfall').
      r         = require('rethinkdb');

// custom modules
const global    = require('./global'),
      passport  = global.passport,
      localStrategy  = global.localStrategy,
      stations = require('./stations');

var eventEmitter = new events.EventEmitter();

module.exports = {

  // auth

  passport.serializeUser(function(user, cb) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, cb) {
    r.table('users').filter({id}).run(rc, (err, cursor) => {
      done(err, cursor.toArray().result);
    });
  });

  app.use(passport.initialize());
  app.use(passport.session());

	// module functions

	on: function (name, cb) {
		eventEmitter.on(name, cb);
	},

	emit: function (name, data) {
		eventEmitter.emit(name, data);
	},

	// core route handlers

	'/users/login': function (user, cb) {},

	'/users/register': function (user, cb) {
    passport.use('local-signup', new localStrategy({
      usernameField : user.email,
      passwordField : user.password,
      passReqToCallback : true
    }, (req, email, password, done) => {
      process.nextTick(() => {
        r.table('users').filter({
    			email: user.email
    		}).run(rc, (err, cursor) => {
    			if (err) return done(err);
    			else {
    				cursor.toArray((err, result) => {
    					if (result) {
    						return done(null, false);
    					} else {
                r.table('authors').insert([{
                  email,
                  password: crypto.createHash('md5').update(password).digest("hex")
                }]).run(connection, function(err, result) {
                  if (err) throw err;
                  return done(null, result);
                  console.log(result);
                });
              }
    				});
    			}
    		});
      });
    }));

  },

	'/stations': function (cb) {
		cb(stations.getStations().map(function (result) {
			return {
				id: result.getId(),
				displayName: result.getDisplayName(),
				description: result.getDescription(),
				users: result.getUsers()
			}
		}));
	},

	'/stations/join/:id': function (id, user, cb) {

		var station = stations.getStation(id);

		if (station) {

			user.stationId = id;

			this.emit('station-joined', {
				user: {
					id: user.id,
					username: user.username
				}
			});

			return cb({
				status: 'joined',
				data: {
					displayName: station.getDisplayName(),
					users: station.getUsers(),
					currentSong: station.getCurrentSong()
				}
			});
		}
		else {
			return cb({ status: 'error', message: 'Room with that ID does not exists' });
		}
	},

	'/stations/search/:query': function (query, cb) {

		var params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=25'
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, function (err, res, body) {
			if (err) {
				return cb({ status: 'error', message: 'Failed to make request' });
			}
			else {
				try {
					return cb({ status: 'success', body: JSON.parse(body) });
				}
				catch (e) {
					return cb({ status: 'error', message: 'Non JSON response' });
				}
			}
		});
	}
};
