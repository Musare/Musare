import async from "async";
import config from "config";

// eslint-disable-next-line
import moduleManager from "../../index";

const permissions = {};
permissions.dj = {
	"stations.autofill": true,
	"stations.blacklist": true,
	"stations.index": true,
	"stations.playback.toggle": true,
	"stations.queue.remove": true,
	"stations.queue.reposition": true,
	"stations.queue.reset": true,
	"stations.request": true,
	"stations.skip": true,
	"stations.view": true,
	"stations.view.manage": true
};
permissions.owner = {
	...permissions.dj,
	"stations.djs.add": true,
	"stations.djs.remove": true,
	"stations.remove": true,
	"stations.update": true
};
permissions.moderator = {
	...permissions.owner,
	"admin.view": true,
	"admin.view.import": true,
	"admin.view.news": true,
	"admin.view.playlists": true,
	"admin.view.punishments": true,
	"admin.view.reports": true,
	"admin.view.songs": true,
	"admin.view.stations": true,
	"admin.view.users": true,
	"admin.view.youtubeChannels": true,
	"admin.view.youtubeVideos": true,
	"apis.searchDiscogs": true,
	"news.create": true,
	"news.update": true,
	"playlists.create.admin": true,
	"playlists.get": true,
	"playlists.update.displayName": true,
	"playlists.update.privacy": true,
	"playlists.songs.add": true,
	"playlists.songs.remove": true,
	"playlists.songs.reposition": true,
	"playlists.view.others": true,
	"punishments.banIP": true,
	"punishments.get": true,
	"reports.get": true,
	"reports.update": true,
	"songs.create": true,
	"songs.get": true,
	"songs.update": true,
	"songs.verify": true,
	"stations.create.official": true,
	"stations.index": false,
	"stations.index.other": true,
	"stations.remove": false,
	"users.get": true,
	"users.ban": true,
	"users.requestPasswordReset": true,
	"users.resendVerifyEmail": true,
	"users.update": true,
	"youtube.requestSetAdmin": true
};
permissions.admin = {
	...permissions.moderator,
	"admin.view.dataRequests": true,
	"admin.view.statistics": true,
	"admin.view.youtube": true,
	"dataRequests.resolve": true,
	"media.recalculateAllRatings": true,
	"media.removeImportJobs": true,
	"news.remove": true,
	"playlists.clearAndRefill": true,
	"playlists.clearAndRefillAll": true,
	"playlists.createMissing": true,
	"playlists.deleteOrphaned": true,
	"playlists.removeAdmin": true,
	"playlists.requestOrphanedPlaylistSongs": true,
	"punishments.deactivate": true,
	"reports.remove": true,
	"songs.remove": true,
	"songs.updateAll": true,
	"stations.clearEveryStationQueue": true,
	"stations.remove": true,
	"users.remove": true,
	"users.remove.sessions": true,
	"users.update.restricted": true,
	"utils.getModules": true,
	"youtube.getApiRequest": true,
	"youtube.getMissingChannels": true,
	"youtube.resetStoredApiRequests": true,
	"youtube.removeStoredApiRequest": true,
	"youtube.removeVideos": true
};

if (config.get("experimental.soundcloud")) {
	permissions.moderator["admin.view.soundcloudTracks"] = true;
	permissions.admin["admin.view.soundcloudTracks"] = true;

	permissions.moderator["admin.view.soundcloud"] = true;
	permissions.admin["admin.view.soundcloud"] = true;

	permissions.admin["soundcloud.fetchNewApiKey"] = true;

	permissions.admin["soundcloud.testApiKey"] = true;

	permissions.moderator["soundcloud.getArtist"] = true;
	permissions.admin["soundcloud.getArtist"] = true;
}

if (config.get("experimental.spotify")) {
	permissions.moderator["admin.view.spotify"] = true;
	permissions.admin["admin.view.spotify"] = true;

	permissions.moderator["spotify.getTracksFromMediaSources"] = true;
	permissions.admin["spotify.getTracksFromMediaSources"] = true;

	permissions.moderator["spotify.getAlbumsFromIds"] = true;
	permissions.admin["spotify.getAlbumsFromIds"] = true;

	permissions.moderator["spotify.getArtistsFromIds"] = true;
	permissions.admin["spotify.getArtistsFromIds"] = true;
}

