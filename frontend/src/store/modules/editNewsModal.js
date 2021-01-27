/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		news: {}
	},
	getters: {},
	actions: {
		editNews: ({ commit }, news) => commit("editNews", news),
		addChange: ({ commit }, data) => commit("addChange", data),
		removeChange: ({ commit }, data) => commit("removeChange", data)
	},
	mutations: {
		editNews(state, news) {
			state.news = news;
		},
		addChange(state, data) {
			state.news[data.type].push(data.change);
		},
		removeChange(state, data) {
			state.news[data.type].splice(data.index, 1);
		}
	}
};
