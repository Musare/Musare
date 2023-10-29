export class JobStatistics {
	private _stats: Record<
		string,
		{
			successful: number;
			failed: number;
			total: number;
			added: number;
			averageTime: number;
			totalTime: number;
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
		const total = Object.values(this._stats).reduce(
			(a, b) => ({
				successful: a.successful + b.successful,
				failed: a.failed + b.failed,
				total: a.total + b.total,
				added: a.added + b.added,
				averageTime: -1,
				totalTime: a.totalTime + b.totalTime
			}),
			{
				successful: 0,
				failed: 0,
				total: 0,
				added: 0,
				averageTime: -1,
				totalTime: 0
			}
		);
		total.averageTime = total.totalTime / total.total;

		return {
			...this._stats,
			total
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
		type: "successful" | "failed" | "total" | "added" | "duration",
		duration?: number
	) {
		if (!this._stats[jobName])
			this._stats[jobName] = {
				successful: 0,
				failed: 0,
				total: 0,
				added: 0,
				averageTime: 0,
				totalTime: 0
			};
		if (type === "duration") {
			if (!duration) throw new Error("No duration specified");

			this._stats[jobName].totalTime += duration;

			this._stats[jobName].averageTime =
				this._stats[jobName].totalTime / this._stats[jobName].total;
		} else this._stats[jobName][type] += 1;
	}
}

export default new JobStatistics();
