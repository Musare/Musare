import { SessionSchema } from "@models/sessions/schema";
import { getErrorMessage } from "@common/utils/getErrorMessage";
import { generateUuid } from "@common/utils/generateUuid";
import { HydratedDocument } from "mongoose";
import Joi from "joi";
import JobContext from "@/JobContext";
import JobStatistics, { JobStatisticsType } from "@/JobStatistics";
import LogBook, { Log } from "@/LogBook";
import BaseModule from "./BaseModule";
import EventsModule from "./modules/EventsModule";
import JobCompletedEvent from "./modules/EventsModule/events/JobCompletedEvent";
import { UserSchema } from "./modules/DataModule/models/users/schema";

export enum JobStatus {
	QUEUED = "QUEUED",
	ACTIVE = "ACTIVE",
	PAUSED = "PAUSED",
	COMPLETED = "COMPLETED"
}

export type JobOptions = {
	priority?: number;
	longJob?: string;
	session?: SessionSchema;
	socketId?: string;
	callbackRef?: string;
};

export default abstract class Job {
	protected static _apiEnabled = true;

	protected _module: InstanceType<typeof BaseModule>;

	protected _payload: any;

	protected _context: JobContext;

	protected _priority: number;

	protected _longJob?: {
		title: string;
		progress?: {
			data: unknown;
			time: Date;
			timeout?: NodeJS.Timeout;
		};
	};

	protected _uuid: string;

	protected _status: JobStatus;

	protected _createdAt: number;

	protected _startedAt?: number;

	protected _completedAt?: number;

	/**
	 * Job
	 *
	 * @param name - Job name
	 * @param module - Job module
	 * @param callback - Job callback
	 * @param options - Job options
	 */
	public constructor(
		module: InstanceType<typeof BaseModule>,
		payload: unknown,
		options?: JobOptions
	) {
		this._createdAt = performance.now();
		this._module = module;
		this._payload = payload;
		this._priority = 1;
		this._status = JobStatus.QUEUED;
		/* eslint-disable no-bitwise, eqeqeq */
		this._uuid = generateUuid();

		let contextOptions;

		if (options) {
			const { priority, longJob, session, socketId, callbackRef } =
				options;

			if (session || socketId)
				contextOptions = { session, socketId, callbackRef };

			if (priority) this._priority = priority;

			if (longJob)
				this._longJob = {
					title: longJob
				};
		}

		this._context = new JobContext(this, contextOptions);

		JobStatistics.updateStats(
			this.getPath(),
			JobStatisticsType.CONSTRUCTED
		);
	}

	/**
	 * getName - Get job name
	 */
	public static getName() {
		return this.name.substring(0, 1).toLowerCase() + this.name.substring(1);
	}

	/**
	 * getName - Get job name
	 */
	public getName() {
		return (
			this.constructor.name.substring(0, 1).toLowerCase() +
			this.constructor.name.substring(1)
		);
	}

	/**
	 * getPath - Get module and job name in a dot format, e.g. module.jobName
	 */
	public getPath() {
		return `${this._module.getName()}.${this.getName()}`;
	}

	/**
	 * getPriority - Get job priority
	 *
	 * @returns priority
	 */
	public getPriority() {
		return this._priority;
	}

	/**
	 * getUuid - Get job UUID
	 *
	 * @returns UUID
	 */
	public getUuid() {
		return this._uuid;
	}

	/**
	 * getStatus - Get job status
	 *
	 * @returns status
	 */
	public getStatus() {
		return this._status;
	}

	/**
	 * setStatus - Set job status
	 *
	 * @param status - Job status
	 */
	protected _setStatus(status: JobStatus) {
		this._status = status;
	}

	/**
	 * getModule - Get module
	 *
	 * @returns module
	 */
	public getModule() {
		return this._module;
	}

	public static isApiEnabled() {
		return this._apiEnabled;
	}

	public isApiEnabled() {
		return (this.constructor as typeof Job)._apiEnabled;
	}

	public getPayloadSchema() {
		return (this.constructor as typeof Job)._payloadSchema;
	}

	protected static _hasPermission:
		| boolean
		| CallableFunction
		| (boolean | CallableFunction)[] = false;

