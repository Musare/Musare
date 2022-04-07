/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: () => ({
		userId: null,
		user: {}
	}),
	getters: {},
	actions: {
		editUser: ({ commit }, userId) => commit("editUser", userId),
		setUser: ({ commit }, user) => commit("setUser", user)
	},
	mutations: {
		editUser(state, userId) {
			state.userId = userId;
		},
		setUser(state, user) {
			state.user = user;
		}
	}
};
