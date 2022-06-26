/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		type: null
	},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, { type }) {
			state.type = type;
		}
	}
};
