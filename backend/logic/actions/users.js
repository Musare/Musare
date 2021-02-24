import config from "config";

import async from "async";

import axios from "axios";
import bcrypt from "bcrypt";
import sha256 from "sha256";
import { isAdminRequired, isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const IOModule = moduleManager.modules.io;
const CacheModule = moduleManager.modules.cache;
const MailModule = moduleManager.modules.mail;
const PunishmentsModule = moduleManager.modules.punishments;
const ActivitiesModule = moduleManager.modules.activities;
const PlaylistsModule = moduleManager.modules.playlists;

CacheModule.runJob("SUB", {
	channel: "user.updatePreferences",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("keep.event:user.preferences.changed", res.preferences);
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updateOrderOfPlaylists",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.orderOfPlaylists.changed", res.orderOfPlaylists);
			});
		});

		IOModule.runJob("EMIT_TO_ROOM", {
			room: `profile-${res.userId}-playlists`,
			args: ["event:user.orderOfPlaylists.changed", res.orderOfPlaylists]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updateUsername",
	cb: user => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: user._id }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.username.changed", user.username);
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.removeSessions",
	cb: userId => {
		IOModule.runJob("SOCKETS_FROM_USER_WITHOUT_CACHE", { userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("keep.event:user.session.removed");
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.linkPassword",
	cb: userId => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.linkPassword");
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.unlinkPassword",
	cb: userId => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.unlinkPassword");
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.linkGithub",
	cb: userId => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.linkGithub");
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.unlinkGithub",
	cb: userId => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.unlinkGithub");
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.ban",
	cb: data => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("keep.event:banned", data.punishment);
				socket.disconnect(true);
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.favoritedStation",
	cb: data => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.favoritedStation", data.stationId);
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.unfavoritedStation",
	cb: data => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:user.unfavoritedStation", data.stationId);
			});
		});
	}
});

