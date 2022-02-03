/* eslint no-param-reassign: 0 */
/* eslint-disable import/no-cycle */

import admin from "@/api/admin/index";

const state = {};
const getters = {};
const actions = {};
const mutations = {};

const modules = {
	songs: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {},
		mutations: {}
	},
	stations: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {},
		mutations: {}
	},
	reports: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {
			/* eslint-disable-next-line no-unused-vars */
			resolveReport: ({ commit }, reportId) =>
				new Promise((resolve, reject) => {
					admin.reports
						.resolve(reportId)
						.then(res => resolve(res))
						.catch(err => reject(new Error(err.message)));
				})
		},
		mutations: {}
	},
	users: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {},
		mutations: {}
	},
	news: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {},
		mutations: {}
	},
	playlists: {
		namespaced: true,
		state: {},
		getters: {},
		actions: {},
		mutations: {}
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations,
	modules
};
