/* eslint no-param-reassign: 0 */

const state = {
	activeJobs: [
		// {
		// 	id: 1,
		// 	name: "test",
		// 	status: "success",
		// 	message: "test"
		// }
	]
};

const getters = {};

const actions = {
	setJob: ({ commit }, job) => commit("setJob", job),
	setJobs: ({ commit }, jobs) => commit("setJobs", jobs),
	removeJob: ({ commit }, job) => commit("removeJob", job)
};

const mutations = {
	setJob(state, { id, name, status, message }) {
		if (status === "started")
			state.activeJobs.push({
				id,
				name,
				status
			});
		else
			state.activeJobs.forEach((activeJob, index) => {
				if (activeJob.id === id) {
					state.activeJobs[index] = {
						...state.activeJobs[index],
						status,
						message
					};
				}
			});
	},
	setJobs(state, jobs) {
		state.activeJobs = jobs;
	},
	removeJob(state, jobId) {
		state.activeJobs.forEach((activeJob, index) => {
			if (activeJob.id === jobId) {
				state.activeJobs.splice(index, 1);
			}
		});
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
