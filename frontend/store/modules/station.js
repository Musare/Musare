/* eslint no-param-reassign: 0 */

const state = {
	station: {},
	editing: {},
	userCount: 0,
	users: [],
	currentSong: {},
	previousSong: null,
	songsList: [],
	paused: true,
	noSong: true
};

const getters = {};

const actions = {
	joinStation: ({ commit }, station) => {
		commit("joinStation", station);
	},
	editStation: ({ commit }, station) => {
		commit("editStation", station);
	},
	updateUserCount: ({ commit }, userCount) => {
		commit("updateUserCount", userCount);
	},
	updateUsers: ({ commit }, users) => {
		commit("updateUsers", users);
	},
	updateCurrentSong: ({ commit }, currentSong) => {
		commit("updateCurrentSong", currentSong);
	},
	updatePreviousSong: ({ commit }, previousSong) => {
		commit("updatePreviousSong", previousSong);
	},
	updateSongsList: ({ commit }, songsList) => {
		commit("updateSongsList", songsList);
	},
	updatePaused: ({ commit }, paused) => {
		commit("updatePaused", paused);
	},
	updateNoSong: ({ commit }, noSong) => {
		commit("updateNoSong", noSong);
	}
};

const mutations = {
	joinStation(state, station) {
		state.station = { ...station };
	},
	editStation(state, station) {
		state.editing = { ...station };
	},
	updateUserCount(state, userCount) {
		state.userCount = userCount;
	},
	updateUsers(state, users) {
		state.users = users;
	},
	updateCurrentSong(state, currentSong) {
		if (currentSong.likes === -1 && currentSong.dislikes === -1) {
			currentSong.skipDuration = 0;
			currentSong.simpleSong = true;
		} else {
			currentSong.simpleSong = false;
		}

		state.currentSong = currentSong;
	},
	updatePreviousSong(state, previousSong) {
		state.previousSong = previousSong;
	},
	updateSongsList(state, songsList) {
		state.songsList = songsList;
	},
	updatePaused(state, paused) {
		state.paused = paused;
	},
	updateNoSong(state, noSong) {
		state.noSong = noSong;
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
