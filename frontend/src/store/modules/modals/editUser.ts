/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: () => ({
		userId: null,
		user: {}
	}),
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		setUser: ({ commit }, user) => commit("setUser", user)
	},
	mutations: {
		init(state, { userId }) {
			state.userId = userId;
		},
		setUser(state, user) {
			state.user = user;
		}
	}
};
