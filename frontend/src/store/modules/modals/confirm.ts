/* eslint no-param-reassign: 0 */
// TODO - Remove action and param once fully removed from components
export default {
	namespaced: true,
	state: {
		message: "",
		onCompleted: null,
		action: null,
		params: null
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		confirm: ({ state }) => {
			state.onCompleted({
				action: state.action,
				params: state.params
			});
		}
	},
	mutations: {
		init(state, { message, onCompleted, action, params }) {
			state.message = message;
			state.onCompleted = onCompleted;
			state.action = action;
			state.params = params;
		}
	}
};
