/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		reportId: ""
	},
	actions: {
		init: ({ commit }, data) => commit("init", data)
	},
	mutations: {
		init(state, { reportId }) {
			state.reportId = reportId;
		}
	}
};
