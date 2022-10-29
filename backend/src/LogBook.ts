export type Log = {
	timestamp: number;
	message: string;
	type?: "info" | "success" | "error" | "debug";
	category?: string;
	data?: Record<string, any>;
};

export default class LogBook {
	private logs: Log[];

	private filter: {
		include: Partial<Omit<Log, "timestamp">>[];
		exclude: Partial<Omit<Log, "timestamp">>[];
		silence: Partial<Omit<Log, "timestamp">>[];
	};

	private display: Record<
		"timestamp" | "title" | "type" | "message" | "data",
		boolean
	>;

	/**
	 * Log Book
	 */
	public constructor() {
		this.logs = [];
		this.filter = {
			include: [],
			exclude: [],
			silence: [
				{
					category: "jobs"
				}
			]
		};
		this.display = {
			timestamp: true,
			title: true,
			type: false,
			message: true,
			data: false
		};
	}

	/**
	 * log - Add log
	 *
	 * @param log - Log message or object
	 */
	public log(log: string | Omit<Log, "timestamp">) {
		const logObject: Log = {
			timestamp: Date.now(),
			...(typeof log === "string" ? { message: log } : log)
		};
		let exclude = false;
		let silence = false;
		Object.entries(logObject).forEach(([key, value]) => {
			if (
				(this.filter.include.length > 0 &&
					// @ts-ignore
					this.filter.include.filter(filter => filter[key] === value)
						.length === 0) ||
				// @ts-ignore
				this.filter.exclude.filter(filter => filter[key] === value)
					.length > 0
			)
				exclude = true;
			if (
				// @ts-ignore
				this.filter.silence.filter(filter => filter[key] === value)
					.length > 0
			)
				silence = true;
		});
		if (!exclude) {
			this.logs.push(logObject); // TODO: Replace with file storage
			if (!silence) {
				this.printMessage(
					logObject,
					(logObject.data && logObject.data.jobName) ||
						logObject.category ||
						undefined
				);
			}
		}
	}

	/**
	 * printMessage - Output formatted log to stdout
	 *
	 * @param log - Log
	 * @param title - Log title
	 */
	private printMessage(log: Log, title?: string) {
		const centerString = (string: string, length: number) => {
			const spaces = Array(
				Math.floor((length - Math.max(0, string.length)) / 2)
			).join(" ");
			return `| ${spaces}${string}${spaces}${
				string.length % 2 === 0 ? "" : " "
			} `;
		};
		let message = "";
		switch (log.type) {
			case "success":
				message += "\x1b[32m";
				break;
			case "error":
				message += "\x1b[31m";
				break;
			case "debug":
				message += "\x1b[33m";
				break;
			case "info":
			default:
				message += "\x1b[36m";
				break;
		}
		if (this.display.timestamp) message += `| ${log.timestamp} `;
		if (this.display.title)
			message += centerString(title ? title.substring(0, 20) : "", 24);
		if (this.display.type)
			message += centerString(
				log.type ? log.type.toUpperCase() : "INFO",
				10
			);
		if (this.display.message) message += `| ${log.message} `;
		if (this.display.data) message += `| ${JSON.stringify(log.data)} `;
		message += "\x1b[0m";
		console.log(message);
	}

	/**
	 * setFilter - Apply filters for current session
	 *
	 * @param filter - Filter type
	 * @param action - Action
	 * @param filters - Filters
	 */
	public setFilter<T extends keyof LogBook["filter"]>(
		filter: T,
		action: "set" | "add" | "reset",
		filters?: LogBook["filter"][T]
	) {
		if (action === "reset") this.filter[filter] = [];
		if (action === "set" || action === "add") {
			if (!filters || filters.length === 0)
				throw new Error("No filters provided");
			if (action === "set") this.filter[filter] = filters;
			if (action === "add")
				this.filter[filter] = [...this.filter[filter], ...filters];
		}
	}
}
