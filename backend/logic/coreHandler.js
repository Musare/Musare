'use strict';

// nodejs modules
const path   = require('path'),
      fs     = require('fs'),
      os     = require('os'),
      events = require('events');

// npm modules
const config    = require('config'),
      request   = require('request'),
      waterfall = require('async/waterfall'),
      bcrypt = require('bcrypt'),
	  passport  = require('passport');

// custom modules
const global   = require('./global'),
	  stations = require('./stations');

var eventEmitter = new events.EventEmitter();

const edmStation = new stations.Station("edm", {
	"genres": ["edm"],
	playlist: [
		{
			id: "dQw4w9WgXcQ",
			title: "Never gonna give you up",
			artists: ["Rick Astley"],
			duration: 20,
			thumbnail: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1
		},
		{
			id: "GxBSyx85Kp8",
			title: "Yeah!",
			artists: ["Usher"],
			duration: 20,
			thumbnail: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1
		}
	],
	currentSongIndex: 0,
	paused: false,
	displayName: "EDM",
	description: "EDM Music"
});

const popStation = new stations.Station("pop", {
	"genres": ["pop"],
	playlist: [
		{
			id: "HXeYRs_zR6w",
			title: "Nobody But Me",
			artists: ["Michael Bublé"],
			duration: 12,
			thumbnail: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1
		},
		{
			id: "CR4YE7htLgI",
			title: "Someday ",
			artists: ["Michael Bublé", "Meghan Trainor"],
			duration: 30,
			thumbnail: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1
		}
	],
	currentSongIndex: 0,
	paused: false,
	displayName: "Pop",
	description: "Pop Music"
});

stations.addStation(edmStation);
stations.addStation(popStation);

module.exports = {

	// module functions

	on: (name, cb) => {
		eventEmitter.on(name, cb);
	},

	emit: (name, data) => {
		eventEmitter.emit(name, data);
	},

	// core route handlers

	'/users/register': (username, email, password, recaptcha, cb) => {
		console.log(username, password);
		request({
			url: 'https://www.google.com/recaptcha/api/siteverify',
			method: 'POST',
			form: {
				'secret': config.get("apis.recapthca.secret"),
				'response': recaptcha
			}
		}, function (error, response, body) {
			if (error === null && JSON.parse(body).success === true) {
				body = JSON.parse(body);
				global.db.user.findOne({'username': username}, function (err, user) {
					console.log(err, user);
					if (err) return cb(err);
					if (user) return cb("username");
					else {
						global.db.user.findOne({'email.address': email}, function (err, user) {
							console.log(err, user);
							if (err) return cb(err);
							if (user) return cb("email");
							else {
								// TODO: Email verification code, send email
								bcrypt.genSalt(10, function (err, salt) {
									if (err) {
										return cb(err);
									} else {
										bcrypt.hash(password, salt, function (err, hash) {
											if (err) {
												return cb(err);
											} else {
												let newUser = new global.db.user({
													username: username,
													email: {
														address: email,
														verificationToken: global.generateRandomString("64")
													},
													services: {
														password: {
															password: hash
														}
													}
												});
												newUser.save(function (err) {
													if (err) throw err;
													return cb(null, newUser);
												});
											}
										});
									}
								});
							}
						});
					}
				});
			} else {
				cb("Recaptcha failed");
			}
		});
	},

	'/stations': cb => {
		cb(stations.getStations().map(station => {
			return {
				id: station.id,
				playlist: station.playlist,
				displayName: station.displayName,
				description: station.description,
				currentSongIndex: station.currentSongIndex,
				users: station.users
			}
		}));
	},

	'/stations/join/:id': (id, cb) => {
		stations.getStation(id).users = stations.getStation(id).users + 1;
		cb(stations.getStation(id).users);
	},

	'/stations/leave/:id': (id, cb) => {
		if (stations.getStation(id)) {
			stations.getStation(id).users = stations.getStation(id).users - 1;
			if (cb) cb(stations.getStation(id).users);
		}
	},

	'/youtube/getVideo/:query': (query, cb) => {
		const params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=15'
		].join('&');
		// function params(type, id) {
		// 	if (type == "search") {
		// 		return [
		// 			'part=snippet',
		// 			`q=${encodeURIComponent(query)}`,
		// 			`key=${config.get('apis.youtube.key')}`,
		// 			'type=video',
		// 			'maxResults=15'
		// 		].join('&');
		// 	} else if (type == "video") {
		// 		return [
		// 			'part=snippet,contentDetails,statistics,status',
		// 			`id=${encodeURIComponent(id)}`,
		// 			`key=${config.get('apis.youtube.key')}`
		// 		].join('&');
		// 	}
		// }

		// let finalResults = [];

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, (err, res, body) => {
			cb(body);
			// for (let i = 0; i < results.items.length; i++) {
			// 	request(`https://www.googleapis.com/youtube/v3/videos?${
			// 		params("video", results.items[i].id.videoId)
			// 	}`, (err, res, body) => {
			// 		finalResults.push(JSON.parse(body));
			// 	});
			// }
			// setTimeout(() => {
			// 	return cb(finalResults);
			// }, 500);
		});
	},

	'/songs/queue/add/:song': (song, user, cb) => {
		if (user.logged_in) {
				// if (songs.length > 0) {
				// 	let failed = 0;
				// 	let success = 0;
				// 	songs.forEach(function (song) {
				// 		if (typeof song === "object" && song !== null) {
				// 			let obj = {};
				// 			obj.title = song.title;
				// 			obj._id = song.id;
				// 			obj.artists = [];
				// 			obj.image = "test";
				// 			obj.duration = 0;
				// 			obj.genres = ["edm"];
				// 			//TODO Get data from Wikipedia and Spotify
				// 			obj.requestedBy = user._id;
				// 			console.log(user._id);
				// 			console.log(user);
				// 			obj.requestedAt = Date.now();
				// 			let queueSong = new global.db.queueSong(obj);
				// 			queueSong.save(function(err) {
				// 				console.log(err);
				// 				if (err) failed++;
				// 				else success++;
				// 			});
				// 		} else {
				// 			failed++;
				// 		}
				// 	});
				// 	cb({success, failed});
				// } else {
				// 	cb({err: "No songs supplied."});
				// }
				console.log(song);
			} else {
			cb({err: "Not logged in."});
		}
	},

	'/songs/queue/getSongs': (user, cb) => {
		if (user !== null && user !== undefined && user.logged_in) {
			global.db.queueSong.find({}, function(err, songs) {
				if (err) throw err;
				else cb({songs: songs});
			});
		} else {
			cb({err: "Not logged in."});
		}
	},

	'/songs/queue/updateSong/:id': (user, id, object, cb) => {
		if (user !== null && user !== undefined && user.logged_in) {
			global.db.queueSong.findOne({_id: id}, function(err, song) {
				if (err) throw err;
				else {
					if (song !== undefined && song !== null) {
						if (typeof object === "object" && object !== null) {
							delete object.requestedBy;
							delete object.requestedAt;
							global.db.queueSong.update({_id: id}, {$set: object}, function(err, song) {
								if (err) throw err;
								cb({success: true});
							});
						} else {
							cb({err: "Invalid data."});
						}
					} else {
						cb({err: "Song not found."});
					}
				}
			});
		} else {
			cb({err: "Not logged in."});
		}
	}
};
