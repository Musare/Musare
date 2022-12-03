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

// Color escape codes for stdout
const COLOR_GREEN = "\x1b[32m";
const COLOR_RED = "\x1b[31m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_CYAN = "\x1b[36m";
const COLOR_RESET = "\x1b[0m";

export default class LogBook {
	// A list of log objects stored in memory, if enabled generally
	private logs: Log[];

	private default: LogOutputs;

	// Settings for different outputs. Currently only memory and outputs is supported as an output
	// Constructed first via defaults, then via settings set in the config, and then you can make any other changes via a backend command (not persistent)
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
					// // Success messages for jobs don't tend to be very helpful, so we exclude them by default
					// {
					// 	category: "jobs",
					// 	type: "success"
					// },
					// // We don't want to show debug messages in the console by default
					// {
					// 	type: "debug"
					// }
				]
			},
			memory: {
				// Log messages in memory never get deleted, so we don't have this output on by default, only when debugging
				enabled: false
			}
		};
		if (config.has("logging"))
			(["console", "memory"] as (keyof LogOutputs)[]).forEach(output => {
				if (config.has(`logging.${output}`))
					this.default[output] = {
						...this.default[output],
						...config.get(`logging.${output}`)
					};
			});
		this.outputs = this.default;
	}

	/**
	 * Log a message to console and/or memory, if the log matches the filters of those outputs
	 *
	 * @param log - Log message or log object (without timestamp)
	 */
	public log(log: string | Omit<Log, "timestamp">) {
		// Construct the log object
		const logObject: Log = {
			timestamp: Date.now(),
			...(typeof log === "string" ? { message: log } : log)
		};

		// Whether we want to exclude console or memory, which we get in the next code block
		const exclude = {
			console: false,
			memory: false
		};
		// Loop through log object entries
		(Object.entries(logObject) as [keyof Log, Log[keyof Log]][]).forEach(
			([key, value]) => {
				// Timestamp is useless, so just return
				if (key === "timestamp") return;

				// Loop through outputs to see if they have any include/exclude filters
				(
					Object.entries(this.outputs) as [
						keyof LogOutputs,
						LogOutputs[keyof LogOutputs]
					][]
				).forEach(([outputName, output]) => {
					// This output has an include array, but the current key/value is not in any of the include filters, so exclude this output
					if (
						output.include &&
						output.include.length > 0 &&
						output.include.filter(filter => filter[key] === value)
							.length === 0
					)
						exclude[outputName] = true;

					// We have an exclude array, and the current key/value is in one or more of the filters, so exclude this output
					if (
						output.exclude &&
						output.exclude.filter(filter => filter[key] === value)
							.length > 0
					)
						exclude[outputName] = true;
				});
			}
		);

		// Title will be the jobname, or category of jobname is undefined
		const title =
			logObject.data?.jobName ?? logObject.category ?? undefined;

		// If memory is not excluded and memory is enabled, store the log object in the memory (logs array) of this logbook instance
		if (!exclude.memory && this.outputs.memory.enabled)
			this.logs.push(logObject);

		// If console is not excluded, format the log object, and then write the formatted message to the console
		if (!exclude.console) {
			const message = this.formatMessage(logObject, String(title));
			const logArgs: (string | Record<string, unknown>)[] = [message];

			// Append logObject data, if enabled and it's not falsy
			if (this.outputs.console.data && logObject.data)
				logArgs.push(logObject.data);

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
	 * Center a string within a given length, by padding spaces at the start and end
	 *
	 * @param string - The string we want to center
	 * @param length - The total amount of space we have to work with
	 * @returns
	 */
	private centerString(string: string, length: number) {
		const spaces = Array(
			Math.floor((length - Math.max(0, string.length)) / 2)
		).join(" ");
		return `${spaces}${string}${spaces}${
			string.length % 2 === 0 ? "" : " "
		}`;
	}

	/**
	 * Creates a formatted log message, with various options. Used for console
	 *
	 * @param log - Log
	 * @param title - Log title
	 * @returns Formatted log string
	 */
	private formatMessage(log: Log, title: string | undefined): string {
		let message = "";

		// If we want to show colors, prepend the color code
		if (this.outputs.console.color)
			switch (log.type) {
				case "success":
					message += COLOR_GREEN;
					break;
				case "error":
					message += COLOR_RED;
					break;
				case "debug":
					message += COLOR_YELLOW;
					break;
				case "info":
				default:
					message += COLOR_CYAN;
					break;
			}

		// If we want to show timestamps, e.g. 2022-11-28T18:13:28.081Z
		if (this.outputs.console.timestamp)
			message += `| ${new Date(log.timestamp).toISOString()} `;

		// If we want to show titles, show it centered and capped at 20 characters
		if (this.outputs.console.title)
			message += `| ${this.centerString(
				title ? title.substring(0, 20) : "",
				24
			)} `;

		// If we want to show the log type, show it centered, in uppercase
		if (this.outputs.console.type)
			message += `| ${this.centerString(
				log.type ? log.type.toUpperCase() : "INFO",
				10
			)} `;

		// If we want to the message, show it
		if (this.outputs.console.message) message += `| ${log.message} `;

		// Reset the color at the end of the message, if we have colors enabled
		if (this.outputs.console.color) message += COLOR_RESET;
		return message;
	}

	/**
	 * Update output settings for LogBook
	 * These are stored in the current instance of LogBook, not saved in a file, so when the backend restarts this data will not be persisted
	 * LogBook is currently used as a singleton, so changing it will update outputs for the same logbook used everywhere
	 *
	 * @param output - Output name (console or memory)
	 * @param key - Output key to update (include, exclude, enabled, name, type, etc.)
	 * @param action - Action (set, add or reset)
	 * @param values - Value we want to set
	 */
	public async updateOutput(
		output: "console" | "memory",
		key: keyof LogOutputOptions | "enabled",
		action: "set" | "add" | "reset",
		values?: LogOutputOptions[keyof LogOutputOptions]
	) {
		switch (key) {
			// Set, add-to or reset (to) the include/exclude filter lists for a specific output
			case "include":
			case "exclude": {
				if (action === "set" || action === "add") {
					if (!values || typeof values !== "object")
						throw new Error("No filters provided");
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
			// Set an output to be enabled or disabled
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
			// Set some other property of an output
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
