// @ts-nocheck
import config from "config";

export type Log = {
	timestamp: number;
	message: string;
	type?: "info" | "success" | "error" | "debug";
	category?: string;
	data?: Record<string, unknown>;
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
	memory: { enabled: boolean } & Partial<LogFilters>;
};

export default class LogBook {
	private logs: Log[];

	private default: LogOutputs;

	private outputs: LogOutputs;

	/**
	 * Log Book
	 */
	public constructor() {
		this.logs = [];
		this.default = {
			console: {
				timestamp: true,
				title: true,
				type: false,
				message: true,
				data: false,
				color: true,
				exclude: [
					{
						category: "jobs",
						type: "success"
					},
					{
						type: "debug"
					}
				]
			},
			memory: {
				enabled: false
			}
		};
		if (config.has("logging"))
			(["console", "memory"] as (keyof LogOutputs)[]).forEach(output => {
				if (config.has(`logging.${output}`))
					this.default[output] = {
						...this.default[output],
						...config.get<any>(`logging.${output}`)
					};
			});
		this.outputs = this.default;
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
			memory: false
		};
		(Object.entries(logObject) as [keyof Log, Log[keyof Log]][]).forEach(
			([key, value]) => {
				(
					Object.entries(this.outputs) as [
						keyof LogOutputs,
						LogOutputs[keyof LogOutputs]
					][]
				).forEach(([outputName, output]) => {
					if (
						(output.include &&
							output.include.length > 0 &&
							output.include.filter(
								filter =>
									key !== "timestamp" && filter[key] === value
							).length === 0) ||
						(output.exclude &&
							output.exclude.filter(
								filter =>
									key !== "timestamp" && filter[key] === value
							).length > 0)
					)
						exclude[outputName] = true;
				});
			}
		);
		const title =
			(logObject.data && logObject.data.jobName) ||
			logObject.category ||
			undefined;
		if (!exclude.memory && this.outputs.memory.enabled)
			this.logs.push(logObject);
		if (!exclude.console) {
			const message = this.formatMessage(logObject, String(title));
			const logArgs = this.outputs.console.data
				? [message]
				: [message, logObject.data];
			switch (logObject.type) {
				case "debug": {
					console.debug(...logArgs);
					break;
				}
				case "error": {
					console.error(...logArgs);
					break;
				}
				default:
					console.log(...logArgs);
			}
		}
	}

	/**
	 * formatMessage - Format log to string
	 *
	 * @param log - Log
	 * @param title - Log title
	 * @returns Formatted log string
	 */
	private formatMessage(log: Log, title: string | undefined): string {
		const centerString = (string: string, length: number) => {
			const spaces = Array(
				Math.floor((length - Math.max(0, string.length)) / 2)
			).join(" ");
			return `| ${spaces}${string}${spaces}${
				string.length % 2 === 0 ? "" : " "
			} `;
		};
		let message = "";
		if (this.outputs.console.color)
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
		if (this.outputs.console.timestamp)
			message += `| ${new Date(log.timestamp).toISOString()} `;
		if (this.outputs.console.title)
			message += centerString(title ? title.substring(0, 20) : "", 24);
		if (this.outputs.console.type)
			message += centerString(
				log.type ? log.type.toUpperCase() : "INFO",
				10
			);
		if (this.outputs.console.message) message += `| ${log.message} `;
		if (this.outputs.console.color) message += "\x1b[0m";
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
		output: "console" | "memory",
		key: keyof LogOutputOptions | "enabled",
		action: "set" | "add" | "reset",
		values?: LogOutputOptions[keyof LogOutputOptions]
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
					this.outputs[output][key] = this.default[output][key] || [];
				} else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
				break;
			}
			case "enabled": {
				if (output === "memory" && action === "set") {
					if (values === undefined)
						throw new Error("No value provided");
					this.outputs[output][key] = !!values;
				} else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
				break;
			}
			default: {
				if (output !== "memory" && action === "set") {
					if (values === undefined)
						throw new Error("No value provided");
					this.outputs[output][key] = !!values;
				} else if (output !== "memory" && action === "reset") {
					this.outputs[output][key] = this.default[output][key];
				} else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
			}
		}
	}
}
