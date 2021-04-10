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
		clearStation(state) {
			state.originalStation = null;
			state.station = null;
		}
	}
};
