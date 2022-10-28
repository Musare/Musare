import util from "util";
import * as readline from "node:readline";
import ModuleManager from "./ModuleManager";

// Replace console.log with something that replaced certain phrases/words
const blacklistedConsoleLogs: string[] = [];
const oldConsole = { log: console.log };
console.log = (...args) => {
	const string = util.format.apply(null, args);
	let blacklisted = false;

	blacklistedConsoleLogs.forEach(blacklistedConsoleLog => {
		if (string.indexOf(blacklistedConsoleLog) !== -1) blacklisted = true;
	});

	if (!blacklisted) oldConsole.log.apply(null, args);
};

const moduleManager = new ModuleManager();
moduleManager.startup();

const interval = setInterval(() => {
	moduleManager
		.runJob("stations", "addToQueue", { songId: "TestId" })
		.catch(() => {});
	moduleManager.runJob("stations", "addA").catch(() => {});
	moduleManager
		.runJob("others", "doThing", { test: "Test", test2: 123 })
		.catch(() => {});
}, 40);

setTimeout(() => {
	clearTimeout(interval);
}, 20000);

process.on("uncaughtException", err => {
	if (err.name === "ECONNREFUSED" || err.name === "UNCERTAIN_STATE") return;

	console.log(`UNCAUGHT EXCEPTION: ${err.stack}`);
});

const shutdown = () => {
	moduleManager
		.shutdown()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
};
process.on("SIGINT", shutdown);
process.on("SIGQUIT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGUSR2", shutdown);

const runCommand = (line: string) => {
	const [command, ...args] = line.split(" ");
	switch (command) {
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
		default: {
			if (!/^\s*$/.test(command) && command !== "rs")
				console.log(`Command "${command}" not found`);
		}
	}
};

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
	}
});

rl.on("line", runCommand);