export default {
	/**
	 * Lists all Users
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: isAdminRequired(async function index(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.find({}).exec(next);
				}
			],
			async (err, users) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "USER_INDEX", `Indexing users failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "USER_INDEX", `Indexing users successful.`);
				const filteredUsers = [];
				users.forEach(user => {
					filteredUsers.push({
						_id: user._id,
						name: user.name,
						username: user.username,
						role: user.role,
						liked: user.liked,
						disliked: user.disliked,
						songsRequested: user.statistics.songsRequested,
						email: {
							address: user.email.address,
							verified: user.email.verified
						},
						avatar: {
							type: user.avatar.type,
							url: user.avatar.url,
							color: user.avatar.color
						},
						hasPassword: !!user.services.password,
						services: { github: user.services.github }
					});
				});
				return cb({ status: "success", data: filteredUsers });
			}
		);
	}),

	/**
	 * Removes all data held on a user, including their ability to login
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	remove: isLoginRequired(async function remove(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		async.waterfall(
			[
				next => {
					activityModel.deleteMany({ userId: session.userId }, next);
				},

				(res, next) => {
					stationModel.deleteMany({ owner: session.userId }, next);
				},

				(res, next) => {
					playlistModel.deleteMany({ createdBy: session.userId }, next);
				},

				(res, next) => {
					userModel.deleteMany({ _id: session.userId }, next);
				}
			],
			async err => {
				console.log(err);

				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"USER_REMOVE",
						`Removing data and account for user "${session.userId}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"USER_REMOVE",
					`Successfully removed data and account for user "${session.userId}"`
				);

				return cb({
					status: "success",
					message: "Successfully removed data and account."
				});
			}
		);
	}),

	/**
	 * Logs user in
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} identifier - the email of the user
	 * @param {string} password - the plaintext of the user
	 * @param {Function} cb - gets called with the result
	 */
	async login(session, identifier, password, cb) {
		identifier = identifier.toLowerCase();
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const sessionSchema = await CacheModule.runJob("GET_SCHEMA", { schemaName: "session" }, this);

		async.waterfall(
			[
				// check if a user with the requested identifier exists
				next => {
					userModel.findOne(
						{
							$or: [{ "email.address": identifier }]
						},
						next
					);
				},

				// if the user doesn't exist, respond with a failure
				// otherwise compare the requested password and the actual users password
				(user, next) => {
					if (!user) return next("User not found");
					if (!user.services.password || !user.services.password.password)
						return next("The account you are trying to access uses GitHub to log in.");

					return bcrypt.compare(sha256(password), user.services.password.password, (err, match) => {
						if (err) return next(err);
						if (!match) return next("Incorrect password");
						return next(null, user);
					});
				},

				(user, next) => {
					UtilsModule.runJob("GUID", {}, this).then(sessionId => {
						next(null, user, sessionId);
					});
				},

				(user, sessionId, next) => {
					CacheModule.runJob(
						"HSET",
						{
							table: "sessions",
							key: sessionId,
							value: sessionSchema(sessionId, user._id)
						},
						this
					)
						.then(() => {
							next(null, sessionId);
						})
						.catch(next);
				}
			],
			async (err, sessionId) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"USER_PASSWORD_LOGIN",
						`Login failed with password for user "${identifier}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "USER_PASSWORD_LOGIN", `Login successful with password for user "${identifier}"`);

				return cb({
					status: "success",
					message: "Login successful",
					user: {},
					SID: sessionId
				});
			}
		);
	},

	/**
	 * Registers a new user
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} username - the username for the new user
	 * @param {string} email - the email for the new user
	 * @param {string} password - the plaintext password for the new user
	 * @param {object} recaptcha - the recaptcha data
	 * @param {Function} cb - gets called with the result
	 */
	async register(session, username, email, password, recaptcha, cb) {
		email = email.toLowerCase();
		const verificationToken = await UtilsModule.runJob(
			"GENERATE_RANDOM_STRING",
			{
				length: 64
			},
			this
		);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const verifyEmailSchema = await MailModule.runJob(
			"GET_SCHEMA",
			{
				schemaName: "verifyEmail"
			},
			this
		);

		async.waterfall(
			[
				next => {
					if (config.get("registrationDisabled") === true)
						return next("Registration is not allowed at this time.");
					return next();
				},

				next => {
					if (!DBModule.passwordValid(password))
						return next("Invalid password. Check if it meets all the requirements.");
					return next();
				},

				// verify the request with google recaptcha
				next => {
					if (config.get("apis.recaptcha.enabled") === true)
						axios
							.post("https://www.google.com/recaptcha/api/siteverify", {
								data: {
									secret: config.get("apis").recaptcha.secret,
									response: recaptcha
								}
							})
							.then(res => next(null, res.data))
							.catch(err => next(err));
					else next(null, null, null);
				},

				// check if the response from Google recaptcha is successful
				// if it is, we check if a user with the requested username already exists
				(body, next) => {
					if (config.get("apis.recaptcha.enabled") === true)
						if (body.success !== true) return next("Response from recaptcha was not successful.");

					return userModel.findOne({ username: new RegExp(`^${username}$`, "i") }, next);
				},

				// if the user already exists, respond with that
				// otherwise check if a user with the requested email already exists
				(user, next) => {
					if (user) return next("A user with that username already exists.");
					return userModel.findOne({ "email.address": email }, next);
				},

				// if the user already exists, respond with that
				// otherwise, generate a salt to use with hashing the new users password
				(user, next) => {
					if (user) return next("A user with that email already exists.");
					return bcrypt.genSalt(10, next);
				},

				// hash the password
				(salt, next) => {
					bcrypt.hash(sha256(password), salt, next);
				},

				(hash, next) => {
					UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 12 }, this).then(_id => {
						next(null, hash, _id);
					});
				},

				// create the user object
				(hash, _id, next) => {
					next(null, {
						_id,
						username,
						email: {
							address: email,
							verificationToken
						},
						services: {
							password: {
								password: hash
							}
						}
					});
				},

				// generate the url for gravatar avatar
				(user, next) => {
					UtilsModule.runJob(
						"CREATE_GRAVATAR",
						{
							email: user.email.address
						},
						this
					).then(url => {
						user.avatar = {
							type: "gravatar",
							url
						};
						next(null, user);
					});
				},

				// save the new user to the database
				(user, next) => {
					userModel.create(user, next);
				},

				// respond with the new user
				(user, next) => {
					verifyEmailSchema(email, username, verificationToken, err => {
						next(err, user._id);
					});
				},

				// create a liked songs playlist for the new user
				(userId, next) => {
					PlaylistsModule.runJob("CREATE_READ_ONLY_PLAYLIST", {
						userId,
						displayName: "Liked Songs",
						type: "user"
					})
						.then(likedSongsPlaylist => {
							next(null, likedSongsPlaylist, userId);
						})
						.catch(err => next(err));
				},

				// create a disliked songs playlist for the new user
				(likedSongsPlaylist, userId, next) => {
					PlaylistsModule.runJob("CREATE_READ_ONLY_PLAYLIST", {
						userId,
						displayName: "Disliked Songs",
						type: "user"
					})
						.then(dislikedSongsPlaylist => {
							next(null, { likedSongsPlaylist, dislikedSongsPlaylist }, userId);
						})
						.catch(err => next(err));
				},

				// associate liked + disliked songs playlist to the user object
				({ likedSongsPlaylist, dislikedSongsPlaylist }, userId, next) => {
					userModel.updateOne(
						{ _id: userId },
						{ $set: { likedSongsPlaylist, dislikedSongsPlaylist } },
						{ runValidators: true },
						err => {
							if (err) return next(err);
							return next(null, userId);
						}
					);
				}
			],
			async (err, userId) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"USER_PASSWORD_REGISTER",
						`Register failed with password for user "${username}"."${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId,
					type: "user__joined",
					payload: { message: "Welcome to Musare!" }
				});

				this.log(
					"SUCCESS",
					"USER_PASSWORD_REGISTER",
					`Register successful with password for user "${username}".`
				);

				const result = await this.module.runJob(
					"RUN_ACTION2",
					{
						session,
						namespace: "users",
						action: "login",
						args: [email, password]
					},
					this
				);

				const obj = {
					status: "success",
					message: "Successfully registered."
				};
				if (result.status === "success") {
					obj.SID = result.SID;
				}

				return cb(obj);
			}
		);
	},

	/**
	 * Logs out a user
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	logout(session, cb) {
		async.waterfall(
			[
				next => {
					CacheModule.runJob("HGET", { table: "sessions", key: session.sessionId }, this)
						.then(session => next(null, session))
						.catch(next);
				},

				(session, next) => {
					if (!session) return next("Session not found");
					return next(null, session);
				},

				(session, next) => {
					CacheModule.runJob("HDEL", { table: "sessions", key: session.sessionId }, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "USER_LOGOUT", `Logout failed. "${err}" `);
					cb({ status: "failure", message: err });
				} else {
					this.log("SUCCESS", "USER_LOGOUT", `Logout successful.`);
					cb({
						status: "success",
						message: "Successfully logged out."
					});
				}
			}
		);
	},

	/**
	 * Removes all sessions for a user
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} userId - the id of the user we are trying to delete the sessions of
	 * @param {Function} cb - gets called with the result
	 */
	removeSessions: isLoginRequired(async function removeSessions(session, userId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findOne({ _id: session.userId }, (err, user) => {
						if (err) return next(err);
						if (user.role !== "admin" && session.userId !== userId)
							return next("Only admins and the owner of the account can remove their sessions.");
						return next();
					});
				},

				next => {
					CacheModule.runJob("HGETALL", { table: "sessions" }, this)
						.then(sessions => {
							next(null, sessions);
						})
						.catch(next);
				},

				(sessions, next) => {
					if (!sessions) return next("There are no sessions for this user to remove.");

					const keys = Object.keys(sessions);

					return next(null, keys, sessions);
				},

				(keys, sessions, next) => {
					CacheModule.runJob("PUB", {
						channel: "user.removeSessions",
						value: userId
					});

					async.each(
						keys,
						(sessionId, callback) => {
							const session = sessions[sessionId];
							if (session.userId === userId) {
								// TODO Also maybe add this to this runJob
								CacheModule.runJob("HDEL", {
									channel: "sessions",
									key: sessionId
								})
									.then(() => {
										callback(null);
									})
									.catch(next);
							}
						},
						err => {
							next(err);
						}
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REMOVE_SESSIONS_FOR_USER",
						`Couldn't remove all sessions for user "${userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "REMOVE_SESSIONS_FOR_USER", `Removed all sessions for user "${userId}".`);
				return cb({
					status: "success",
					message: "Successfully removed all sessions."
				});
			}
		);
	}),

	/**
	 * Updates the order of a user's playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Array} orderOfPlaylists - array of playlist ids (with a specific order)
	 * @param {Function} cb - gets called with the result
	 */
	updateOrderOfPlaylists: isLoginRequired(async function updateOrderOfPlaylists(session, orderOfPlaylists, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.updateOne(
						{ _id: session.userId },
						{ $set: { "preferences.orderOfPlaylists": orderOfPlaylists } },
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_ORDER_OF_USER_PLAYLISTS",
						`Couldn't update order of playlists for user "${session.userId}" to "${orderOfPlaylists}". "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "user.updateOrderOfPlaylists",
					value: {
						orderOfPlaylists,
						userId: session.userId
					}
				});

				this.log(
					"SUCCESS",
					"UPDATE_ORDER_OF_USER_PLAYLISTS",
					`Updated order of playlists for user "${session.userId}" to "${orderOfPlaylists}".`
				);

				return cb({
					status: "success",
					message: "Order of playlists successfully updated"
				});
			}
		);
	}),

	/**
	 * Updates a user's preferences
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {object} preferences - object containing preferences
	 * @param {boolean} preferences.nightmode - whether or not the user is using the night mode theme
	 * @param {boolean} preferences.autoSkipDisliked - whether to automatically skip disliked songs
	 * @param {boolean} preferences.activityLogPublic - whether or not a user's activity log can be publicly viewed
	 * @param {Function} cb - gets called with the result
	 */
	updatePreferences: isLoginRequired(async function updatePreferences(session, preferences, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findByIdAndUpdate(
						session.userId,
						{
							$set: {
								preferences: {
									nightmode: preferences.nightmode,
									autoSkipDisliked: preferences.autoSkipDisliked,
									activityLogPublic: preferences.activityLogPublic
								}
							}
						},
						{ new: false },
						next
					);
				}
			],
			async (err, user) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_USER_PREFERENCES",
						`Couldn't update preferences for user "${session.userId}" to "${JSON.stringify(
							preferences
						)}". "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "user.updatePreferences",
					value: {
						preferences,
						userId: session.userId
					}
				});

				if (preferences.nightmode !== user.preferences.nightmode)
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "user__toggle_nightmode",
						payload: { message: preferences.nightmode ? "Enabled nightmode" : "Disabled nightmode" }
					});

				if (preferences.autoSkipDisliked !== user.preferences.autoSkipDisliked)
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "user__toggle_autoskip_disliked_songs",
						payload: {
							message: preferences.autoSkipDisliked
								? "Enabled the autoskipping of your disliked songs"
								: "Disabled the autoskipping of your disliked songs"
						}
					});

				this.log(
					"SUCCESS",
					"UPDATE_USER_PREFERENCES",
					`Updated preferences for user "${session.userId}" to "${JSON.stringify(preferences)}".`
				);

				return cb({
					status: "success",
					message: "Preferences successfully updated"
				});
			}
		);
	}),

	/**
	 * Retrieves a user's preferences
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	getPreferences: isLoginRequired(async function updatePreferences(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findById(session.userId).select({ preferences: -1 }).exec(next);
				}
			],
			async (err, { preferences }) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"GET_USER_PREFERENCES",
						`Couldn't retrieve preferences for user "${session.userId}". "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"GET_USER_PREFERENCES",
					`Successfully obtained preferences for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Preferences successfully retrieved",
					data: preferences
				});
			}
		);
	}),

	/**
	 * Gets user object from username (only a few properties)
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} username - the username of the user we are trying to find
	 * @param {Function} cb - gets called with the result
	 */
	findByUsername: async function findByUsername(session, username, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findOne({ username: new RegExp(`^${username}$`, "i") }, next);
				},

				(account, next) => {
					if (!account) return next("User not found.");
					return next(null, account);
				}
			],
			async (err, account) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log("ERROR", "FIND_BY_USERNAME", `User not found for username "${username}". "${err}"`);

					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "FIND_BY_USERNAME", `User found for username "${username}".`);

				return cb({
					status: "success",
					data: {
						_id: account._id,
						name: account.name,
						username: account.username,
						location: account.location,
						bio: account.bio,
						role: account.role,
						avatar: account.avatar,
						createdAt: account.createdAt
					}
				});
			}
		);
	},

	/**
	 * Gets a username from an userId
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} userId - the userId of the person we are trying to get the username from
	 * @param {Function} cb - gets called with the result
	 */
	async getUsernameFromId(session, userId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		userModel
			.findById(userId)
			.then(user => {
				if (user) {
					this.log("SUCCESS", "GET_USERNAME_FROM_ID", `Found username for userId "${userId}".`);

					return cb({
						status: "success",
						data: user.username
					});
				}

				this.log(
					"ERROR",
					"GET_USERNAME_FROM_ID",
					`Getting the username from userId "${userId}" failed. User not found.`
				);

				return cb({
					status: "failure",
					message: "Couldn't find the user."
				});
			})
			.catch(async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"GET_USERNAME_FROM_ID",
						`Getting the username from userId "${userId}" failed. "${err}"`
					);
					cb({ status: "failure", message: err });
				}
			});
	},

	/**
	 * Gets a user from a userId
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} userId - the userId of the person we are trying to get the username from
	 * @param {Function} cb - gets called with the result
	 */
	getUserFromId: isAdminRequired(async function getUserFromId(session, userId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		userModel
			.findById(userId)
			.then(user => {
				if (user) {
					this.log("SUCCESS", "GET_USER_FROM_ID", `Found user for userId "${userId}".`);

					return cb({
						status: "success",
						data: {
							_id: user._id,
							username: user.username,
							role: user.role,
							liked: user.liked,
							disliked: user.disliked,
							songsRequested: user.statistics.songsRequested,
							email: {
								address: user.email.address,
								verified: user.email.verified
							},
							hasPassword: !!user.services.password,
							services: { github: user.services.github }
						}
					});
				}

				this.log(
					"ERROR",
					"GET_USER_FROM_ID",
					`Getting the user from userId "${userId}" failed. User not found.`
				);

				return cb({
					status: "failure",
					message: "Couldn't find the user."
				});
			})
			.catch(async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_USER_FROM_ID", `Getting the user from userId "${userId}" failed. "${err}"`);
					cb({ status: "failure", message: err });
				}
			});
	}),

	// TODO Fix security issues
	/**
	 * Gets user info from session
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	async findBySession(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					CacheModule.runJob(
						"HGET",
						{
							table: "sessions",
							key: session.sessionId
						},
						this
					)
						.then(session => next(null, session))
						.catch(next);
				},

				(session, next) => {
					if (!session) return next("Session not found.");
					return next(null, session);
				},

				(session, next) => {
					userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					return next(null, user);
				}
			],
			async (err, user) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "FIND_BY_SESSION", `User not found. "${err}"`);
					return cb({ status: "failure", message: err });
				}

				const data = {
					email: {
						address: user.email.address
					},
					avatar: user.avatar,
					username: user.username,
					name: user.name,
					location: user.location,
					bio: user.bio
				};

				if (user.services.password && user.services.password.password) data.password = true;
				if (user.services.github && user.services.github.id) data.github = true;

				this.log("SUCCESS", "FIND_BY_SESSION", `User found. "${user.username}".`);
				return cb({
					status: "success",
					data
				});
			}
		);
	},

	/**
	 * Updates a user's username
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newUsername - the new username
	 * @param {Function} cb - gets called with the result
	 */
	updateUsername: isLoginRequired(async function updateUsername(session, updatingUserId, newUsername, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next(null, true);
					return userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (user !== true && (!user || user.role !== "admin")) return next("Invalid permissions.");
					return userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					if (user.username === newUsername)
						return next("New username can't be the same as the old username.");
					return next(null);
				},

				next => {
					userModel.findOne({ username: new RegExp(`^${newUsername}$`, "i") }, next);
				},

				(user, next) => {
					if (!user) return next();
					if (user._id === updatingUserId) return next();
					return next("That username is already in use.");
				},

				next => {
					userModel.updateOne(
						{ _id: updatingUserId },
						{ $set: { username: newUsername } },
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_USERNAME",
						`Couldn't update username for user "${updatingUserId}" to username "${newUsername}". "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "user.updateUsername",
					value: {
						username: newUsername,
						_id: updatingUserId
					}
				});

				this.log(
					"SUCCESS",
					"UPDATE_USERNAME",
					`Updated username for user "${updatingUserId}" to username "${newUsername}".`
				);

				return cb({
					status: "success",
					message: "Username updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's email
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newEmail - the new email
	 * @param {Function} cb - gets called with the result
	 */
	updateEmail: isLoginRequired(async function updateEmail(session, updatingUserId, newEmail, cb) {
		newEmail = newEmail.toLowerCase();
		const verificationToken = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 64 }, this);

		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const verifyEmailSchema = await MailModule.runJob("GET_SCHEMA", { schemaName: "verifyEmail" }, this);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next(null, true);
					return userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (user !== true && (!user || user.role !== "admin")) return next("Invalid permissions.");
					return userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					if (user.email.address === newEmail)
						return next("New email can't be the same as your the old email.");
					return next();
				},

				next => {
					userModel.findOne({ "email.address": newEmail }, next);
				},

				(user, next) => {
					if (!user) return next();
					if (user._id === updatingUserId) return next();
					return next("That email is already in use.");
				},

				// regenerate the url for gravatar avatar
				next => {
					UtilsModule.runJob("CREATE_GRAVATAR", { email: newEmail }, this).then(url => {
						next(null, url);
					});
				},

				(newAvatarUrl, next) => {
					userModel.updateOne(
						{ _id: updatingUserId },
						{
							$set: {
								"avatar.url": newAvatarUrl,
								"email.address": newEmail,
								"email.verified": false,
								"email.verificationToken": verificationToken
							}
						},
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					verifyEmailSchema(newEmail, user.username, verificationToken, err => {
						next(err);
					});
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_EMAIL",
						`Couldn't update email for user "${updatingUserId}" to email "${newEmail}". '${err}'`
					);

					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"UPDATE_EMAIL",
					`Updated email for user "${updatingUserId}" to email "${newEmail}".`
				);

				return cb({
					status: "success",
					message: "Email updated successfully."
				});
			}
		);
	}),

	/**
	 * Updates a user's name
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newBio - the new name
	 * @param {Function} cb - gets called with the result
	 */
	updateName: isLoginRequired(async function updateName(session, updatingUserId, newName, cb) {
		const userModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "user"
			},
			this
		);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next(null, true);
					return userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (user !== true && (!user || user.role !== "admin")) return next("Invalid permissions.");
					return userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					return userModel.updateOne(
						{ _id: updatingUserId },
						{ $set: { name: newName } },
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"UPDATE_NAME",
						`Couldn't update name for user "${updatingUserId}" to name "${newName}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_name",
					payload: { message: `Changed name to ${newName}` }
				});

				this.log("SUCCESS", "UPDATE_NAME", `Updated name for user "${updatingUserId}" to name "${newName}".`);

				return cb({
					status: "success",
					message: "Name updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's location
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newLocation - the new location
	 * @param {Function} cb - gets called with the result
	 */
	updateLocation: isLoginRequired(async function updateLocation(session, updatingUserId, newLocation, cb) {
		const userModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "user"
			},
			this
		);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next(null, true);
					return userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (user !== true && (!user || user.role !== "admin")) return next("Invalid permissions.");
					return userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					return userModel.updateOne(
						{ _id: updatingUserId },
						{ $set: { location: newLocation } },
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_LOCATION",
						`Couldn't update location for user "${updatingUserId}" to location "${newLocation}". "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_location",
					payload: { message: `Changed location to ${newLocation}` }
				});

				this.log(
					"SUCCESS",
					"UPDATE_LOCATION",
					`Updated location for user "${updatingUserId}" to location "${newLocation}".`
				);

				return cb({
					status: "success",
					message: "Location updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's bio
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newBio - the new bio
	 * @param {Function} cb - gets called with the result
	 */
	updateBio: isLoginRequired(async function updateBio(session, updatingUserId, newBio, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next(null, true);
					return userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (user !== true && (!user || user.role !== "admin")) return next("Invalid permissions.");
					return userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					return userModel.updateOne(
						{ _id: updatingUserId },
						{ $set: { bio: newBio } },
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"UPDATE_BIO",
						`Couldn't update bio for user "${updatingUserId}" to bio "${newBio}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_bio",
					payload: { message: `Changed bio to ${newBio}` }
				});

				this.log("SUCCESS", "UPDATE_BIO", `Updated bio for user "${updatingUserId}" to bio "${newBio}".`);

				return cb({
					status: "success",
					message: "Bio updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates the type of a user's avatar
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newType - the new type
	 * @param {Function} cb - gets called with the result
	 */
	updateAvatarType: isLoginRequired(async function updateAvatarType(session, updatingUserId, newAvatar, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next(null, true);
					return userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (user !== true && (!user || user.role !== "admin")) return next("Invalid permissions.");
					return userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					return userModel.findOneAndUpdate(
						{ _id: updatingUserId },
						{ $set: { "avatar.type": newAvatar.type, "avatar.color": newAvatar.color } },
						{ new: true, runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"UPDATE_AVATAR_TYPE",
						`Couldn't update avatar type for user "${updatingUserId}" to type "${newAvatar.type}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_avatar",
					payload: { message: `Changed avatar to use ${newAvatar.type}` }
				});

				this.log(
					"SUCCESS",
					"UPDATE_AVATAR_TYPE",
					`Updated avatar type for user "${updatingUserId}" to type "${newAvatar.type}".`
				);

				return cb({
					status: "success",
					message: "Avatar type updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's role
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newRole - the new role
	 * @param {Function} cb - gets called with the result
	 */
	updateRole: isAdminRequired(async function updateRole(session, updatingUserId, newRole, cb) {
		newRole = newRole.toLowerCase();
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findOne({ _id: updatingUserId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					if (user.role === newRole) return next("New role can't be the same as the old role.");
					return next();
				},
				next => {
					userModel.updateOne(
						{ _id: updatingUserId },
						{ $set: { role: newRole } },
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_ROLE",
						`User "${session.userId}" couldn't update role for user "${updatingUserId}" to role "${newRole}". "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"UPDATE_ROLE",
					`User "${session.userId}" updated the role of user "${updatingUserId}" to role "${newRole}".`
				);

				return cb({
					status: "success",
					message: "Role successfully updated."
				});
			}
		);
	}),

	/**
	 * Updates a user's password
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} previousPassword - the previous password
	 * @param {string} newPassword - the new password
	 * @param {Function} cb - gets called with the result
	 */
	updatePassword: isLoginRequired(async function updatePassword(session, previousPassword, newPassword, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (!user.services.password) return next("This account does not have a password set.");
					return next(null, user.services.password.password);
				},

				(storedPassword, next) => {
					bcrypt.compare(sha256(previousPassword), storedPassword).then(res => {
						if (res) return next();
						return next("Please enter the correct previous password.");
					});
				},

				next => {
					if (!DBModule.passwordValid(newPassword))
						return next("Invalid new password. Check if it meets all the requirements.");
					return next();
				},

				next => {
					bcrypt.genSalt(10, next);
				},

				// hash the password
				(salt, next) => {
					bcrypt.hash(sha256(newPassword), salt, next);
				},

				(hashedPassword, next) => {
					userModel.updateOne(
						{ _id: session.userId },
						{
							$set: {
								"services.password.password": hashedPassword
							}
						},
						next
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"UPDATE_PASSWORD",
						`Failed updating user password of user '${session.userId}'. '${err}'.`
					);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "UPDATE_PASSWORD", `User '${session.userId}' updated their password.`);

				return cb({
					status: "success",
					message: "Password successfully updated."
				});
			}
		);
	}),

	/**
	 * Requests a password for a session
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} email - the email of the user that requests a password reset
	 * @param {Function} cb - gets called with the result
	 */
	requestPassword: isLoginRequired(async function requestPassword(session, cb) {
		const code = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 8 }, this);
		const passwordRequestSchema = await MailModule.runJob(
			"GET_SCHEMA",
			{
				schemaName: "passwordRequest"
			},
			this
		);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					if (user.services.password && user.services.password.password)
						return next("You already have a password set.");
					return next(null, user);
				},

				(user, next) => {
					const expires = new Date();
					expires.setDate(expires.getDate() + 1);
					userModel.findOneAndUpdate(
						{ "email.address": user.email.address },
						{
							$set: {
								"services.password": {
									set: { code, expires }
								}
							}
						},
						{ runValidators: true },
						next
					);
				},

				(user, next) => {
					passwordRequestSchema(user.email.address, user.username, code, next);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"REQUEST_PASSWORD",
						`UserId '${session.userId}' failed to request password. '${err}'`
					);

					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"REQUEST_PASSWORD",
					`UserId '${session.userId}' successfully requested a password.`
				);

				return cb({
					status: "success",
					message: "Successfully requested password."
				});
			}
		);
	}),

	/**
	 * Verifies a password code
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} code - the password code
	 * @param {Function} cb - gets called with the result
	 */
	verifyPasswordCode: isLoginRequired(async function verifyPasswordCode(session, code, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					if (!code || typeof code !== "string") return next("Invalid code.");
					return userModel.findOne(
						{
							"services.password.set.code": code,
							_id: session.userId
						},
						next
					);
				},

				(user, next) => {
					if (!user) return next("Invalid code.");
					if (user.services.password.set.expires < new Date()) return next("That code has expired.");
					return next(null);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "VERIFY_PASSWORD_CODE", `Code '${code}' failed to verify. '${err}'`);
					cb({ status: "failure", message: err });
				} else {
					this.log("SUCCESS", "VERIFY_PASSWORD_CODE", `Code '${code}' successfully verified.`);
					cb({
						status: "success",
						message: "Successfully verified password code."
					});
				}
			}
		);
	}),

	/**
	 * Adds a password to a user with a code
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} code - the password code
	 * @param {string} newPassword - the new password code
	 * @param {Function} cb - gets called with the result
	 */
	changePasswordWithCode: isLoginRequired(async function changePasswordWithCode(session, code, newPassword, cb) {
		const userModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "user"
			},
			this
		);
		async.waterfall(
			[
				next => {
					if (!code || typeof code !== "string") return next("Invalid code.");
					return userModel.findOne({ "services.password.set.code": code }, next);
				},

				(user, next) => {
					if (!user) return next("Invalid code.");
					if (!user.services.password.set.expires > new Date()) return next("That code has expired.");
					return next();
				},

				next => {
					if (!DBModule.passwordValid(newPassword))
						return next("Invalid password. Check if it meets all the requirements.");
					return next();
				},

				next => {
					bcrypt.genSalt(10, next);
				},

				// hash the password
				(salt, next) => {
					bcrypt.hash(sha256(newPassword), salt, next);
				},

				(hashedPassword, next) => {
					userModel.updateOne(
						{ "services.password.set.code": code },
						{
							$set: {
								"services.password.password": hashedPassword
							},
							$unset: { "services.password.set": "" }
						},
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "ADD_PASSWORD_WITH_CODE", `Code '${code}' failed to add password. '${err}'`);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "ADD_PASSWORD_WITH_CODE", `Code '${code}' successfully added password.`);

				CacheModule.runJob("PUB", {
					channel: "user.linkPassword",
					value: session.userId
				});

				return cb({
					status: "success",
					message: "Successfully added password."
				});
			}
		);
	}),

	/**
	 * Unlinks password from user
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	unlinkPassword: isLoginRequired(async function unlinkPassword(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (!user) return next("Not logged in.");
					if (!user.services.github || !user.services.github.id)
						return next("You can't remove password login without having GitHub login.");
					return userModel.updateOne({ _id: session.userId }, { $unset: { "services.password": "" } }, next);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"UNLINK_PASSWORD",
						`Unlinking password failed for userId '${session.userId}'. '${err}'`
					);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "UNLINK_PASSWORD", `Unlinking password successful for userId '${session.userId}'.`);

				CacheModule.runJob("PUB", {
					channel: "user.unlinkPassword",
					value: session.userId
				});

				return cb({
					status: "success",
					message: "Successfully unlinked password."
				});
			}
		);
	}),

	/**
	 * Unlinks GitHub from user
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	unlinkGitHub: isLoginRequired(async function unlinkGitHub(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					userModel.findOne({ _id: session.userId }, next);
				},

				(user, next) => {
					if (!user) return next("Not logged in.");
					if (!user.services.password || !user.services.password.password)
						return next("You can't remove GitHub login without having password login.");
					return userModel.updateOne({ _id: session.userId }, { $unset: { "services.github": "" } }, next);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"UNLINK_GITHUB",
						`Unlinking GitHub failed for userId '${session.userId}'. '${err}'`
					);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "UNLINK_GITHUB", `Unlinking GitHub successful for userId '${session.userId}'.`);

				CacheModule.runJob("PUB", {
					channel: "user.unlinkGithub",
					value: session.userId
				});

				return cb({
					status: "success",
					message: "Successfully unlinked GitHub."
				});
			}
		);
	}),

	/**
	 * Requests a password reset for an email
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} email - the email of the user that requests a password reset
	 * @param {Function} cb - gets called with the result
	 */
	async requestPasswordReset(session, email, cb) {
		const code = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 8 }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		const resetPasswordRequestSchema = await MailModule.runJob(
			"GET_SCHEMA",
			{ schemaName: "resetPasswordRequest" },
			this
		);

		async.waterfall(
			[
				next => {
					if (!email || typeof email !== "string") return next("Invalid email.");
					email = email.toLowerCase();
					return userModel.findOne({ "email.address": email }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
					if (!user.services.password || !user.services.password.password)
						return next("User does not have a password set, and probably uses GitHub to log in.");
					return next(null, user);
				},

				(user, next) => {
					const expires = new Date();
					expires.setDate(expires.getDate() + 1);
					userModel.findOneAndUpdate(
						{ "email.address": email },
						{
							$set: {
								"services.password.reset": {
									code,
									expires
								}
							}
						},
						{ runValidators: true },
						next
					);
				},

				(user, next) => {
					resetPasswordRequestSchema(user.email.address, user.username, code, next);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REQUEST_PASSWORD_RESET",
						`Email '${email}' failed to request password reset. '${err}'`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"REQUEST_PASSWORD_RESET",
					`Email '${email}' successfully requested a password reset.`
				);

				return cb({
					status: "success",
					message: "Successfully requested password reset."
				});
			}
		);
	},

	/**
	 * Verifies a reset code
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} code - the password reset code
	 * @param {Function} cb - gets called with the result
	 */
	async verifyPasswordResetCode(session, code, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					if (!code || typeof code !== "string") return next("Invalid code.");
					return userModel.findOne({ "services.password.reset.code": code }, next);
				},

				(user, next) => {
					if (!user) return next("Invalid code.");
					if (!user.services.password.reset.expires > new Date()) return next("That code has expired.");
					return next(null);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "VERIFY_PASSWORD_RESET_CODE", `Code '${code}' failed to verify. '${err}'`);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "VERIFY_PASSWORD_RESET_CODE", `Code '${code}' successfully verified.`);

				return cb({
					status: "success",
					message: "Successfully verified password reset code."
				});
			}
		);
	},

	/**
	 * Changes a user's password with a reset code
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} code - the password reset code
	 * @param {string} newPassword - the new password reset code
	 * @param {Function} cb - gets called with the result
	 */
	async changePasswordWithResetCode(session, code, newPassword, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					if (!code || typeof code !== "string") return next("Invalid code.");
					return userModel.findOne({ "services.password.reset.code": code }, next);
				},

				(user, next) => {
					if (!user) return next("Invalid code.");
					if (!user.services.password.reset.expires > new Date()) return next("That code has expired.");
					return next();
				},

				next => {
					if (!DBModule.passwordValid(newPassword))
						return next("Invalid password. Check if it meets all the requirements.");
					return next();
				},

				next => {
					bcrypt.genSalt(10, next);
				},

				// hash the password
				(salt, next) => {
					bcrypt.hash(sha256(newPassword), salt, next);
				},

				(hashedPassword, next) => {
					userModel.updateOne(
						{ "services.password.reset.code": code },
						{
							$set: {
								"services.password.password": hashedPassword
							},
							$unset: { "services.password.reset": "" }
						},
						{ runValidators: true },
						next
					);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"CHANGE_PASSWORD_WITH_RESET_CODE",
						`Code '${code}' failed to change password. '${err}'`
					);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "CHANGE_PASSWORD_WITH_RESET_CODE", `Code '${code}' successfully changed password.`);

				return cb({
					status: "success",
					message: "Successfully changed password."
				});
			}
		);
	},

	/**
	 * Bans a user by userId
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} value - the user id that is going to be banned
	 * @param {string} reason - the reason for the ban
	 * @param {string} expiresAt - the time the ban expires
	 * @param {Function} cb - gets called with the result
	 */
	banUserById: isAdminRequired(function banUserById(session, userId, reason, expiresAt, cb) {
		async.waterfall(
			[
				next => {
					if (!userId) return next("You must provide a userId to ban.");
					if (!reason) return next("You must provide a reason for the ban.");
					return next();
				},

				next => {
					if (!expiresAt || typeof expiresAt !== "string") return next("Invalid expire date.");
					const date = new Date();
					switch (expiresAt) {
						case "1h":
							expiresAt = date.setHours(date.getHours() + 1);
							break;
						case "12h":
							expiresAt = date.setHours(date.getHours() + 12);
							break;
						case "1d":
							expiresAt = date.setDate(date.getDate() + 1);
							break;
						case "1w":
							expiresAt = date.setDate(date.getDate() + 7);
							break;
						case "1m":
							expiresAt = date.setMonth(date.getMonth() + 1);
							break;
						case "3m":
							expiresAt = date.setMonth(date.getMonth() + 3);
							break;
						case "6m":
							expiresAt = date.setMonth(date.getMonth() + 6);
							break;
						case "1y":
							expiresAt = date.setFullYear(date.getFullYear() + 1);
							break;
						case "never":
							expiresAt = new Date(3093527980800000);
							break;
						default:
							return next("Invalid expire date.");
					}

					return next();
				},

				next => {
					PunishmentsModule.runJob(
						"ADD_PUNISHMENT",
						{
							type: "banUserId",
							value: userId,
							reason,
							expiresAt,
							punishedBy: "" // needs changed
						},
						this
					)
						.then(punishment => next(null, punishment))
						.catch(next);
				},

				(punishment, next) => {
					CacheModule.runJob("PUB", {
						channel: "user.ban",
						value: { userId, punishment }
					});
					next();
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"BAN_USER_BY_ID",
						`User ${session.userId} failed to ban user ${userId} with the reason ${reason}. '${err}'`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"BAN_USER_BY_ID",
					`User ${session.userId} has successfully banned user ${userId} with the reason ${reason}.`
				);

				return cb({
					status: "success",
					message: "Successfully banned user."
				});
			}
		);
	})
};
