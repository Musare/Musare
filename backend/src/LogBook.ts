import config from "config";

export type Log = {
	timestamp: number;
	message: string;
	type?: "info" | "success" | "error" | "debug";
	category?: string;
	data?: Record<string, unknown> | Error;
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

export class LogBook {
	// A list of log objects stored in memory, if enabled generally
	private _logs: Log[];

	private _default: LogOutputs;

	// Settings for different outputs. Currently only memory and outputs is supported as an output
	// Constructed first via defaults, then via settings set in the config, and then you can make any other changes via a backend command (not persistent)
	private _outputs: LogOutputs;

	/**
	 * Log Book
	 */
	public constructor() {
		this._logs = [];
		this._default = {
			console: {
				timestamp: true,
				title: true,
				type: true,
				message: true,
				data: false,
				color: true,
				exclude: [
					// Success messages for jobs don't tend to be very helpful, so we exclude them by default
					{
						category: "jobs",
						type: "success"
					},
					// We don't want to show debug messages in the console by default
					{
						type: "debug"
					}
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
					this._default[output] = {
						...this._default[output],
						...config.get(`logging.${output}`)
					};
			});
		this._outputs = this._default;
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
					Object.entries(this._outputs) as [
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
		if (!exclude.memory && this._outputs.memory.enabled)
			this._logs.push(logObject);

		// If console is not excluded, format the log object, and then write the formatted message to the console
		if (!exclude.console) {
			const message = this._formatMessage(logObject, String(title));
			const logArgs: (string | Record<string, unknown>)[] = [message];

			// Append logObject data, if enabled and it's not falsy
			if (this._outputs.console.data && logObject.data)
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
	private _centerString(string: string, length: number) {
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
	private _formatMessage(log: Log, title: string | undefined): string {
		const messageParts = [];

		// If we want to show timestamps, e.g. 2022-11-28T18:13:28.081Z
		if (this._outputs.console.timestamp)
			messageParts.push(`${new Date(log.timestamp).toISOString()}`);

		// If we want to show the log type, in uppercase
		if (this._outputs.console.type)
			messageParts.push(
				`[${log.type ? log.type.toUpperCase() : "INFO"}]`
			);

		// If we want to show titles, show it
		if (this._outputs.console.title && title)
			messageParts.push(`[${title}]`);

		// If we want to the message, show it
		if (this._outputs.console.message) messageParts.push(log.message);

		const message = messageParts.join(" ");

		// If we want to show colors, prepend the color code
		if (this._outputs.console.color) {
			let coloredMessage = "";

			switch (log.type) {
				case "success":
					coloredMessage += COLOR_GREEN;
					break;
				case "error":
					coloredMessage += COLOR_RED;
					break;
				case "debug":
					coloredMessage += COLOR_YELLOW;
					break;
				case "info":
				default:
					coloredMessage += COLOR_CYAN;
					break;
			}

			coloredMessage += message;

			// Reset the color at the end of the message
			coloredMessage += COLOR_RESET;

			return coloredMessage;
		}

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
					if (action === "set") this._outputs[output][key] = filters;
					if (action === "add")
						this._outputs[output][key] = [
							...(this._outputs[output][key] || []),
							...filters
						];
				} else if (action === "reset") {
					this._outputs[output][key] =
						this._default[output][key] || [];
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
					this._outputs[output][key] = !!values;
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
					this._outputs[output][key] = !!values;
				} else if (output !== "memory" && action === "reset") {
					this._outputs[output][key] = this._default[output][key];
				} else
					throw new Error(
						`Action "${action}" not found for ${key} in ${output}`
					);
			}
		}
	}
}

export default new LogBook();
