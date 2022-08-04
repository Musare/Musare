import async from "async";

// eslint-disable-next-line
import moduleManager from "../../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;
const StationsModule = moduleManager.modules.stations;

const permissions = {};
permissions.dj = {
	"test.queue.add": true,
	"test.queue.remove": false
};
permissions.owner = {
	...permissions.dj,
	"test.queue.remove": true
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
	"users.getData": true,
	"users.adminRemove": true,
	"users.getUserFromId": true,
	"users.updateRole": true,
	"users.adminRequestPasswordReset": true,
	"users.resendVerifyEmail": true,
	"users.banUserById": true,
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

export const hasPermission = async (permission, userId, stationId) => {
	const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise(resolve => {
		async.waterfall(
			[
				next => {
					if (!userId) return next("User ID required.");
					return userModel.findOne({ _id: userId }, next);
				},
				(user, next) => {
					if (!user) return next("Login required.");
					if (!stationId) return next(null, [user.role]);
					return StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							if (!station) return next("Station not found.");
							if (station.type === "community" && station.owner === userId)
								return next(null, [user.role, "owner"]);
							// if (station.type === "community" && station.djs.find(userId))
							// 	return next(null, [user.role, "dj"]);
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
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					// TODO
					// this.log(
					// 	"INFO",
					// 	"HAS_PERMISSION",
					// 	`User "${userId}" does not have required permission "${permission}". "${err}"`
					// );
					return resolve(false);
				}
				// TODO
				// this.log("INFO", "HAS_PERMISSION", `User "${userId}" has required permission "${permission}".`, false);
				return resolve(true);
			}
		);
	});
};

export const useHasPermission = (options, destination) =>
	async function useHasPermission(session, ...args) {
		const permission = typeof options === "object" ? options.permission : options;
		const stationId = typeof options === "object" ? options.stationId : null;
		const cb = args[args.length - 1];

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
						.then(session => {
							next(null, session);
						})
						.catch(next);
				},
				(session, next) => {
					if (!session || !session.userId) return next("Login required.");
					return hasPermission(permission, session.userId, stationId)
						.then(hasPerm => {
							if (hasPerm) return next();
							return next("Insufficient permissions.");
						})
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
