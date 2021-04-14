/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		originalStation: {},
		station: {},
		includedPlaylists: [],
		excludedPlaylists: []
	},
	getters: {},
	actions: {
		editStation: ({ commit }, station) => commit("editStation", station),
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
