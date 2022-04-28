/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		song: {}
	},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, { song }) {
			state.song = song;
		}
	}
};
