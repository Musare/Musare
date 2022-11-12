import * as readline from "node:readline";
import ModuleManager from "./ModuleManager";
import LogBook from "./LogBook";

const logBook = new LogBook();

process.removeAllListeners("uncaughtException");
process.on("uncaughtException", err => {
	if (err.name === "ECONNREFUSED" || err.name === "UNCERTAIN_STATE") return;

	logBook.log({
		message: err.message || err,
		type: "error",
		category: "uncaught-exceptions",
		data: {
			error: err.message
				? {
						cause: err.cause,
						name: err.name,
						stack: err.stack
				  }
				: err
		}
	});
});

const moduleManager = new ModuleManager(logBook);
moduleManager.startup();

// TOOD remove, or put behind debug option
// eslint-disable-next-line
// @ts-ignore
global.moduleManager = moduleManager;
// eslint-disable-next-line
// @ts-ignore
global.rs = () => {
	process.exit();
};

// const interval = setInterval(() => {
// 	moduleManager
// 		.runJob("stations", "addToQueue", { songId: "TestId" })
// 		.catch(() => {});
// 	moduleManager
// 		.runJob("stations", "addA", {}, { priority: 5 })
// 		.catch(() => {});
// 	moduleManager
// 		.runJob("others", "doThing", { test: "Test", test2: 123 })
// 		.catch(() => {});
// }, 40);

// setTimeout(() => {
// 	clearTimeout(interval);
// }, 3000);

setTimeout(async () => {
	// logBook.log("Find with no projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id: "636fdc713450b25c3fc4ab0a"
	// 		}
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);
	// logBook.log("Find with array projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id: "636fdc713450b25c3fc4ab0a"
	// 		},
	// 		projection: ["name"]
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);
	// logBook.log("Find with object boolean projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id: "636fdc713450b25c3fc4ab0a"
	// 		},
	// 		projection: { name: true }
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);
	// logBook.log("Find with object number projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id: "636fdc713450b25c3fc4ab0a"
	// 		},
	// 		projection: { name: 1 }
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);
	// logBook.log("Find with object number projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id: "636fdc713450b25c3fc4ab0a"
	// 		},
	// 		projection: { "autofill.enabled": true }
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);
}, 0);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	completer: (command: string) => {
		const parts = command.split(" ");
		const commands = ["eval "];

		if (parts.length === 1) {
			const hits = commands.filter(c => c.startsWith(parts[0]));

			return [hits.length ? hits : commands, command];
		}

		return [];
	},
	removeHistoryDuplicates: true
});

const shutdown = async () => {
	if (rl) {
		rl.removeAllListeners();
		rl.close();
	}
	await moduleManager.shutdown().catch(() => process.exit(1));
	process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGQUIT", shutdown);
process.on("SIGTERM", shutdown);

const runCommand = (line: string) => {
	const [command, ...args] = line.split(" ");
	switch (command) {
		case "help": {
			console.log("Commands:");
			console.log("status");
			console.log("stats");
			console.log("queue");
			console.log("active");
			console.log("eval");
			console.log("debug");
			console.log("log");
			break;
		}
		case "status": {
			console.log("Module Manager Status:");
			console.table(moduleManager.getStatus());
			console.log("Job Queue Status:");
			console.table(moduleManager.getJobsStatus());
			break;
		}
		case "stats": {
			console.log("Job Queue Stats:");
			console.table(moduleManager.getJobsStats());
			break;
		}
		case "queue": {
			const queueStatus = moduleManager.getQueueStatus().queue;
			if (queueStatus.length === 0)
				console.log("There are no jobs in the queue.");
			else
				console.log(
					`There are ${queueStatus.length} jobs in the queue.`
				);
			console.table(queueStatus);
			break;
		}
		case "active": {
			const activeStatus = moduleManager.getQueueStatus().active;
			if (activeStatus.length === 0)
				console.log("There are no active jobs.");
			else console.log(`There are ${activeStatus.length} active jobs.`);
			console.table(activeStatus);
			break;
		}
		case "eval": {
			const evalCommand = args.join(" ");
			console.log(`Running eval command: ${evalCommand}`);
			// eslint-disable-next-line no-eval
			const response = eval(evalCommand);
			console.log(`Eval response: `, response);
			break;
		}
		case "debug": {
			// eslint-disable-next-line no-debugger
			debugger;
			break;
		}
		case "log": {
			const [output, key, action, ...values] = args;
			if (
				output === undefined ||
				key === undefined ||
				action === undefined
			) {
				console.log(
					`Missing required parameters (log <output> <key> <action> [values])`
				);
				break;
			}
			let value: any[] | undefined;
			if (values !== undefined && values.length >= 1) {
				value = values.map(_filter => JSON.parse(_filter));
				if (value.length === 1) [value] = value;
			}
			logBook
				// @ts-ignore
				.updateOutput(output, key, action, value)
				.then(() => console.log("Successfully updated outputs"))
				.catch((err: Error) =>
					console.log(`Error updating outputs "${err.message}"`)
				);
			break;
		}
		default: {
			if (!/^\s*$/.test(command))
				console.log(`Command "${command}" not found`);
		}
	}
};

rl.on("line", runCommand);
