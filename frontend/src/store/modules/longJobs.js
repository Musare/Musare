/* eslint no-param-reassign: 0 */

const state = {
	activeJobs: [
		{
			id: 1,
			name: "test",
			status: "success",
			log: [{ status: "success", message: "test" }]
		}
	]
};

const getters = {};

const actions = {
	setJob: ({ commit }, job) => commit("setJob", job),
	removeJob: ({ commit }, job) => commit("removeJob", job)
};

const mutations = {
	setJob(state, { id, name, status, message }) {
		if (status === "started")
			state.activeJobs.push({
				id,
				name,
				status,
				log: [{ status, message }]
			});
		else
			state.activeJobs.forEach((activeJob, index) => {
				if (activeJob.id === id) {
					state.activeJobs[index] = {
						...state.activeJobs[index],
						status
					};
					state.activeJobs[index].log.push({ status, message });
				}
			});
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
