/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		news: null
	},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, { news }) {
			state.news = news;
		}
	}
};
