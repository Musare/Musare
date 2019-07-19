const state = {};
const getters = {};
const actions = {};
const mutations = {};

const modules = {
	songs: {
		namespaced: true,
		state: {
			video: {
				player: null,
				paused: true,
				playerReady: false,
				autoPlayed: false
			},
			editing: {}
		},
		getters: {},
		actions: {
			editSong: ({ commit }, song) => commit("editSong", song),
			stopVideo: ({ commit }) => commit("stopVideo"),
			loadVideoById: ({ commit }, id, skipDuration) =>
				commit("loadVideoById", id, skipDuration),
			pauseVideo: ({ commit }, status) => commit("pauseVideo", status)
		},
		mutations: {
			editSong(state, song) {
				state.editing = { ...song };
				console.log("editing", state.editing);
			},
			stopVideo(state) {
				state.video.player.stopVideo();
			},
			loadVideoById(state, id, skipDuration) {
				state.video.player.loadVideoById(id, skipDuration);
			},
			pauseVideo(state, status) {
				if (status) state.video.player.pauseVideo();
				else state.video.player.playVideo();
				state.video.paused = status;
			}
		}
	},
	stations: {
		namespaced: true,
		state: {
			station: {},
			editing: {}
		},
		getters: {},
		actions: {
			editStation: ({ commit }, station) => commit("editStation", station)
		},
		mutations: {
			editStation(state, station) {
				state.editing = state.station = station;
			}
		}
	},
	punishments: {
		namespaced: true,
		state: {
			punishment: {}
		},
		getters: {},
		actions: {
			viewPunishment: ({ commit }, punishment) =>
				commit("viewPunishment", punishment)
		},
		mutations: {
			viewPunishment(state, punishment) {
				state.punishment = punishment;
			}
		}
	},
	users: {
		namespaced: true,
		state: {
			editing: {}
		},
		getters: {},
		actions: {
			editUser: ({ commit }, user) => commit("editUser", user)
		},
		mutations: {
			editUser(state, user) {
				state.editing = user;
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
