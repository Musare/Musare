import * as readline from "node:readline";
import { ObjectId } from "mongodb";
import ModuleManager from "./ModuleManager";
import LogBook from "./LogBook";
import Job from "./Job";

const logBook = new LogBook();

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

const interval = setInterval(() => {
	moduleManager
		.runJob("stations", "addToQueue", { songId: "TestId" })
		.catch(() => {});
	moduleManager
		.runJob("stations", "addA", {}, { priority: 5 })
		.catch(() => {});
	// moduleManager
	// 	.runJob("stations", "", { test: "Test", test2: 123 })
	// 	.catch(() => {});
}, 40);

setTimeout(() => {
	clearTimeout(interval);
}, 3000);

setTimeout(async () => {
	const _id = "6371212daf4e9f8fb14444b2";

	// logBook.log("Find with no projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id
	// 		}
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// logBook.log("Find with no projection, and a more advanced filter");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			"autofill.enabled": true
	// 		}
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// logBook.log("Find with array projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id
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
	// 			_id
	// 		},
	// 		projection: { name: true },
	// 		limit: 1
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);
	// logBook.log("Find with object number projection");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id
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
	// 			_id
	// 		},
	// 		projection: { "autofill.enabled": true }
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// logBook.log("Find for testing casting");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			// "songs._id": "6371212daf4e9f8fb14444b0"
	// 			// "songs._id": "6371212daf4e9f8fb14444b2"
	// 			// songs: {
	// 			// 	_id: "6371212daf4e9f8fb14444b0"
	// 			// }
	// 			// songs: {
	// 			// 	randomProperty: "6371212daf4e9f8fb14444b0"
	// 			// }
	// 			"songs.obj.test": "6371212daf4e9f8fb14444b0"
	// 		},
	// 		// projection: {
	// 		// 	// songs: true,
	// 		// 	// someNumbers: false
	// 		// },
	// 		limit: 1
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// logBook.log("Find for testing with $in");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			_id
	// 		},
	// 		allowedRestricted: true,
	// 		// projection: {
	// 		// 	// songs: true,
	// 		// 	// someNumbers: false
	// 		// },
	// 		limit: 1
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// logBook.log("Find for testing with $in");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			"songs._id": "6371212daf4e9f8fb14444b0"
	// 		},
	// 		allowedRestricted: true,
	// 		// projection: {
	// 		// 	// songs: true,
	// 		// 	// someNumbers: false
	// 		// },
	// 		limit: 1
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// logBook.log("Find for testing with $in with numbers");
	// await moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: {
	// 			someNumbers: { $in: [54, 84] }
	// 		},
	// 		limit: 1,
	// 		useCache: false
	// 	})
	// 	.then(console.log)
	// 	.catch(console.error);

	// moduleManager
	// 	.runJob("data", "find", {
	// 		collection: "abc",
	// 		filter: { _id: new ObjectId(_id) },
	// 		limit: 1
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

type JobArray = [Job, JobArray[]];

function getNestedChildJobs(job: Job): JobArray {
	const jobs = job.getJobQueue().getJobs();

	if (jobs.length > 0)
		return [
			job,
			jobs.map((_job: Job) => getNestedChildJobs(_job))
		] as JobArray;

	return [job, []];
}

function getJobLines(
	level: number,
	[job, jobArrs]: JobArray,
	seperator = "\t"
): string[] {
	const tabs = Array.from({ length: level })
		.map(() => seperator)
		.join("");
	let lines = [
		`${tabs}${job.getName()} (${job.getStatus()} - ${job.getPriority()} - ${job.getUuid()})`
	];
	jobArrs.forEach((jobArr: JobArray) => {
		lines = [...lines, ...getJobLines(level + 1, jobArr, seperator)];
	});

	return lines;
}

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
		case "jobinfo": {
			if (args.length === 0) console.log("Please specify a jobId");
			else {
				const jobId = args[0];
				const job = moduleManager.getJob(jobId, true);

				if (!job) console.log("Job not found");
				else {
					const jobInfo = {
						jobId: job?.getUuid(),
						jobName: job?.getName(),
						jobStatus: job?.getStatus(),
						jobPriority: job?.getPriority(),
						moduleName: job?.getModule().getName(),
						moduleStatus: job?.getModule().getStatus()
					};
					console.table(jobInfo);

					// Gets all child jobs of the current job, including the current job, nested
					const jobArrs = getNestedChildJobs(job);

					const jobLines = getJobLines(0, jobArrs);

					jobLines.forEach(jobLine => {
						console.log(jobLine);
					});
				}
			}
			break;
		}
		case "jobtree": {
			const jobs = moduleManager.getJobs();

			let jobLines: string[] = [];

			jobs.forEach(job => {
				// Gets all child jobs of the current job, including the current job, nested
				const jobArrs = getNestedChildJobs(job);

				jobLines = [...jobLines, ...getJobLines(0, jobArrs)];
			});

			console.log("List of jobs:");
			jobLines.forEach(jobLine => {
				console.log(jobLine);
			});

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
		default: {
			if (!/^\s*$/.test(command))
				console.log(`Command "${command}" not found`);
		}
	}
};

rl.on("line", runCommand);
