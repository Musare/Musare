import { defineStore } from "pinia";

export const useLongJobsStore = defineStore("longJobs", {
	state: () => ({
		activeJobs: [],
		removedJobIds: []
	}),
	actions: {
		setJob({ id, name, status, message }) {
			if (this.removedJobIds.indexOf(id) === -1)
				if (!this.activeJobs.find(activeJob => activeJob.id === id))
					this.activeJobs.push({
						id,
						name,
						status,
						message
					});
				else
					this.activeJobs.forEach((activeJob, index) => {
						if (activeJob.id === id) {
							this.activeJobs[index] = {
								...this.activeJobs[index],
								status,
								message
							};
						}
					});
		},
		setJobs(jobs) {
			this.activeJobs = jobs;
		},
		removeJob(jobId) {
			this.activeJobs.forEach((activeJob, index) => {
				if (activeJob.id === jobId) {
					this.activeJobs.splice(index, 1);
					this.removedJobIds.push(jobId);
				}
			});
		}
	}
});
