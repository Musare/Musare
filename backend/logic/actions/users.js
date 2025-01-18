import config from "config";

import async from "async";
import mongoose from "mongoose";

import bcrypt from "bcrypt";
import sha256 from "sha256";
import isLoginRequired from "../hooks/loginRequired";
import { hasPermission, useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;
const MailModule = moduleManager.modules.mail;
const PunishmentsModule = moduleManager.modules.punishments;
const ActivitiesModule = moduleManager.modules.activities;
const UsersModule = moduleManager.modules.users;

CacheModule.runJob("SUB", {
	channel: "user.updatePreferences",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("keep.event:user.preferences.updated", { data: { preferences: res.preferences } });
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updateOrderOfFavoriteStations",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:user.orderOfFavoriteStations.updated", {
					data: { order: res.favoriteStations }
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updateOrderOfPlaylists",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:user.orderOfPlaylists.updated", { data: { order: res.orderOfPlaylists } });
			});
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `profile.${res.userId}.playlists`,
			args: ["event:user.orderOfPlaylists.updated", { data: { order: res.orderOfPlaylists } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updateUsername",
	cb: user => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: user._id }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("keep.event:user.username.updated", { data: { username: user.username } });
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.removeSessions",
	cb: userId => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId }).then(sockets =>
			sockets.forEach(socket => socket.dispatch("keep.event:user.session.deleted"))
		);
	}
});

