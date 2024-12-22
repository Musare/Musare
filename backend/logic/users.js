import config from "config";
import CoreClass from "../core";

let UsersModule;
let MailModule;
let CacheModule;
let DBModule;
let PlaylistsModule;
let WSModule;
let MediaModule;

class _UsersModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("users");

		UsersModule = this;
	}

	/**
	 * Initialises the app module
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		DBModule = this.moduleManager.modules.db;
		MailModule = this.moduleManager.modules.mail;
		WSModule = this.moduleManager.modules.ws;
		CacheModule = this.moduleManager.modules.cache;
		MediaModule = this.moduleManager.modules.media;

		this.userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });
		this.dataRequestModel = await DBModule.runJob("GET_MODEL", { modelName: "dataRequest" });
		this.stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" });
		this.playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" });
		this.activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" });

		this.dataRequestEmail = await MailModule.runJob("GET_SCHEMA_ASYNC", { schemaName: "dataRequest" });
	}

	/**
	 * Removes a user and associated data
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - id of the user to remove
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async REMOVE_USER(payload) {
		const { userId } = payload;

		// Create data request, in case the process fails halfway through. An admin can finish the removal manually
		const dataRequest = await UsersModule.dataRequestModel.create({ userId, type: "remove" });
		await WSModule.runJob(
			"EMIT_TO_ROOM",
			{
				room: "admin.users",
				args: ["event:admin.dataRequests.created", { data: { request: dataRequest } }]
			},
			this
		);

		if (config.get("sendDataRequestEmails")) {
			const adminUsers = await UsersModule.userModel.find({ role: "admin" });
			const to = adminUsers.map(adminUser => adminUser.email.address);
			await UsersModule.dataRequestEmail(to, userId, "remove");
		}

		// Delete activities
		await UsersModule.activityModel.deleteMany({ userId });

		// Delete stations and associated data
		const stations = await UsersModule.stationModel.find({ owner: userId });
		const stationJobs = stations.map(station => async () => {
			const { _id: stationId } = station;

			await UsersModule.stationModel.deleteOne({ _id: stationId });
			await CacheModule.runJob("HDEL", { table: "stations", key: stationId }, this);

			if (!station.playlist) return;

			await PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId: station.playlist }, this);
		});
		await Promise.all(stationJobs);

		// Remove user as dj
		await UsersModule.stationModel.updateMany({ djs: userId }, { $pull: { djs: userId } });

		// Collect songs to adjust ratings for later
		const likedPlaylist = await UsersModule.playlistModel.findOne({ createdBy: userId, type: "user-liked" });
		const dislikedPlaylist = await UsersModule.playlistModel.findOne({ createdBy: userId, type: "user-disliked" });
		const songsToAdjustRatings = [
			...likedPlaylist.songs.map(({ mediaSource }) => mediaSource),
			...dislikedPlaylist.songs.map(({ mediaSource }) => mediaSource)
		];

		// Delete playlists created by user
		await UsersModule.playlistModel.deleteMany({ createdBy: userId });

		// TODO Maybe we don't need to wait for this to finish?
		// Recalculate ratings of songs the user liked/disliked
		const recalculateRatingsJobs = songsToAdjustRatings.map(songsToAdjustRating =>
			MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource: songsToAdjustRating }, this)
		);
		await Promise.all(recalculateRatingsJobs);

		// Delete user object
		await UsersModule.userModel.deleteMany({ _id: userId });

		// Remove sessions from Redis and MongoDB
		await CacheModule.runJob("PUB", { channel: "user.removeSessions", value: userId }, this);

		const sessions = await CacheModule.runJob("HGETALL", { table: "sessions" }, this);
		const sessionIds = Object.keys(sessions);
		const sessionJobs = sessionIds.map(sessionId => async () => {
			const session = sessions[sessionId];
			if (!session || session.userId !== userId) return;

			await CacheModule.runJob("HDEL", { table: "sessions", key: sessionId }, this);
		});
		await Promise.all(sessionJobs);

		await CacheModule.runJob(
			"PUB",
			{
				channel: "user.removeAccount",
				value: userId
			},
			this
		);
	}

	// EXAMPLE_JOB() {
	// 	return new Promise((resolve, reject) => {
	// 		if (true) resolve({});
	// 		else reject(new Error("Nothing changed."));
	// 	});
	// }
}

export default new _UsersModule();
