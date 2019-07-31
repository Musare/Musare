import auth from "../../api/auth";
import io from "../../io";
import validation from "../../validation";

const state = {};
const getters = {};
const actions = {};
const mutations = {};

const modules = {
	auth: {
		namespaced: true,
		state: {
			userIdMap: {},
			userIdRequested: {},
			pendingUserIdCallbacks: {}
		},
		getters: {},
		actions: {
			/* eslint-disable-next-line no-unused-vars */
			register: ({ commit }, user) => {
				return new Promise((resolve, reject) => {
					const { username, email, password } = user;

					if (!email || !username || !password)
						return reject({
							status: "error",
							message: "Please fill in all fields"
						});

					if (!validation.isLength(email, 3, 254))
						return reject({
							status: "error",
							message:
								"Email must have between 3 and 254 characters."
						});

					if (
						email.indexOf("@") !== email.lastIndexOf("@") ||
						!validation.regex.emailSimple.test(email)
					)
						return reject({
							status: "error",
							message: "Invalid email format."
						});

					if (!validation.isLength(username, 2, 32))
						return reject({
							status: "error",
							message:
								"Username must have between 2 and 32 characters."
						});

					if (!validation.regex.azAZ09_.test(username))
						return reject({
							status: "error",
							message:
								"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _."
						});

					if (!validation.isLength(password, 6, 200))
						return reject({
							status: "error",
							message:
								"Password must have between 6 and 200 characters."
						});

					if (!validation.regex.password.test(password))
						return reject({
							status: "error",
							message:
								"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character."
						});

					auth.register(user)
						.then(() => {
							return resolve({
								status: "success",
								message: "Account registered!"
							});
						})
						.catch(err => {
							return reject({
								status: "error",
								message: err.message
							});
						});
				});
			},
			/* eslint-disable-next-line no-unused-vars */
			login: ({ commit }, user) => {
				return new Promise((resolve, reject) => {
					auth.login(user)
						.then(() => {
							return resolve({
								status: "success",
								message: "Logged in!"
							});
						})
						.catch(err => {
							return reject({
								status: "error",
								message: err.message
							});
						});
				});
			},
			getUsernameFromId: ({ commit, state }, userId) => {
				return new Promise(resolve => {
					if (typeof state.userIdMap[`Z${userId}`] !== "string") {
						if (state.userIdRequested[`Z${userId}`] !== true) {
							commit("requestingUserId", userId);
							io.getSocket(socket => {
								socket.emit(
									"users.getUsernameFromId",
									userId,
									res => {
										if (res.status === "success") {
											commit("mapUserId", {
												userId,
												username: res.data
											});

											state.pendingUserIdCallbacks[
												`Z${userId}`
											].forEach(cb => cb(res.data));

											commit(
												"clearPendingCallbacks",
												userId
											);

											return resolve(res.data);
										} else return resolve();
									}
								);
							});
						} else {
							commit("pendingUsername", {
								userId,
								callback: username => {
									return resolve(username);
								}
							});
						}
					}
				});
			}
		},
		mutations: {
			mapUserId(state, data) {
				state.userIdMap[`Z${data.userId}`] = data.username;
				state.userIdRequested[`Z${data.userId}`] = false;
			},
			requestingUserId(state, userId) {
				state.userIdRequested[`Z${userId}`] = true;
				if (!state.pendingUserIdCallbacks[`Z${userId}`])
					state.pendingUserIdCallbacks[`Z${userId}`] = [];
			},
			pendingUsername(state, data) {
				state.pendingUserIdCallbacks[`Z${data.userId}`].push(
					data.callback
				);
			},
			clearPendingCallbacks(state, userId) {
				state.pendingUserIdCallbacks[`Z${userId}`] = [];
			}
		}
	},
	playlists: {
		namespaced: true,
		state: {
			editing: ""
		},
		getters: {},
		actions: {
			editPlaylist: ({ commit }, id) => commit("editPlaylist", id)
		},
		mutations: {
			editPlaylist(state, id) {
				state.editing = id;
			}
		}
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations,
	modules
};
