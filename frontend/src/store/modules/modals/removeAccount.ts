/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		githubLinkConfirmed: false
	},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, { githubLinkConfirmed }) {
			state.githubLinkConfirmed = githubLinkConfirmed;
		}
	}
};
