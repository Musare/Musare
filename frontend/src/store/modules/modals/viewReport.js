/* eslint no-param-reassign: 0 */

export default {
	namespaced: true,
	state: {
		viewingReportId: ""
	},
	actions: {
		viewReport: ({ commit }, reportId) => commit("viewReport", reportId)
	},
	mutations: {
		viewReport(state, reportId) {
			state.viewingReportId = reportId;
		}
	}
};
