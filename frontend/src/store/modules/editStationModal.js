/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		originalStation: {},
		station: {}
	},
	getters: {},
	actions: {
		editStation: ({ commit }, station) => commit("editStation", station)
	},
	mutations: {
		editStation(state, station) {
			state.originalStation = JSON.parse(JSON.stringify(station));
			state.station = JSON.parse(JSON.stringify(station));
		}
	}
};
