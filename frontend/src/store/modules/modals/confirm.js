/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		message: ""
	},
	getters: {},
	actions: {
		updateConfirmMessage: ({ commit }, message) =>
			commit("updateConfirmMessage", message)
	},
	mutations: {
		updateConfirmMessage(state, message) {
			state.message = message;
		}
	}
};
