/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		user: {}
	},
	getters: {},
	actions: {
		editUser: ({ commit }, user) => commit("editUser", user)
	},
	mutations: {
		editUser(state, user) {
			state.user = user;
		}
	}
};
