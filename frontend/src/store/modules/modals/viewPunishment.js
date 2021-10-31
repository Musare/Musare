/* eslint no-param-reassign: 0 */

export default {
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
};
