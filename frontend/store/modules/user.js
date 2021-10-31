/* eslint no-param-reassign: 0 */

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
			pendingUserIdCallbacks: {},
			loggedIn: false,
			role: "",
			username: "",
			userId: "",
			banned: false,
			ban: {},
			gotData: false
		},
		actions: {
			/* eslint-disable-next-line no-unused-vars */
			register: ({ commit }, user) => {
				return new Promise((resolve, reject) => {
					const { username, email, password } = user;

					if (!email || !username || !password)
						return reject(new Error("Please fill in all fields"));

					if (!validation.isLength(email, 3, 254))
						return reject(
							new Error(
								"Email must have between 3 and 254 characters."
							)
						);

					if (
						email.indexOf("@") !== email.lastIndexOf("@") ||
						!validation.regex.emailSimple.test(email)
					)
						return reject(new Error("Invalid email format."));

					if (!validation.isLength(username, 2, 32))
						return reject(
							new Error(
								"Username must have between 2 and 32 characters."
							)
						);

					if (!validation.regex.azAZ09_.test(username))
						return reject(
							new Error(
								"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _."
							)
						);

					if (!validation.isLength(password, 6, 200))
						return reject(
							new Error(
								"Password must have between 6 and 200 characters."
							)
						);

					if (!validation.regex.password.test(password))
						return reject(
							new Error(
								"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character."
							)
						);

					return auth
						.register(user)
						.then(() => {
							return resolve({
								status: "success",
								message: "Account registered!"
							});
						})
						.catch(err => {
							return reject(new Error(err.message));
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
							return reject(new Error(err.message));
						});
				});
			},
			logout: () => {
				return new Promise((resolve, reject) => {
					return auth
						.logout()
						.then(() => {
							return resolve();
						})
						.catch(() => {
							return reject();
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
										}
										return resolve();
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
					} else {
						resolve(state.userIdMap[`Z${userId}`]);
					}
				});
			},
			authData: ({ commit }, data) => {
				commit("authData", data);
			},
			banUser: ({ commit }, ban) => {
				commit("banUser", ban);
			},
			updateUsername: ({ commit }, username) => {
				commit("updateUsername", username);
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
			},
			authData(state, data) {
				state.loggedIn = data.loggedIn;
				state.role = data.role;
				state.username = data.username;
				state.userId = data.userId;
				state.gotData = true;
			},
			banUser(state, ban) {
				state.banned = true;
				state.ban = ban;
			},
			updateUsername(state, username) {
				state.username = username;
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