export const hasPermission = async (permission, session, stationId) => {
	const CacheModule = moduleManager.modules.cache;
	const DBModule = moduleManager.modules.db;
	const StationsModule = moduleManager.modules.stations;
	const UtilsModule = moduleManager.modules.utils;
	const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					let userId;
					if (typeof session === "object") {
						if (session.userId) userId = session.userId;
						else
							CacheModule.runJob(
								"HGET",
								{
									table: "sessions",
									key: session.sessionId
								},
								this
							)
								.then(_session => {
									if (_session && _session.userId) userId = _session.userId;
								})
								.catch(next);
					} else userId = session;
					if (!userId) return next("User ID required.");
					return userModel.findOne({ _id: userId }, next);
				},
				(user, next) => {
					if (!user) return next("Login required.");
					if (!stationId) return next(null, [user.role]);
					return StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							if (!station) return next("Station not found.");
							if (station.type === "community" && station.owner === user._id.toString())
								return next(null, [user.role, "owner"]);
							if (station.djs.find(dj => dj === user._id.toString()))
								return next(null, [user.role, "dj"]);
							if (user.role === "admin" || user.role === "moderator") return next(null, [user.role]);
							return next("Invalid permissions.");
						})
						.catch(next);
				},
				(roles, next) => {
					if (!roles) return next("Role required.");
					let permissionFound;
					roles.forEach(role => {
						if (permissions[role] && permissions[role][permission]) permissionFound = true;
					});
					if (permissionFound) return next();
					return next("Insufficient permissions.");
				}
			],
			async err => {
				const userId = typeof session === "object" ? session.userId || session.sessionId : session;
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					UtilsModule.log(
						"INFO",
						"HAS_PERMISSION",
						`User "${userId}" does not have required permission "${permission}". "${err}"`
					);
					return reject(err);
				}
				UtilsModule.log(
					"INFO",
					"HAS_PERMISSION",
					`User "${userId}" has required permission "${permission}".`,
					false
				);
				return resolve();
			}
		);
	});
};

export const useHasPermission = (options, destination) =>
	async function useHasPermission(session, ...args) {
		const UtilsModule = moduleManager.modules.utils;
		const permission = typeof options === "object" ? options.permission : options;
		const cb = args[args.length - 1];

		async.waterfall(
			[
				next => {
					if (!session || !session.sessionId) return next("Login required.");
					return hasPermission(permission, session)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"INFO",
						"USE_HAS_PERMISSION",
						`User "${session.userId}" does not have required permission "${permission}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"INFO",
					"USE_HAS_PERMISSION",
					`User "${session.userId}" has required permission "${permission}".`,
					false
				);
				return destination.apply(this, [session].concat(args));
			}
		);
	};

export const getUserPermissions = async (session, stationId) => {
	const CacheModule = moduleManager.modules.cache;
	const DBModule = moduleManager.modules.db;
	const StationsModule = moduleManager.modules.stations;
	const UtilsModule = moduleManager.modules.utils;
	const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					let userId;
					if (typeof session === "object") {
						if (session.userId) userId = session.userId;
						else
							CacheModule.runJob(
								"HGET",
								{
									table: "sessions",
									key: session.sessionId
								},
								this
							)
								.then(_session => {
									if (_session && _session.userId) userId = _session.userId;
								})
								.catch(next);
					} else userId = session;
					if (!userId) return next("User ID required.");
					return userModel.findOne({ _id: userId }, next);
				},
				(user, next) => {
					if (!user) return next("Login required.");
					if (!stationId) return next(null, [user.role]);
					return StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							if (!station) return next("Station not found.");
							if (station.type === "community" && station.owner === user._id.toString())
								return next(null, [user.role, "owner"]);
							if (station.djs.find(dj => dj === user._id.toString()))
								return next(null, [user.role, "dj"]);
							if (user.role === "admin" || user.role === "moderator") return next(null, [user.role]);
							return next("Invalid permissions.");
						})
						.catch(next);
				},
				(roles, next) => {
					if (!roles) return next("Role required.");
					let rolePermissions = {};
					roles.forEach(role => {
						if (permissions[role]) rolePermissions = { ...rolePermissions, ...permissions[role] };
					});
					return next(null, rolePermissions);
				}
			],
			async (err, rolePermissions) => {
				const userId = typeof session === "object" ? session.userId || session.sessionId : session;
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					UtilsModule.log(
						"INFO",
						"GET_USER_PERMISSIONS",
						`Failed to get permissions for user "${userId}". "${err}"`
					);
					return reject(err);
				}
				UtilsModule.log("INFO", "GET_USER_PERMISSIONS", `Fetched permissions for user "${userId}".`, false);
				return resolve(rolePermissions);
			}
		);
	});
};
