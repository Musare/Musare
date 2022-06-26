/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		punishmentId: null,
		punishment: {}
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		viewPunishment: ({ commit }, punishment) =>
			commit("viewPunishment", punishment)
	},
	mutations: {
		init(state, { punishmentId }) {
			state.punishmentId = punishmentId;
		},
		viewPunishment(state, punishment) {
			state.punishment = punishment;
		}
	}
};
