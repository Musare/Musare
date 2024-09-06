import * as readline from "node:readline";
import { NewsStatus } from "@models/News/NewsStatus";
import ModuleManager from "@/ModuleManager";
import LogBook from "@/LogBook";
import JobQueue from "@/JobQueue";
import JobStatistics from "@/JobStatistics";
// import DataModule from "@/modules/DataModule";
import EventsModule from "./modules/EventsModule";
// import { NewsModel } from "./modules/DataModule/models/news/schema";
// import { FilterType } from "./modules/DataModule/plugins/getData";
import News from "./modules/DataModule/models/News";
import GetData from "./modules/DataModule/models/News/jobs/GetData";

process.removeAllListeners("uncaughtException");
process.on("uncaughtException", err => {
	if (err.name === "ECONNREFUSED" || err.name === "UNCERTAIN_STATE") return;

	LogBook.log({
		message: err.message,
		type: "error",
		category: "uncaught-exceptions",
		data: { error: err }
	});
});

ModuleManager.startup().then(async () => {
	// const Model = await DataModule.getModel<NewsModel>("news");
	// // console.log("Model", Model);
	// const abcs = await Model.findOne({}).newest();
	// console.log("Abcs", abcs);
	// console.log(
	// 	"getData",
	// 	await Model.getData({
	// 		page: 1,
	// 		pageSize: 3,
	// 		properties: [
	// 			"title",
	// 			"markdown",
	// 			"status",
	// 			"showToNewUsers",
	// 			"createdBy"
	// 		],
	// 		sort: {},
	// 		queries: [
	// 			{
	// 				data: "v7",
	// 				filter: { property: "title" },
	// 				filterType: FilterType.CONTAINS
	// 			}
	// 		],
	// 		operator: "and"
	// 	})
	// );

	// Model.create({
	// 	name: "Test name",
	// 	someNumbers: [1, 2, 3, 4],
	// 	songs: [],
	// 	aNumber: 941
	// });

	// Events schedule (was notifications)
	// const now = Date.now();
	// EventsModule.schedule("test", 30000);

	// await EventsModule.subscribe("schedule", "test", async () => {
	// 	console.log(`SCHEDULED: ${now} :: ${Date.now()}`);
	// });

	// // Events (was cache pub/sub)
	// await EventsModule.subscribe("event", "test", async value => {
	// 	console.log(`PUBLISHED: ${value}`);
	// });
	// await EventsModule.publish("test", "a value!");

	console.log(
		await News.findAll({
			include: ["createdByModel"],
			where: {
				status: NewsStatus.PUBLISHED
			}
		})
	);

	console.log(
		await new GetData({
			page: 1,
			pageSize: 10,
			properties: ["id"],
			sort: {
				id: "ascending"
			},
			queries: [],
			operator: "and"
		}).execute()
	);
});

// TOOD remove, or put behind debug option
// eslint-disable-next-line
// @ts-ignore
global.ModuleManager = ModuleManager;
// eslint-disable-next-line
// @ts-ignore
global.JobQueue = JobQueue;
// eslint-disable-next-line
// @ts-ignore
global.rs = () => {
	process.exit();
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
	},
	removeHistoryDuplicates: true
});

const shutdown = async () => {
	if (rl) {
		rl.removeAllListeners();
		rl.close();
	}
	await ModuleManager.shutdown().catch(() => process.exit(1));
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
			console.log("eval - Run a command");
			console.log("debug");
			console.log("log - Change LogBook settings");
			break;
		}
		case "status": {
			console.log("Module Manager Status:");
			console.table(ModuleManager.getStatus());
			console.log("Job Queue Status:");
			console.table(JobQueue.getStatus());
			break;
		}
		case "stats": {
			console.log("Job Statistics:");
			console.table(JobStatistics.getStats());
			break;
		}
		case "queue": {
			const queueStatus = JobQueue.getQueueStatus().queue;
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
			const activeStatus = JobQueue.getQueueStatus().active;
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
			LogBook
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
			console.log(ModuleManager.getJobs());
			break;
		}
		case "getevents": {
			console.log(EventsModule.getAllEvents());
			break;
		}
		default: {
			if (!/^\s*$/.test(command))
				console.log(`Command "${command}" not found`);
		}
	}
};

rl.on("line", runCommand);
