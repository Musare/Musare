import * as readline from "node:readline";
import ModuleManager from "@/ModuleManager";
import LogBook from "@/LogBook";
import JobQueue from "@/JobQueue";
import JobStatistics from "@/JobStatistics";

const logBook = LogBook.getPrimaryInstance();

process.removeAllListeners("uncaughtException");
process.on("uncaughtException", err => {
	if (err.name === "ECONNREFUSED" || err.name === "UNCERTAIN_STATE") return;

	logBook.log({
		message: err.message,
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

const moduleManager = ModuleManager.getPrimaryInstance();
const jobQueue = JobQueue.getPrimaryInstance();

moduleManager.startup().then(async () => {

	const Model = await jobQueue.runJob("data", "getModel", { name: "news" });
	// console.log("Model", Model);
	const abcs = await Model.findOne({}).newest();
	console.log("Abcs", abcs);
	console.log(
		"getData",
		await Model.getData({
			page: 1,
			pageSize: 3,
			properties: [
				"title",
				"markdown",
				"status",
				"showToNewUsers",
				"createdBy"
			],
			sort: {},
			queries: [
				{
					data: "v7",
					filter: { property: "title" },
					filterType: "contains"
				}
			],
			operator: "and"
		})
	);

	// Model.create({
	// 	name: "Test name",
	// 	someNumbers: [1, 2, 3, 4],
	// 	songs: [],
	// 	aNumber: 941
	// });

	// Events schedule (was notifications)
	const now = Date.now();
	await jobQueue.runJob("events", "schedule", {
		channel: "test",
		time: 30000
	});
	await jobQueue.runJob("events", "subscribe", {
		channel: "test",
		type: "schedule",
		callback: async () => {
			console.log(`SCHEDULED: ${now} :: ${Date.now()}`);
		}
	});

	// Events (was cache pub/sub)
	await jobQueue.runJob("events", "subscribe", {
		channel: "test",
		callback: async value => {
			console.log(`PUBLISHED: ${value}`);
		}
	});
	await jobQueue.runJob("events", "publish", {
		channel: "test",
		value: "a value!"
	});
});

// TOOD remove, or put behind debug option
// eslint-disable-next-line
// @ts-ignore
global.moduleManager = moduleManager;
// eslint-disable-next-line
// @ts-ignore
global.jobQueue = jobQueue;
// eslint-disable-next-line
// @ts-ignore
global.rs = () => {
	process.exit();
};

// setTimeout(async () => {
//	const start = Date.now();
//	const x = [];
//	while (x.length < 1) {
//		x.push(jobQueue.runJob("stations", "addC", {}).catch(() => {}));
//	}
//	const y = await Promise.all(x);
//	console.log(y);
//	// const a = await jobQueue.runJob("stations", "addC", {}).catch(() => {});
//	// console.log(555, a);
//	const difference = Date.now() - start;
//	console.log({ difference });
// }, 100);

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
			console.log("status - Show module manager and job queue status");
			console.log("stats - Shows jobs stats");
			console.log("queue - Shows a table of all jobs in the queue");
			console.log("active - Shows a table of all jobs currently running");
			console.log("jobinfo <jobId> - Print all info about a job");
			console.log("eval - Run a command");
			console.log("debug");
			console.log("log - Change LogBook settings");
			break;
		}
		case "status": {
			console.log("Module Manager Status:");
			console.table(moduleManager.getStatus());
			console.log("Job Queue Status:");
			console.table(jobQueue.getStatus());
			break;
		}
		case "stats": {
			console.log("Job Queue Stats:");
			console.table(JobStatistics.getPrimaryInstance().getStats());
			break;
		}
		case "queue": {
			const queueStatus = jobQueue.getQueueStatus().queue;
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
			const activeStatus = jobQueue.getQueueStatus().active;
			if (activeStatus.length === 0)
				console.log("There are no active jobs.");
			else console.log(`There are ${activeStatus.length} active jobs.`);
			console.table(activeStatus);
			break;
		}
		case "jobinfo": {
			if (args.length === 0) console.log("Please specify a jobId");
			else {
				const jobId = args[0];
				const job = jobQueue.getJob(jobId);

				if (!job) console.log(`Job "${jobId}" not found`);
				else {
					console.table(job.toJSON());
				}
			}
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
				// eslint-disable-next-line
				// @ts-ignore
				.updateOutput(output, key, action, value)
				.then(() => console.log("Successfully updated outputs"))
				.catch((err: Error) =>
					console.log(`Error updating outputs "${err.message}"`)
				);
			break;
		}
		case "getjobs": {
			console.log(moduleManager.getJobs());
			break;
		}
		default: {
			if (!/^\s*$/.test(command))
				console.log(`Command "${command}" not found`);
		}
	}
};

rl.on("line", runCommand);
