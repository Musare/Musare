import async from "async";

// eslint-disable-next-line
import moduleManager from "../../index";

const permissions = {};
permissions.dj = {
	"test.queue.add": true,
	"test.queue.remove": false,
	"stations.view": true,
	"stations.skip": true,
	"stations.pause": true,
	"stations.resume": true,
	"stations.addToQueue": true,
	"stations.removeFromQueue": true,
	"stations.repositionSongInQueue": true,
	"stations.autofillPlaylist": true,
	"stations.removeAutofillPlaylist": true,
	"stations.blacklistPlaylist": true,
	"stations.removeBlacklistedPlaylist": true,
	"stations.index": true,
	"stations.getPlaylist": true
};
permissions.owner = {
	...permissions.dj,
	"test.queue.remove": true,
	"stations.update": true,
	"stations.remove": true
};
permissions.moderator = {
	...permissions.owner,
	"test.remove.other": false,
	"songs.length": true,
	"songs.getData": true,
	"songs.getSongFromId": true,
	"songs.getSongsFromYoutubeIds": true,
	"songs.create": true,
	"songs.update": true,
	"songs.verify": true,
	"songs.verifyMany": true,
	"songs.unverify": true,
	"songs.unverifyMany": true,
	"songs.getGenres": true,
	"songs.editGenres": true,
	"songs.getArtists": true,
	"songs.editArtists": true,
	"songs.getTags": true,
	"songs.editTags": true,
	"apis.searchDiscogs": true,
	"apis.joinAdminRoom.songs": true,
	"apis.joinAdminRoom.stations": true,
	"apis.joinAdminRoom.reports": true,
	"apis.joinAdminRoom.news": true,
	"apis.joinAdminRoom.playlists": true,
	"apis.joinAdminRoom.punishments": true,
	"apis.joinAdminRoom.youtubeVideos": true,
	"apis.joinAdminRoom.import": true,
	"media.getImportJobs": true,
	"news.getData": true,
	"news.create": true,
	"news.update": true,
	"playlists.getData": true,
	"playlists.searchOfficial": true,
	"playlists.updatePrivacyAdmin": true,
	"playlists.getPlaylist": true,
	"playlists.repositionSong": true,
	"playlists.addSongToPlaylist": true,
	"playlists.addSetToPlaylist": true,
	"playlists.removeSongFromPlaylist": true,
	"punishments.getData": true,
	"punishments.getPunishmentsForUser": true,
	"punishments.findOne": true,
	"punishments.banIP": true,
	"reports.getData": true,
	"reports.findOne": true,
	"reports.getReportsForSong": true,
	"reports.resolve": true,
	"reports.toggleIssue": true,
	"stations.getData": true,
	"stations.resetQueue": true,
	"stations.remove": false,
	"stations.index": false,
	"stations.index.other": true,
	"stations.create.official": true,
	"youtube.getVideos": true,
	"youtube.requestSetAdmin": true
};
permissions.admin = {
	...permissions.moderator,
	"test.remove.other": true,
	"songs.updateAll": true,
	"songs.remove": true,
	"songs.removeMany": true,
	"apis.joinAdminRoom.users": true,
	"apis.joinAdminRoom.statistics": true,
	"apis.joinAdminRoom.youtube": true,
	"dataRequests.getData": true,
	"dataRequests.resolve": true,
	"media.recalculateAllRatings": true,
	"media.removeImportJobs": true,
	"news.remove": true,
	"playlists.removeAdmin": true,
	"playlists.deleteOrphanedStationPlaylists": true,
	"playlists.deleteOrphanedGenrePlaylists": true,
	"playlists.requestOrphanedPlaylistSongs": true,
	"playlists.clearAndRefillStationPlaylist": true,
	"playlists.clearAndRefillGenrePlaylist": true,
	"playlists.clearAndRefillAllStationPlaylists": true,
	"playlists.clearAndRefillAllGenrePlaylists": true,
	"playlists.createMissingGenrePlaylists": true,
	"reports.remove": true,
	"stations.clearEveryStationQueue": true,
	"stations.remove": true,
	"users.getData": true,
	"users.adminRemove": true,
	"users.getUserFromId": true,
	"users.updateRole": true,
	"users.adminRequestPasswordReset": true,
	"users.resendVerifyEmail": true,
	"users.banUserById": true,
	"users.removeSessions": true,
	"users.updateUsername": true,
	"users.updateEmail": true,
	"users.updateName": true,
	"users.updateLocation": true,
	"users.updateBio": true,
	"users.updateAvatar": true,
	"utils.getModules": true,
	"utils.getModule": true,
	"youtube.getQuotaStatus": true,
	"youtube.getQuotaChartData": true,
	"youtube.getApiRequests": true,
	"youtube.getApiRequest": true,
	"youtube.resetStoredApiRequests": true,
	"youtube.removeStoredApiRequest": true,
	"youtube.removeVideos": true
};

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
							// if (station.type === "community" && station.djs.find(userId))
							// 	return next(null, [user.role, "dj"]);
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
		const stationId = typeof options === "object" ? options.stationId : null;
		const cb = args[args.length - 1];

		async.waterfall(
			[
				next => {
					if (!session || !session.sessionId) return next("Login required.");
					return hasPermission(permission, session, stationId)
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
