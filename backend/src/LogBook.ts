import fs from "fs";

export type Log = {
	timestamp: number;
	message: string;
	type?: "info" | "success" | "error" | "debug";
	category?: string;
	data?: Record<string, any>;
};

export type LogFilters = {
	include: Partial<Omit<Log, "timestamp">>[];
	exclude: Partial<Omit<Log, "timestamp">>[];
};

export type LogOutputOptions = Record<
	"timestamp" | "title" | "type" | "message" | "data" | "color",
	boolean
> &
	Partial<LogFilters>;

export type LogOutputs = {
	console: LogOutputOptions;
	file: LogOutputOptions;
	memory: { enabled: boolean } & Partial<LogFilters>;
};

export default class LogBook {
	private logs: Log[];

	private outputs: LogOutputs;

	private stream: fs.WriteStream;

	/**
	 * Log Book
	 */
	public constructor(file = "logs/backend.log") {
		this.logs = [];
		this.outputs = {
			console: {
				timestamp: true,
				title: true,
				type: false,
				message: true,
				data: false,
				color: true,
				exclude: [
					// {
					// 	category: "jobs",
					// 	type: "success"
					// },
					// {
					// 	type: "debug"
					// }
				]
			},
			file: {
				timestamp: true,
				title: true,
				type: true,
				message: true,
				data: false,
				color: false
			},
			memory: {
				enabled: false
			}
		};
		this.stream = fs.createWriteStream(file, { flags: "a" });
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
		const exclude = {
			console: false,
			file: false,
			memory: false
		};
		Object.entries(logObject).forEach(([key, value]) => {
			Object.entries(this.outputs).forEach(([outputName, output]) => {
				if (
					(output.include &&
						output.include.length > 0 &&
						output.include.filter(
							// @ts-ignore
							filter => filter[key] === value
						).length === 0) ||
					(output.exclude &&
						output.exclude.filter(
							// @ts-ignore
							filter => filter[key] === value
						).length > 0)
				)
					// @ts-ignore
					exclude[outputName] = true;
			});
		});
		const title =
			(logObject.data && logObject.data.jobName) ||
			logObject.category ||
			undefined;
		if (!exclude.memory && this.outputs.memory.enabled)
			this.logs.push(logObject);
		if (!exclude.console)
			console.log(this.formatMessage(logObject, title, "console"));
		if (!exclude.file)
			this.stream.write(
				`${this.formatMessage(logObject, title, "file")}\n`
			);
	}

	/**
	 * formatMessage - Format log to string
	 *
	 * @param log - Log
	 * @param title - Log title
	 * @param destination - Message destination
	 * @returns Formatted log string
	 */
	private formatMessage(
		log: Log,
		title: string | undefined,
		destination: "console" | "file"
	): string {
		const centerString = (string: string, length: number) => {
			const spaces = Array(
				Math.floor((length - Math.max(0, string.length)) / 2)
			).join(" ");
			return `| ${spaces}${string}${spaces}${
				string.length % 2 === 0 ? "" : " "
			} `;
		};
		let message = "";
		if (this.outputs[destination].color)
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
		if (this.outputs[destination].timestamp)
			message += `| ${new Date(log.timestamp).toISOString()} `;
		if (this.outputs[destination].title)
			message += centerString(title ? title.substring(0, 20) : "", 24);
		if (this.outputs[destination].type)
			message += centerString(
				log.type ? log.type.toUpperCase() : "INFO",
				10
			);
		if (this.outputs[destination].message) message += `| ${log.message} `;
		if (this.outputs[destination].data)
			message += `| ${JSON.stringify(log.data)} `;
		if (this.outputs[destination].color) message += "\x1b[0m";
		return message;
	}

	/**
	 * updateOutput - Update output settings
	 *
	 * @param output - Output name
	 * @param key - Output key to update
	 * @param action - Update action
	 * @param values - Updated value
	 */
	public async updateOutput(
		output: "console" | "file" | "memory",
		key: keyof LogOutputOptions | "enabled",
		action: "set" | "add" | "reset",
		values?: any
	) {
		switch (key) {
			case "include":
			case "exclude": {
				if (action === "set" || action === "add") {
					if (!values) throw new Error("No filters provided");
					const filters = Array.isArray(values) ? values : [values];
					if (action === "set") this.outputs[output][key] = filters;
					if (action === "add")
						this.outputs[output][key] = [
							...(this.outputs[output][key] || []),
							...filters
						];
				} else if (action === "reset") {
					this.outputs[output][key] = [];
				} else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
				break;
			}
			case "enabled": {
				if (output === "memory" && action === "set")
					this.outputs[output][key] = values;
				else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
				break;
			}
			default: {
				if (output !== "memory" && action === "set") {
					if (!values) throw new Error("No value provided");
					this.outputs[output][key] = values;
				} else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
			}
		}
	}
}
