/* eslint no-param-reassign: 0 */

import Vue from "vue";

export default {
	namespaced: true,
	state: {
		originalStation: {},
		station: {}
	},
	getters: {},
	actions: {
		editStation: ({ commit }, station) => commit("editStation", station),
		setGenres: ({ commit }, genres) => commit("setGenres", genres),
		setBlacklistedGenres: ({ commit }, blacklistedGenres) =>
			commit("setBlacklistedGenres", blacklistedGenres),
		setIncludedPlaylists: ({ commit }, includedPlaylists) =>
			commit("setIncludedPlaylists", includedPlaylists),
		setExcludedPlaylists: ({ commit }, excludedPlaylists) =>
			commit("setExcludedPlaylists", excludedPlaylists),
		clearStation: ({ commit }) => commit("clearStation")
	},
	mutations: {
		editStation(state, station) {
			state.originalStation = JSON.parse(JSON.stringify(station));
			state.station = JSON.parse(JSON.stringify(station));
		},
		setGenres(state, genres) {
			Vue.set(
				state.station,
				"genres",
				JSON.parse(JSON.stringify(genres))
			);
		},
		setBlacklistedGenres(state, blacklistedGenres) {
			Vue.set(
				state.station,
				"blacklistedGenres",
				JSON.parse(JSON.stringify(blacklistedGenres))
			);
		},
		setIncludedPlaylists(state, includedPlaylists) {
			state.includedPlaylists = JSON.parse(
				JSON.stringify(includedPlaylists)
			);
		},
		setExcludedPlaylists(state, excludedPlaylists) {
			state.excludedPlaylists = JSON.parse(
				JSON.stringify(excludedPlaylists)
			);
		},
		clearStation(state) {
			state.originalStation = null;
			state.station = null;
		}
	}
};
