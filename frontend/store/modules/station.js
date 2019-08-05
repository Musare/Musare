/* eslint no-param-reassign: 0 */

const state = {
	station: {},
	editing: {}
};

const getters = {};

const actions = {
	joinStation: ({ commit }, station) => {
		commit("joinStation", station);
	},
	editStation: ({ commit }, station) => {
		commit("editStation", station);
	}
};

const mutations = {
	joinStation(state, station) {
		state.station = { ...station };
	},
	editStation(state, station) {
		state.editing = { ...station };
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
