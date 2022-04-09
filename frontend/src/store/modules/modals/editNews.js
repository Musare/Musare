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
			if (createNews) state.createNews = createNews;
			if (newsId) state.newsId = newsId;
			if (sector) state.sector = sector;
		}
	}
};
