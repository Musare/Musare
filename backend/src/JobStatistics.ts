export default class JobStatistics {
	static primaryInstance = new this();

	private _stats: Record<
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
		this._stats = {};
	}

	/**
	 * getStats - Get statistics of job queue
	 *
	 * @returns Job queue statistics
	 */
	public getStats() {
		return {
			...this._stats,
			total: Object.values(this._stats).reduce(
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
		if (!this._stats[jobName])
			this._stats[jobName] = {
				successful: 0,
				failed: 0,
				total: 0,
				added: 0,
				averageTime: 0
			};
		if (type === "averageTime" && duration)
			this._stats[jobName].averageTime +=
				(duration - this._stats[jobName].averageTime) /
				this._stats[jobName].total;
		else this._stats[jobName][type] += 1;
	}

	static getPrimaryInstance(): JobStatistics {
		return this.primaryInstance;
	}

	static setPrimaryInstance(instance: JobStatistics) {
		this.primaryInstance = instance;
	}
}
