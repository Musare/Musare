/* eslint no-param-reassign: 0 */

import admin from "../../../api/admin/index";

export default {
	namespaced: true,
	state: {
		report: {}
	},
	getters: {},
	actions: {
		viewReport: ({ commit }, report) => commit("viewReport", report),
		/* eslint-disable-next-line no-unused-vars */
		resolveReport: ({ commit }, reportId) => {
			return new Promise((resolve, reject) => {
				return admin.reports
					.resolve(reportId)
					.then(res => {
						return resolve(res);
					})
					.catch(err => {
						return reject(new Error(err.message));
					});
			});
		}
	},
	mutations: {
		viewReport(state, report) {
			state.report = report;
		}
	}
};