	// Check if a given user has generic permission to execute a job, using _hasPermission
	public static async hasPermission(
		user: HydratedDocument<UserSchema> | null
	) {
		const options = Array.isArray(this._hasPermission)
			? this._hasPermission
			: [this._hasPermission];

		return options.reduce(async (previous, option) => {
			if (await previous) return true;

			if (typeof option === "boolean") return option;

			if (typeof option === "function") return option(user);

			return false;
		}, Promise.resolve(false));
	}

	// If a job expects a payload, it must override this
	protected static _payloadSchema: Joi.ObjectSchema<any> | null = null;

	// Whether this _validate has been called. May not be modified by classes that extend Job
	protected _validated = false;

	// If a class that extends Job overrides _validate, it must still call super._validate, so this always gets called
	protected async _validate() {
		const payloadSchema = this.getPayloadSchema();

		if (this._payload === undefined && !payloadSchema)
			this._validated = true;
		else if (!payloadSchema) {
			throw new Error(
				"Payload provided, but no payload schema specified."
			);
		} else {
			await payloadSchema.validateAsync(this._payload, {
				presence: "required"
			});
		}

		this._validated = true;
	}

	protected async _authorize() {
		await this._context.assertPermission(this.getPath());
	}

	protected abstract _execute(): Promise<unknown>;

	/**
	 * execute - Execute job
	 *
	 * @returns Promise
	 */
	public async execute() {
		if (this._startedAt) throw new Error("Job has already been executed.");

		if (!this.getModule().canRunJobs())
			throw new Error("Module can not currently run jobs.");

		this._setStatus(JobStatus.ACTIVE);
		this._startedAt = performance.now();

		try {
			await this._validate();

			// Safety check, to make sure this class' _validate function was called
			if (!this._validated) {
				throw new Error(
					"Validate function was fine, but validated was false. Warning. Make sure to call super when you override _validate."
				);
			}

			await this._authorize();

			const data = await this._execute();

			const socketId = this._context.getSocketId();
			const callbackRef = this._context.getCallbackRef();

			if (callbackRef) {
				await EventsModule.publish(
					new JobCompletedEvent(
						{
							socketId,
							callbackRef,
							status: "success",
							data
						},
						this.getUuid()
					)
				);
			}

			this.log({
				message: "Job completed successfully",
				type: "success"
			});

			JobStatistics.updateStats(
				this.getPath(),
				JobStatisticsType.SUCCESSFUL
			);

			return data;
		} catch (error: unknown) {
			const message = getErrorMessage(error);

			const socketId = this._context.getSocketId();
			const callbackRef = this._context.getCallbackRef();

			if (callbackRef) {
				await EventsModule.publish(
					new JobCompletedEvent(
						{
							socketId,
							callbackRef,
							status: "error",
							message
						},
						this.getUuid()
					)
				);
			}

			this.log({
				message: `Job failed with error "${message}"`,
				type: "error",
				data: { error }
			});

			JobStatistics.updateStats(this.getPath(), JobStatisticsType.FAILED);

			throw error;
		} finally {
			this._completedAt = performance.now();
			JobStatistics.updateStats(this.getPath(), JobStatisticsType.TOTAL);
			if (this._startedAt)
				JobStatistics.updateStats(
					this.getPath(),
					JobStatisticsType.DURATION,
					this._completedAt - this._startedAt
				);
			this._setStatus(JobStatus.COMPLETED);
		}
	}

	/**
	 * Log a message in the context of the current job, which automatically sets the category and data
	 *
	 * @param log - Log message or object
	 */
	public log(log: string | Omit<Log, "timestamp" | "category">) {
		const {
			message,
			type = undefined,
			data = {}
		} = {
			...(typeof log === "string" ? { message: log } : log)
		};
		LogBook.log({
			message,
			type,
			category: this.getPath(),
			data: {
				...this.toJSON(),
				...data
			}
		});
	}

	/**
	 * Serialize job info
	 *
	 * @returns json
	 */
	public toJSON() {
		return {
			uuid: this.getUuid(),
			priority: this.getPriority(),
			name: this.getPath(),
			status: this.getStatus(),
			moduleStatus: this._module.getStatus(),
			createdAt: this._createdAt,
			startedAt: this._startedAt,
			completedAt: this._completedAt,
			payload: JSON.stringify(this._payload)
		};
	}
}