CacheModule.runJob("SUB", {
	channel: "user.linkPassword",
	cb: userId => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:user.password.linked");
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.ban",
	cb: data => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("keep.event:user.banned", { data: { ban: data.punishment } });
				socket.close();
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.favoritedStation",
	cb: data => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:user.station.favorited", { data: { stationId: data.stationId } });
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.unfavoritedStation",
	cb: data => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:user.station.unfavorited", { data: { stationId: data.stationId } });
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.removeAccount",
	cb: userId => {
		WSModule.runJob("EMIT_TO_ROOMS", {
			rooms: ["admin.users", `edit-user.${userId}`],
			args: ["event:user.removed", { data: { userId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updateRole",
	cb: ({ user }) => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: user._id }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("keep.event:user.role.updated", { data: { role: user.role } });
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "user.updated",
	cb: async data => {
		const userModel = await DBModule.runJob("GET_MODEL", {
			modelName: "user"
		});

		userModel.findOne(
			{ _id: data.userId },
			[
				"_id",
				"name",
				"username",
				"avatar",
				"role",
				"email.address",
				"email.verified",
				"statistics.songsRequested",
				"services.password.password"
			],
			(err, user) => {
				const newUser = user._doc;
				delete newUser.services.password;
				WSModule.runJob("EMIT_TO_ROOMS", {
					rooms: ["admin.users", `edit-user.${data.userId}`],
					args: ["event:admin.user.updated", { data: { user: newUser } }]
				});
			}
		);
	}
});

CacheModule.runJob("SUB", {
	channel: "longJob.removed",
	cb: ({ jobId, userId }) => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("keep.event:longJob.removed", {
					data: {
						jobId
					}
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "longJob.added",
	cb: ({ jobId, userId }) => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("keep.event:longJob.added", {
					data: {
						jobId
					}
				});
			});
		});
	}
});

export default {
	/**
	 * Gets users, used in the admin users page by the AdvancedTable component
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each user
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: useHasPermission(
		"users.get",
		async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
			async.waterfall(
				[
					next => {
						DBModule.runJob(
							"GET_DATA",
							{
								page,
								pageSize,
								properties,
								sort,
								queries,
								operator,
								modelName: "user",
								blacklistedProperties: [
									"services.password.password",
									"services.password.reset.code",
									"services.password.reset.expires",
									"email.verificationToken"
								],
								specialQueries: {}
							},
							this
						)
							.then(response => {
								next(null, response);
							})
							.catch(err => {
								next(err);
							});
					}
				],
				async (err, response) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log("ERROR", "USERS_GET_DATA", `Failed to get data from users. "${err}"`);
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "USERS_GET_DATA", `Got data from users successfully.`);
					return cb({
						status: "success",
						message: "Successfully got data from users.",
						data: response
					});
				}
			);
		}
	),

	/**
	 * Removes all data held on a user, including their ability to login
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	remove: isLoginRequired(async function remove(session, cb) {
		const { userId } = session;

		async.waterfall(
			[
				next => {
					UsersModule.runJob("REMOVE_USER", { userId })
						.then(() => next())
						.catch(err => next(err));
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err });

					this.log("ERROR", "USER_REMOVE", `Removing data and account for user "${userId}" failed. "${err}"`);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"USER_REMOVE",
					`Successfully removed data and account for user "${session.userId}"`
				);

				CacheModule.runJob("PUB", {
					channel: "user.removeAccount",
					value: userId
				});

				return cb({
					status: "success",
					message: "Successfully removed data and account."
				});
			}
		);
	}),

	/**
	 * Removes all data held on a user, including their ability to login, by userId
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the user id that is going to be banned
	 * @param {Function} cb - gets called with the result
	 */
	adminRemove: useHasPermission("users.remove", async function adminRemove(session, userId, cb) {
		async.waterfall(
			[
				next => {
					if (!userId) return next("You must provide a userId to remove.");
					return next();
				},

				next => {
					UsersModule.runJob("REMOVE_USER", { userId })
						.then(() => next())
						.catch(err => next(err));
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"USER_ADMIN_REMOVE",
						`Removing data and account for user "${userId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "USER_ADMIN_REMOVE", `Successfully removed data and account for user "${userId}"`);

				CacheModule.runJob("PUB", {
					channel: "user.removeAccount",
					value: userId
				});

				return cb({
					status: "success",
					message: "Successfully removed data and account."
				});
			}
		);
	}),

	/**
	 * Logs user in
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} identifier - the username or email of the user
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
					const query = {};
					if (identifier.indexOf("@") !== -1) query["email.address"] = identifier;
					else query.username = { $regex: `^${identifier}$`, $options: "i" };
					userModel.findOne(query, next);
				},

				// if the user doesn't exist, respond with a failure
				// otherwise compare the requested password and the actual users password
				(user, next) => {
					if (!user) return next("User not found");
					if (!user.services.password || !user.services.password.password) return next("Invalid password");

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
						.then(() => next(null, sessionId))
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
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "USER_PASSWORD_LOGIN", `Login successful with password for user "${identifier}"`);

				return cb({
					status: "success",
					message: "Login successful",
					data: { SID: sessionId }
				});
			}
		);
	},

	/**
	 * Registers a new user
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} username - the username for the new user
	 * @param {string} email - the email for the new user
	 * @param {string} password - the plaintext password for the new user
	 * @param {object} recaptcha - the recaptcha data
	 * @param {Function} cb - gets called with the result
	 */
	async register(session, username, email, password, recaptcha, cb) {
		async.waterfall(
			[
				next => {
					UsersModule.runJob("REGISTER", { username, email, password, recaptcha })
						.then(({ userId }) => next(null, userId))
						.catch(err => next(err));
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
					return cb({ status: "error", message: err });
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

				const res = await this.module.runJob(
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

				if (res.status === "success") {
					obj.SID = res.data.SID;
				}

				return cb(obj);
			}
		);
	},

	/**
	 * Logs out a user
	 * @param {object} session - the session object automatically added by the websocket
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
					CacheModule.runJob("PUB", {
						channel: "user.removeSessions",
						value: session.userId
					});

					// temp fix, need to wait properly for the SUB/PUB refactor (on wekan)
					setTimeout(() => {
						CacheModule.runJob("HDEL", { table: "sessions", key: session.sessionId }, this)
							.then(() => next())
							.catch(next);
					}, 50);
				}
			],
			async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "USER_LOGOUT", `Logout failed. "${err}" `);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "USER_LOGOUT", `Logout successful.`);

				return cb({
					status: "success",
					message: "Successfully logged out."
				});
			}
		);
	},

	/**
	 * Checks if user's password is correct (e.g. before a sensitive action)
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} password - the password the user entered that we need to validate
	 * @param {Function} cb - gets called with the result
	 */
	confirmPasswordMatch: isLoginRequired(async function confirmPasswordMatch(session, password, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		return async.waterfall(
			[
				next => {
					if (config.get("apis.oidc.enabled")) return next("Confirming passwords is disabled.");

					return next();
				},

				next => {
					if (!password || password === "") return next("Please provide a valid password.");
					return next();
				},

				next => {
					userModel.findOne({ _id: session.userId }, (err, user) =>
						next(err, user.services.password.password)
					);
				},

				(passwordHash, next) => {
					if (!passwordHash) return next("Your account doesn't have a password linked.");

					return bcrypt.compare(sha256(password), passwordHash, (err, match) => {
						if (err) return next(err);
						if (!match) return next(null, false);
						return next(null, true);
					});
				}
			],
			async (err, match) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"USER_CONFIRM_PASSWORD",
						`Couldn't confirm password for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				if (match) {
					this.log(
						"SUCCESS",
						"USER_CONFIRM_PASSWORD",
						`Successfully checked for password match (it matched) for user "${session.userId}".`
					);

					return cb({
						status: "success",
						message: "Your password matches."
					});
				}

				this.log(
					"SUCCESS",
					"USER_CONFIRM_PASSWORD",
					`Successfully checked for password match (it didn't match) for user "${session.userId}".`
				);

				return cb({
					status: "error",
					message: "Unfortunately your password doesn't match."
				});
			}
		);
	}),

	/**
	 * Removes all sessions for a user
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the id of the user we are trying to delete the sessions of
	 * @param {Function} cb - gets called with the result
	 */
	removeSessions: isLoginRequired(async function removeSessions(session, userId, cb) {
		async.waterfall(
			[
				next => {
					if (session.userId === userId) return next();
					return hasPermission("users.remove.sessions", session)
						.then(() => next())
						.catch(() => next("Only admins and the owner of the account can remove their sessions."));
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

					// temp fix, need to wait properly for the SUB/PUB refactor (on wekan)
					setTimeout(
						() =>
							async.each(
								keys,
								(sessionId, callback) => {
									const session = sessions[sessionId];

									if (session && session.userId === userId) {
										// TODO Also maybe add this to this runJob
										CacheModule.runJob("HDEL", {
											table: "sessions",
											key: sessionId
										})
											.then(() => callback(null))
											.catch(callback);
									} else callback();
								},
								err => {
									next(err);
								}
							),
						50
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
					return cb({ status: "error", message: err });
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
	 * Updates the order of a user's favorite stations
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Array} favoriteStations - array of station ids (with a specific order)
	 * @param {Function} cb - gets called with the result
	 */
	updateOrderOfFavoriteStations: isLoginRequired(
		async function updateOrderOfFavoriteStations(session, favoriteStations, cb) {
			const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

			async.waterfall(
				[
					next => {
						userModel.updateOne(
							{ _id: session.userId },
							{ $set: { favoriteStations } },
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
							"UPDATE_ORDER_OF_USER_FAVORITE_STATIONS",
							`Couldn't update order of favorite stations for user "${session.userId}" to "${favoriteStations}". "${err}"`
						);

						return cb({ status: "error", message: err });
					}

					CacheModule.runJob("PUB", {
						channel: "user.updateOrderOfFavoriteStations",
						value: {
							favoriteStations,
							userId: session.userId
						}
					});

					this.log(
						"SUCCESS",
						"UPDATE_ORDER_OF_USER_FAVORITE_STATIONS",
						`Updated order of favorite stations for user "${session.userId}" to "${favoriteStations}".`
					);

					return cb({
						status: "success",
						message: "Order of favorite stations successfully updated"
					});
				}
			);
		}
	),

	/**
	 * Updates the order of a user's playlists
	 * @param {object} session - the session object automatically added by the websocket
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

					return cb({ status: "error", message: err });
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
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} preferences - object containing preferences
	 * @param {boolean} preferences.nightmode - whether or not the user is using the night mode theme
	 * @param {boolean} preferences.autoSkipDisliked - whether to automatically skip disliked songs
	 * @param {boolean} preferences.activityLogPublic - whether or not a user's activity log can be publicly viewed
	 * @param {boolean} preferences.anonymousSongRequests - whether or not a user's requested songs will be anonymous
	 * @param {boolean} preferences.activityWatch - whether or not a user is using the ActivityWatch integration
	 * @param {boolean} preferences.defaultStationPrivacy - default station privacy
	 * @param {boolean} preferences.defaultPlaylistPrivacy - default playlist privacy
	 * @param {Function} cb - gets called with the result
	 */
	updatePreferences: isLoginRequired(async function updatePreferences(session, preferences, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					const $set = {};

					Object.keys(preferences).forEach(preference => {
						$set[`preferences.${preference}`] = preferences[preference];
					});

					return next(null, $set);
				},

				($set, next) => {
					userModel.findByIdAndUpdate(session.userId, { $set }, { new: false, upsert: true }, next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"UPDATE_USER_PREFERENCES",
						`Couldn't update preferences for user "${session.userId}" to "${JSON.stringify(
							preferences
						)}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "user.updatePreferences",
					value: {
						preferences,
						userId: session.userId
					}
				});

				// if (preferences.nightmode !== undefined && preferences.nightmode !== user.preferences.nightmode)
				// 	ActivitiesModule.runJob("ADD_ACTIVITY", {
				// 		userId: session.userId,
				// 		type: "user__toggle_nightmode",
				// 		payload: { message: preferences.nightmode ? "Enabled nightmode" : "Disabled nightmode" }
				// 	});

				// if (
				// 	preferences.autoSkipDisliked !== undefined &&
				// 	preferences.autoSkipDisliked !== user.preferences.autoSkipDisliked
				// )
				// 	ActivitiesModule.runJob("ADD_ACTIVITY", {
				// 		userId: session.userId,
				// 		type: "user__toggle_autoskip_disliked_songs",
				// 		payload: {
				// 			message: preferences.autoSkipDisliked
				// 				? "Enabled the autoskipping of disliked songs"
				// 				: "Disabled the autoskipping of disliked songs"
				// 		}
				// 	});

				// if (
				// 	preferences.activityWatch !== undefined &&
				// 	preferences.activityWatch !== user.preferences.activityWatch
				// )
				// 	ActivitiesModule.runJob("ADD_ACTIVITY", {
				// 		userId: session.userId,
				// 		type: "user__toggle_activity_watch",
				// 		payload: {
				// 			message: preferences.activityWatch
				// 				? "Enabled ActivityWatch integration"
				// 				: "Disabled ActivityWatch integration"
				// 		}
				// 	});

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
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	getPreferences: isLoginRequired(async function updatePreferences(session, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findById(session.userId).select({ preferences: -1 }).exec(next);
				},

				(user, next) => {
					if (!user) next("User not found");
					else next(null, user);
				}
			],
			async (err, user) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"GET_USER_PREFERENCES",
						`Couldn't retrieve preferences for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"GET_USER_PREFERENCES",
					`Successfully obtained preferences for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Preferences successfully retrieved",
					data: { preferences: user.preferences }
				});
			}
		);
	}),

	/**
	 * Gets user object from ObjectId or username (only a few properties)
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} identifier - the ObjectId or username of the user we are trying to find
	 * @param {Function} cb - gets called with the result
	 */
	getBasicUser: async function getBasicUser(session, identifier, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (mongoose.Types.ObjectId.isValid(identifier)) userModel.findOne({ _id: identifier }, next);
					else userModel.findOne({ username: new RegExp(`^${identifier}$`, "i") }, next);
				},

				(account, next) => {
					if (!account) return next("User not found.");
					return next(null, account);
				}
			],
			async (err, account) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log("ERROR", "GET_BASIC_USER", `User not found for "${identifier}". "${err}"`);

					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "GET_BASIC_USER", `User found for "${identifier}".`);

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
	 * Gets a list of long jobs, including onprogress events when those long jobs have progress
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	getLongJobs: isLoginRequired(async function getLongJobs(session, cb) {
		async.waterfall(
			[
				next => {
					CacheModule.runJob(
						"LRANGE",
						{
							key: `longJobs.${session.userId}`
						},
						this
					)
						.then(longJobUuids => next(null, longJobUuids))
						.catch(next);
				},

				(longJobUuids, next) => {
					next(
						null,
						longJobUuids
							.map(longJobUuid => moduleManager.jobManager.getJob(longJobUuid))
							.filter(longJob => !!longJob)
					);
				},

				(longJobs, next) => {
					longJobs.forEach(longJob => {
						if (longJob.onProgress)
							longJob.onProgress.on("progress", data => {
								this.publishProgress(
									{
										id: longJob.toString(),
										...data
									},
									true
								);
							});
					});

					next(
						null,
						longJobs.map(longJob => ({
							id: longJob.toString(),
							name: longJob.longJobTitle,
							status: longJob.lastProgressData.status,
							message: longJob.lastProgressData.message
						}))
					);
				}
			],
			async (err, longJobs) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log("ERROR", "GET_LONG_JOBS", `Couldn't get long jobs for user "${session.userId}". "${err}"`);

					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "GET_LONG_JOBS", `Got long jobs for user "${session.userId}".`);

				return cb({
					status: "success",
					data: {
						longJobs
					}
				});
			}
		);
	}),

	/**
	 * Gets a specific long job, including onprogress events when that long job has progress
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} jobId - the if id the long job
	 * @param {Function} cb - gets called with the result
	 */
	getLongJob: isLoginRequired(async function getLongJobs(session, jobId, cb) {
		async.waterfall(
			[
				next => {
					CacheModule.runJob(
						"LRANGE",
						{
							key: `longJobs.${session.userId}`
						},
						this
					)
						.then(longJobUuids => next(null, longJobUuids))
						.catch(next);
				},

				(longJobUuids, next) => {
					if (longJobUuids.indexOf(jobId) === -1) return next("Long job not found.");
					const longJob = moduleManager.jobManager.getJob(jobId);
					if (!longJob) return next("Long job not found.");
					return next(null, longJob);
				},

				(longJob, next) => {
					if (longJob.onProgress)
						longJob.onProgress.on("progress", data => {
							this.publishProgress(
								{
									id: longJob.toString(),
									...data
								},
								true
							);
						});

					next(null, {
						id: longJob.toString(),
						name: longJob.longJobTitle,
						status: longJob.lastProgressData.status,
						message: longJob.lastProgressData.message
					});
				}
			],
			async (err, longJob) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"GET_LONG_JOB",
						`Couldn't get long job for user "${session.userId}" with id "${jobId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "GET_LONG_JOB", `Got long job for user "${session.userId}" with id "${jobId}".`);

				return cb({
					status: "success",
					data: {
						longJob
					}
				});
			}
		);
	}),

	/**
	 * Removes active long job for a user
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} jobId - array of playlist ids (with a specific order)
	 * @param {Function} cb - gets called with the result
	 */
	removeLongJob: isLoginRequired(async function removeLongJob(session, jobId, cb) {
		async.waterfall(
			[
				next => {
					CacheModule.runJob(
						"LREM",
						{
							key: `longJobs.${session.userId}`,
							value: jobId
						},
						this
					)
						.then(() => next())
						.catch(next);
				},

				next => {
					const job = moduleManager.jobManager.getJob(jobId);
					if (job && job.status === "FINISHED") job.forgetLongJob();
					next();
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"REMOVE_LONG_JOB",
						`Couldn't remove long job for user "${session.userId}" with id ${jobId}. "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"REMOVE_LONG_JOB",
					`Removed long job for user "${session.userId}" with id ${jobId}.`
				);

				CacheModule.runJob("PUB", {
					channel: "longJob.removed",
					value: { jobId, userId: session.userId }
				});

				return cb({
					status: "success",
					message: "Removed long job successfully."
				});
			}
		);
	}),

	/**
	 * Gets a user from a userId
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the userId of the person we are trying to get the username from
	 * @param {Function} cb - gets called with the result
	 */
	getUserFromId: useHasPermission("users.get", async function getUserFromId(session, userId, cb) {
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
							}
						}
					});
				}

				this.log(
					"ERROR",
					"GET_USER_FROM_ID",
					`Getting the user from userId "${userId}" failed. User not found.`
				);

				return cb({
					status: "error",
					message: "Couldn't find the user."
				});
			})
			.catch(async err => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_USER_FROM_ID", `Getting the user from userId "${userId}" failed. "${err}"`);
					cb({ status: "error", message: err });
				}
			});
	}),

	/**
	 * Gets user info from session
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	findBySession: isLoginRequired(async function findBySession(session, cb) {
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
					return cb({ status: "error", message: err });
				}

				const sanitisedUser = {
					email: {
						address: user.email.address
					},
					avatar: user.avatar,
					username: user.username,
					name: user.name,
					location: user.location,
					bio: user.bio
				};

				if (user.services.password && user.services.password.password) sanitisedUser.password = true;
				if (user.services.oidc && user.services.oidc.sub) sanitisedUser.oidc = true;

				this.log("SUCCESS", "FIND_BY_SESSION", `User found. "${user.username}".`);
				return cb({
					status: "success",
					data: { user: sanitisedUser }
				});
			}
		);
	}),

	/**
	 * Updates a user's username
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newUsername - the new username
	 * @param {Function} cb - gets called with the result
	 */
	updateUsername: isLoginRequired(async function updateUsername(session, updatingUserId, newUsername, cb) {
		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next();
					return hasPermission("users.update", session)
						.then(() => next())
						.catch(() => next("Invalid permissions."));
				},

				next => {
					UsersModule.runJob("UPDATE_USERNAME", { userId: updatingUserId, username: newUsername })
						.then(() => next())
						.catch(err => next(err));
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

					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "user.updateUsername",
					value: {
						username: newUsername,
						_id: updatingUserId
					}
				});

				CacheModule.runJob("PUB", {
					channel: "user.updated",
					value: { userId: updatingUserId }
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
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newEmail - the new email
	 * @param {Function} cb - gets called with the result
	 */
	updateEmail: isLoginRequired(async function updateEmail(session, updatingUserId, newEmail, cb) {
		newEmail = newEmail.toLowerCase();

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next();
					return hasPermission("users.update.restricted", session)
						.then(() => next())
						.catch(() => next("Invalid permissions."));
				},

				next => {
					UsersModule.runJob("UPDATE_EMAIL", { userId: updatingUserId, email: newEmail })
						.then(() => next())
						.catch(err => next(err));
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

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"UPDATE_EMAIL",
					`Updated email for user "${updatingUserId}" to email "${newEmail}".`
				);

				CacheModule.runJob("PUB", {
					channel: "user.updated",
					value: { userId: updatingUserId }
				});

				return cb({
					status: "success",
					message: "Email updated successfully."
				});
			}
		);
	}),

	/**
	 * Updates a user's name
	 * @param {object} session - the session object automatically added by the websocket
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
					if (updatingUserId === session.userId) return next();
					return hasPermission("users.update", session)
						.then(() => next())
						.catch(() => next("Invalid permissions."));
				},

				next => userModel.findOne({ _id: updatingUserId }, next),

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
					return cb({ status: "error", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_name",
					payload: { message: `Changed name to ${newName}` }
				});

				this.log("SUCCESS", "UPDATE_NAME", `Updated name for user "${updatingUserId}" to name "${newName}".`);

				CacheModule.runJob("PUB", {
					channel: "user.updated",
					value: { userId: updatingUserId }
				});

				return cb({
					status: "success",
					message: "Name updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's location
	 * @param {object} session - the session object automatically added by the websocket
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
					if (updatingUserId === session.userId) return next();
					return hasPermission("users.update", session)
						.then(() => next())
						.catch(() => next("Invalid permissions."));
				},

				next => userModel.findOne({ _id: updatingUserId }, next),

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

					return cb({ status: "error", message: err });
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

				CacheModule.runJob("PUB", {
					channel: "user.updated",
					value: { userId: updatingUserId }
				});

				return cb({
					status: "success",
					message: "Location updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's bio
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newBio - the new bio
	 * @param {Function} cb - gets called with the result
	 */
	updateBio: isLoginRequired(async function updateBio(session, updatingUserId, newBio, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next();
					return hasPermission("users.update", session)
						.then(() => next())
						.catch(() => next("Invalid permissions."));
				},

				next => userModel.findOne({ _id: updatingUserId }, next),

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
					return cb({ status: "error", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_bio",
					payload: { message: `Changed bio to ${newBio}` }
				});

				this.log("SUCCESS", "UPDATE_BIO", `Updated bio for user "${updatingUserId}" to bio "${newBio}".`);

				CacheModule.runJob("PUB", {
					channel: "user.updated",
					value: { userId: updatingUserId }
				});

				return cb({
					status: "success",
					message: "Bio updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's avatar
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newAvatar - the new avatar object
	 * @param {Function} cb - gets called with the result
	 */
	updateAvatar: isLoginRequired(async function updateAvatarType(session, updatingUserId, newAvatar, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (updatingUserId === session.userId) return next();
					return hasPermission("users.update", session)
						.then(() => next())
						.catch(() => next("Invalid permissions."));
				},

				next => userModel.findOne({ _id: updatingUserId }, next),

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
						"UPDATE_AVATAR",
						`Couldn't update avatar for user "${updatingUserId}" to type "${newAvatar.type}" and color "${newAvatar.color}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: updatingUserId,
					type: "user__edit_avatar",
					payload: { message: `Changed avatar to use ${newAvatar.type} and ${newAvatar.color}` }
				});

				this.log(
					"SUCCESS",
					"UPDATE_AVATAR",
					`Updated avatar for user "${updatingUserId}" to type "${newAvatar.type} and color ${newAvatar.color}".`
				);

				CacheModule.runJob("PUB", {
					channel: "user.updated",
					value: { userId: updatingUserId }
				});

				return cb({
					status: "success",
					message: "Avatar updated successfully"
				});
			}
		);
	}),

	/**
	 * Updates a user's role
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} updatingUserId - the updating user's id
	 * @param {string} newRole - the new role
	 * @param {Function} cb - gets called with the result
	 */
	updateRole: useHasPermission(
		"users.update.restricted",
		async function updateRole(session, updatingUserId, newRole, cb) {
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
						return next(null, user);
					},

					(user, next) => {
						userModel.updateOne(
							{ _id: updatingUserId },
							{ $set: { role: newRole } },
							{ runValidators: true },
							err => next(err, user)
						);
					}
				],
				async (err, user) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

						this.log(
							"ERROR",
							"UPDATE_ROLE",
							`User "${session.userId}" couldn't update role for user "${updatingUserId}" to role "${newRole}". "${err}"`
						);

						return cb({ status: "error", message: err });
					}

					this.log(
						"SUCCESS",
						"UPDATE_ROLE",
						`User "${session.userId}" updated the role of user "${updatingUserId}" to role "${newRole}".`
					);

					CacheModule.runJob("PUB", {
						channel: "user.updated",
						value: { userId: updatingUserId }
					});

					CacheModule.runJob("PUB", {
						channel: "user.updateRole",
						value: { user }
					});

					return cb({
						status: "success",
						message: "Role successfully updated."
					});
				}
			);
		}
	),

	/**
	 * Updates a user's password
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} previousPassword - the previous password
	 * @param {string} newPassword - the new password
	 * @param {Function} cb - gets called with the result
	 */
	updatePassword: isLoginRequired(async function updatePassword(session, previousPassword, newPassword, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					if (config.get("apis.oidc.enabled")) return next("Updating password is disabled.");

					return next();
				},

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
					return cb({ status: "error", message: err });
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
	 * Requests a password reset for an email
	 * @param {object} session - the session object automatically added by the websocket
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
					if (!config.get("mail.enabled") || config.get("apis.oidc.enabled"))
						return next("Password resets are disabled.");

					return next();
				},

				next => {
					if (!email || typeof email !== "string") return next("Invalid email.");
					email = email.toLowerCase();
					return userModel.findOne({ "email.address": email }, next);
				},

				(user, next) => {
					if (!user) return next("User not found.");
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
					return cb({ status: "error", message: err });
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
	 * Requests a password reset for a a user as an admin
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} email - the email of the user for which the password reset is intended
	 * @param {Function} cb - gets called with the result
	 */
	adminRequestPasswordReset: useHasPermission(
		"users.requestPasswordReset",
		async function adminRequestPasswordReset(session, userId, cb) {
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
						if (!config.get("mail.enabled") || config.get("apis.oidc.enabled"))
							return next("Password resets are disabled.");

						return next();
					},

					next => userModel.findOne({ _id: userId }, next),

					(user, next) => {
						if (!user) return next("User not found.");
						return next();
					},

					next => {
						const expires = new Date();
						expires.setDate(expires.getDate() + 1);
						userModel.findOneAndUpdate(
							{ _id: userId },
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
							"ADMINREQUEST_PASSWORD_RESET",
							`User '${userId}' failed to get a password reset. '${err}'`
						);
						return cb({ status: "error", message: err });
					}

					this.log(
						"SUCCESS",
						"ADMIN_REQUEST_PASSWORD_RESET",
						`User '${userId}' successfully got sent a password reset.`
					);

					return cb({
						status: "success",
						message: "Successfully requested password reset for user."
					});
				}
			);
		}
	),

	/**
	 * Verifies a reset code
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} code - the password reset code
	 * @param {Function} cb - gets called with the result
	 */
	async verifyPasswordResetCode(session, code, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					if (!config.get("mail.enabled") || config.get("apis.oidc.enabled"))
						return next("Password resets are disabled.");

					return next();
				},

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
					return cb({ status: "error", message: err });
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
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} code - the password reset code
	 * @param {string} newPassword - the new password reset code
	 * @param {Function} cb - gets called with the result
	 */
	async changePasswordWithResetCode(session, code, newPassword, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					if (!config.get("mail.enabled") || config.get("apis.oidc.enabled"))
						return next("Password resets are disabled.");

					return next();
				},

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
					return cb({ status: "error", message: err });
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
	 * Resends the verify email email
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the user id of the person to resend the email to
	 * @param {Function} cb - gets called with the result
	 */
	resendVerifyEmail: useHasPermission(
		"users.resendVerifyEmail",
		async function resendVerifyEmail(session, userId, cb) {
			const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
			const verifyEmailSchema = await MailModule.runJob("GET_SCHEMA", { schemaName: "verifyEmail" }, this);

			async.waterfall(
				[
					next => userModel.findOne({ _id: userId }, next),

					(user, next) => {
						if (!user) return next("User not found.");
						if (user.email.verified) return next("The user's email is already verified.");
						return next(null, user);
					},

					(user, next) => {
						verifyEmailSchema(user.email.address, user.username, user.email.verificationToken, err => {
							next(err);
						});
					}
				],
				async err => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

						this.log(
							"ERROR",
							"RESEND_VERIFY_EMAIL",
							`Couldn't resend verify email for user "${userId}". '${err}'`
						);

						return cb({ status: "error", message: err });
					}

					this.log("SUCCESS", "RESEND_VERIFY_EMAIL", `Resent verify email for user "${userId}".`);

					return cb({
						status: "success",
						message: "Email resent successfully."
					});
				}
			);
		}
	),

	/**
	 * Bans a user by userId
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} value - the user id that is going to be banned
	 * @param {string} reason - the reason for the ban
	 * @param {string} expiresAt - the time the ban expires
	 * @param {Function} cb - gets called with the result
	 */
	banUserById: useHasPermission("users.ban", function banUserById(session, userId, reason, expiresAt, cb) {
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
							punishedBy: session.userId
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
					return cb({ status: "error", message: err });
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
	}),

	/**
	 * Search for a user by username or name
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} query - the query
	 * @param {string} page - page
	 * @param {Function} cb - gets called with the result
	 */
	search: isLoginRequired(async function search(session, query, page, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					if ((!query && query !== "") || typeof query !== "string") next("Invalid query.");
					else next();
				},

				next => {
					const findQuery = {
						$or: [{ name: new RegExp(`${query}`, "i"), username: new RegExp(`${query}`, "i") }]
					};
					const pageSize = 15;
					const skipAmount = pageSize * (page - 1);

					userModel.find(findQuery).count((err, count) => {
						if (err) next(err);
						else {
							userModel
								.find(findQuery, { _id: true, name: true, username: true, avatar: true })
								.skip(skipAmount)
								.limit(pageSize)
								.exec((err, users) => {
									if (err) next(err);
									else {
										next(null, {
											users,
											page,
											pageSize,
											skipAmount,
											count
										});
									}
								});
						}
					});
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "USERS_SEARCH", `Searching users failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "USERS_SEARCH", "Searching users successful.");
				return cb({ status: "success", data });
			}
		);
	})
};
