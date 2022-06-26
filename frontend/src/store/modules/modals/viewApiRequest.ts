/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		requestId: null,
		request: {},
		removeAction: null
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		viewApiRequest: ({ commit }, request) =>
			commit("viewApiRequest", request)
	},
	mutations: {
		init(state, { requestId, removeAction }) {
			state.requestId = requestId;
			state.removeAction = removeAction;
		},
		viewApiRequest(state, request) {
			state.request = request;
		}
	}
};
