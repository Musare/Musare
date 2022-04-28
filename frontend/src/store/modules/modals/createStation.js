/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		official: false
	},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, data) {
			if (data) state.official = data.official;
		}
	}
};
