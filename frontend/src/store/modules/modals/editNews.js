/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: () => ({
		createNews: false,
		newsId: null,
		sector: "admin"
	}),
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, { createNews, newsId, sector }) {
			state.createNews = createNews;
			state.newsId = newsId;
			state.sector = sector;
		}
	}
};
