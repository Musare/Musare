import config from "config";
import oauth from "oauth";
import axios from "axios";
import bcrypt from "bcrypt";
import sha256 from "sha256";
import CoreClass from "../core";

const { OAuth2 } = oauth;

let UsersModule;
let MailModule;
let CacheModule;
let DBModule;
let PlaylistsModule;
let WSModule;
let MediaModule;
let UtilsModule;
let ActivitiesModule;

const avatarColors = ["blue", "orange", "green", "purple", "teal"];

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
		UtilsModule = this.moduleManager.modules.utils;
		ActivitiesModule = this.moduleManager.modules.activities;
		PlaylistsModule = this.moduleManager.modules.playlists;

		this.userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });
		this.dataRequestModel = await DBModule.runJob("GET_MODEL", { modelName: "dataRequest" });
		this.stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" });
		this.playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" });
		this.activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" });

		this.dataRequestEmailSchema = await MailModule.runJob("GET_SCHEMA_ASYNC", { schemaName: "dataRequest" });
		this.verifyEmailSchema = await MailModule.runJob("GET_SCHEMA_ASYNC", { schemaName: "verifyEmail" });

		this.sessionSchema = await CacheModule.runJob("GET_SCHEMA", {
			schemaName: "session"
		});

		this.appUrl = `${config.get("url.secure") ? "https" : "http"}://${config.get("url.host")}`;
		this.redirectUri =
			config.get("apis.github.redirect_uri").length > 0
				? config.get("apis.github.redirect_uri")
				: `${this.appUrl}/backend/auth/github/authorize/callback`;

		this.oauth2 = new OAuth2(
			config.get("apis.github.client"),
			config.get("apis.github.secret"),
			"https://github.com/",
			"login/oauth/authorize",
			"login/oauth/access_token",
			null
		);

		// getOAuthAccessToken uses callbacks by default, so make a helper function to turn it into a promise instead
		this.getOAuthAccessToken = (...args) =>
			new Promise((resolve, reject) => {
				this.oauth2.getOAuthAccessToken(...args, (err, accessToken, refreshToken, results) => {
					if (err) reject(err);
					else resolve({ accessToken, refreshToken, results });
				});
			});
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
			await UsersModule.dataRequestEmailSchema(to, userId, "remove");
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
			...(likedPlaylist?.songs?.map(({ mediaSource }) => mediaSource) ?? []),
			...(dislikedPlaylist?.songs?.map(({ mediaSource }) => mediaSource) ?? [])
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

	/**
	 * Tries to verify email from email verification token/code
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.code - email verification token/code
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async VERIFY_EMAIL(payload) {
		const { code } = payload;
		if (!code) throw new Error("Invalid code.");

		const user = await UsersModule.userModel.findOne({ "email.verificationToken": code });
		if (!user) throw new Error("User not found.");
		if (user.email.verified) throw new Error("This email is already verified.");

		await UsersModule.userModel.updateOne(
			{ "email.verificationToken": code },
			{
				$set: { "email.verified": true },
				$unset: { "email.verificationToken": "" }
			},
			{ runValidators: true }
		);
	}

	/**
	 * Handles callback route being accessed, which has data from GitHub during the oauth process
	 * Will be used to either log the user in, register the user, or link the GitHub account to an existing account
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.code - code we need to use to get the access token
	 * @param {string} payload.state - custom state we may have passed to GitHub during the first step
	 * @param {string} payload.error - error code if an error occured
	 * @param {string} payload.errorDescription - error description if an error occured
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GITHUB_AUTHORIZE_CALLBACK(payload) {
		const { code, state, error, errorDescription } = payload;
		if (error) throw new Error(errorDescription);

		// Tries to get access token. We don't use the refresh token currently
		const { accessToken, /* refreshToken, */ results } = await UsersModule.getOAuthAccessToken(code, {
			redirect_uri: UsersModule.redirectUri
		});
		if (!accessToken) throw new Error(results.error_description);

		const options = {
			headers: {
				"User-Agent": "request",
				Authorization: `token ${accessToken}`
			}
		};
		// Gets user data
		const githubUserData = await axios.get("https://api.github.com/user", options);
		if (githubUserData.status !== 200) throw new Error(githubUserData.data.message);
		if (!githubUserData.data.id) throw new Error("Something went wrong, no id.");

		// If we specified a state in the first step when we redirected the user to GitHub, it was to link a
		// GitHub account to an existing Musare account, so continue with a job specifically for linking the account
		if (state)
			return UsersModule.runJob(
				"GITHUB_AUTHORIZE_CALLBACK_LINK",
				{ state, githubId: githubUserData.data.id, accessToken },
				this
			);

		const user = await UsersModule.userModel.findOne({ "services.github.id": githubUserData.data.id });
		let userId;
		if (user) {
			// Refresh access token, though it's pretty useless as it'll probably expire and then be useless,
			// and we don't use it afterwards at all
			user.services.github.access_token = accessToken;
			await user.save();
			userId = user._id;
		} else {
			// Try to register the user. Will throw an error if it's unable to do so or any error occurs
			userId = await UsersModule.runJob(
				"GITHUB_AUTHORIZE_CALLBACK_REGISTER",
				{ githubUserData, accessToken },
				this
			);
		}

		// Create session for the userId gotten above, as the user existed or was successfully registered
		const sessionId = await UtilsModule.runJob("GUID", {}, this);
		await CacheModule.runJob(
			"HSET",
			{
				table: "sessions",
				key: sessionId,
				value: UsersModule.sessionSchema(sessionId, userId)
			},
			this
		);

		return { sessionId, userId, redirectUrl: UsersModule.appUrl };
	}

	/**
	 * Handles registering the user in the GitHub login/register/link callback/process
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.githubUserData - data we got from the /user API endpoint from GitHub
	 * @param {string} payload.accessToken - access token for the GitHub user
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GITHUB_AUTHORIZE_CALLBACK_REGISTER(payload) {
		const { githubUserData, accessToken } = payload;
		let user;

		// Check if username already exists
		user = await UsersModule.userModel.findOne({ username: new RegExp(`^${githubUserData.data.login}$`, "i") });
		if (user) throw new Error(`An account with that username already exists.`);

		// Get emails used for GitHub account
		const githubEmailsData = await axios.get("https://api.github.com/user/emails", {
			headers: {
				"User-Agent": "request",
				Authorization: `token ${accessToken}`
			}
		});
		if (!Array.isArray(githubEmailsData.data)) throw new Error(githubEmailsData.message);

		const primaryEmailAddress = githubEmailsData.data.find(emailAddress => emailAddress.primary)?.email;
		if (!primaryEmailAddress) throw new Error("No primary email address found.");

		user = await UsersModule.userModel.findOne({ "email.address": primaryEmailAddress });
		if (user && Object.keys(JSON.parse(user.services.github)).length === 0)
			throw new Error(`An account with that email address exists, but is not linked to GitHub.`);
		if (user) throw new Error(`An account with that email address already exists.`);

		const userId = await UtilsModule.runJob(
			"GENERATE_RANDOM_STRING",
			{
				length: 12
			},
			this
		);
		const verificationToken = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 64 }, this);
		const gravatarUrl = await UtilsModule.runJob(
			"CREATE_GRAVATAR",
			{
				email: primaryEmailAddress
			},
			this
		);
		const likedSongsPlaylist = await PlaylistsModule.runJob(
			"CREATE_USER_PLAYLIST",
			{
				userId,
				displayName: "Liked Songs",
				type: "user-liked"
			},
			this
		);
		const dislikedSongsPlaylist = await PlaylistsModule.runJob(
			"CREATE_USER_PLAYLIST",
			{
				userId,
				displayName: "Disliked Songs",
				type: "user-disliked"
			},
			this
		);

		user = {
			_id: userId,
			username: githubUserData.data.login,
			name: githubUserData.data.name,
			location: githubUserData.data.location,
			bio: githubUserData.data.bio,
			email: {
				primaryEmailAddress,
				verificationToken
			},
			services: {
				github: {
					id: githubUserData.data.id,
					access_token: accessToken
				}
			},
			avatar: {
				type: "gravatar",
				url: gravatarUrl
			},
			likedSongsPlaylist,
			dislikedSongsPlaylist
		};

		await UsersModule.userModel.create(user);

		await UsersModule.verifyEmailSchema(primaryEmailAddress, githubUserData.data.login, verificationToken);
		await ActivitiesModule.runJob(
			"ADD_ACTIVITY",
			{
				userId,
				type: "user__joined",
				payload: { message: "Welcome to Musare!" }
			},
			this
		);

		return {
			userId
		};
	}

	/**
	 * Job to attempt to link a GitHub user to a Musare account
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.state - state we passed to GitHub and got back from GitHub
	 * @param {string} payload.githubId - GitHub user id
	 * @param {string} payload.accessToken - GitHub user access token
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GITHUB_AUTHORIZE_CALLBACK_LINK(payload) {
		const { state, githubId, accessToken } = payload;

		// State is currently the session id (SID), so check if that session (still) exists
		const session = await CacheModule.runJob(
			"HGET",
			{
				table: "sessions",
				key: state
			},
			this
		);
		if (!session) throw new Error("Invalid session.");

		const user = await UsersModule.userModel.findOne({ _id: session.userId });
		if (!user) throw new Error("User not found.");
		if (user.services.github && user.services.github.id) throw new Error("Account already has GitHub linked.");

		const { _id: userId } = user;

		await UsersModule.userModel.updateOne(
			{ _id: userId },
			{
				$set: {
					"services.github": {
						id: githubId,
						access_token: accessToken
					}
				}
			},
			{ runValidators: true }
		);

		await CacheModule.runJob(
			"PUB",
			{
				channel: "user.linkGithub",
				value: userId
			},
			this
		);
		await CacheModule.runJob(
			"PUB",
			{
				channel: "user.updated",
				value: { userId }
			},
			this
		);

		return {
			redirectUrl: `${UsersModule.appUrl}/settings?tab=security`
		};
	}

	/**
	 * Attempts to register a user
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.email - email
	 * @param {string} payload.username - username
	 * @param {string} payload.password - plaintext password
	 * @param {string} payload.recaptcha - recaptcha, if recaptcha is enabled
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async REGISTER(payload) {
		const { username, password, recaptcha } = payload;
		let { email } = payload;
		email = email.toLowerCase().trim();

		if (config.get("registrationDisabled") === true) throw new Error("Registration is not allowed at this time.");
		if (Array.isArray(config.get("experimental.registration_email_whitelist"))) {
			const experimentalRegistrationEmailWhitelist = config.get("experimental.registration_email_whitelist");

			const anyRegexPassed = experimentalRegistrationEmailWhitelist.find(regex => {
				const emailWhitelistRegex = new RegExp(regex);
				return emailWhitelistRegex.test(email);
			});

			if (!anyRegexPassed) throw new Error("Your email is not allowed to register.");
		}

		if (!DBModule.passwordValid(password))
			throw new Error("Invalid password. Check if it meets all the requirements.");

		if (config.get("apis.recaptcha.enabled") === true) {
			const recaptchaBody = await axios.post("https://www.google.com/recaptcha/api/siteverify", {
				data: {
					secret: config.get("apis").recaptcha.secret,
					response: recaptcha
				}
			});
			if (recaptchaBody.success !== true) throw new Error("Response from recaptcha was not successful.");
		}

		let user = await UsersModule.userModel.findOne({ username: new RegExp(`^${username}$`, "i") });
		if (user) throw new Error("A user with that username already exists.");
		user = await UsersModule.userModel.findOne({ "email.address": email });
		if (user) throw new Error("A user with that email already exists.");

		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(sha256(password), salt);

		const userId = await UtilsModule.runJob(
			"GENERATE_RANDOM_STRING",
			{
				length: 12
			},
			this
		);
		const verificationToken = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 64 }, this);
		const gravatarUrl = await UtilsModule.runJob(
			"CREATE_GRAVATAR",
			{
				email
			},
			this
		);
		const likedSongsPlaylist = await PlaylistsModule.runJob(
			"CREATE_USER_PLAYLIST",
			{
				userId,
				displayName: "Liked Songs",
				type: "user-liked"
			},
			this
		);
		const dislikedSongsPlaylist = await PlaylistsModule.runJob(
			"CREATE_USER_PLAYLIST",
			{
				userId,
				displayName: "Disliked Songs",
				type: "user-disliked"
			},
			this
		);

		user = {
			_id: userId,
			name: username,
			username,
			email: {
				address: email,
				verificationToken
			},
			services: {
				password: {
					password: hash
				}
			},
			avatar: {
				type: "initials",
				color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
				url: gravatarUrl
			},
			likedSongsPlaylist,
			dislikedSongsPlaylist
		};

		await UsersModule.userModel.create(user);

		await UsersModule.verifyEmailSchema(email, username, verificationToken);
		await ActivitiesModule.runJob(
			"ADD_ACTIVITY",
			{
				userId,
				type: "user__joined",
				payload: { message: "Welcome to Musare!" }
			},
			this
		);

		return {
			userId
		};
	}

	// async EXAMPLE_JOB() {
	// 	if (true) return;
	// 	else throw new Error("Nothing changed.");
	// }
}

export default new _UsersModule();
