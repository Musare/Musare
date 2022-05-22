/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		requestId: null,
		request: {}
	},
	getters: {},
	actions: {
		init: ({ commit }, data) => commit("init", data),
		viewApiRequest: ({ commit }, request) =>
			commit("viewApiRequest", request)
	},
	mutations: {
		init(state, { requestId }) {
			state.requestId = requestId;
		},
		viewApiRequest(state, request) {
			state.request = request;
		}
	}
};
