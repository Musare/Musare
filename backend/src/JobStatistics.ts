export default class JobStatistics {
	static primaryInstance: JobStatistics;

	private stats: Record<
		string,
		{
			successful: number;
			failed: number;
			total: number;
			added: number;
			averageTime: number;
		}
	>;

	public constructor() {
		this.stats = {};
	}

	/**
	 * getStats - Get statistics of job queue
	 *
	 * @returns Job queue statistics
	 */
	public getStats() {
		return {
			...this.stats,
			total: Object.values(this.stats).reduce(
				(a, b) => ({
					successful: a.successful + b.successful,
					failed: a.failed + b.failed,
					total: a.total + b.total,
					added: a.added + b.added,
					averageTime: -1
				}),
				{
					successful: 0,
					failed: 0,
					total: 0,
					added: 0,
					averageTime: -1
				}
			)
		};
	}

	/**
	 * updateStats - Update job statistics
	 *
	 * @param jobName - Job name
	 * @param type - Stats type
	 * @param duration - Duration of job, for average time stats
	 */
	public updateStats(
		jobName: string,
		type: "successful" | "failed" | "total" | "added" | "averageTime",
		duration?: number
	) {
		if (!this.stats[jobName])
			this.stats[jobName] = {
				successful: 0,
				failed: 0,
				total: 0,
				added: 0,
				averageTime: 0
			};
		if (type === "averageTime" && duration)
			this.stats[jobName].averageTime +=
				(duration - this.stats[jobName].averageTime) /
				this.stats[jobName].total;
		else this.stats[jobName][type] += 1;
	}

	static getPrimaryInstance(): JobStatistics {
		return this.primaryInstance;
	}

	static setPrimaryInstance(jobStatistics: JobStatistics) {
		this.primaryInstance = jobStatistics;
	}
}
