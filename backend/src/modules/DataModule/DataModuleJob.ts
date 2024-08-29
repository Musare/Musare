import { isValidObjectId } from "mongoose";
import { Model, ModelStatic } from "sequelize";
import Job, { JobOptions } from "@/Job";
import DataModule from "../DataModule";

export default abstract class DataModuleJob extends Job {
	protected static _model: ModelStatic<any>;

	protected static _isBulk = false;

	protected static _hasModelPermission:
		| boolean
		| CallableFunction
		| (boolean | CallableFunction)[] = false;

	public constructor(payload?: unknown, options?: JobOptions) {
		super(DataModule, payload, options);
	}

	public static override getName() {
		return `${this.getModel().getTableName()}.${super.getName()}`;
	}

	public static getModel() {
		return this._model;
	}

	public getModel() {
		return (this.constructor as typeof DataModuleJob).getModel();
	}

	public static isBulk() {
		return this._isBulk;
	}

	public isBulk() {
		return (this.constructor as typeof DataModuleJob).isBulk();
	}

	public static async hasModelPermission(
		model: Model | null,
		user: Model | null
	) {
		const options = Array.isArray(this._hasModelPermission)
			? this._hasModelPermission
			: [this._hasModelPermission];

		return options.reduce(async (previous, option) => {
			if (await previous) return true;

			if (typeof option === "boolean") return option;

			if (typeof option === "function") return option(model, user);

			return false;
		}, Promise.resolve(false));
	}

	protected override async _authorize() {
		const modelIds = this._payload?.modelIds ?? this._payload?._ids;

		// If this job is a bulk job, and all model ids are valid object ids
		if (this.isBulk()) {
			if (modelIds.some((modelId: unknown) => !isValidObjectId(modelId)))
				throw new Error(
					`One or more model id is invalid: ${modelIds
						.filter((modelId: unknown) => !isValidObjectId(modelId))
						.join(", ")}`
				);

			const permissions = modelIds.map(
				(modelId: string) => `${this.getPath()}:${modelId}`
			);
			await this._context.assertPermissions(permissions);

			return;
		}

		const modelId = this._payload?.modelId ?? this._payload?._id;

		// If this job is not a bulk job, and the model id is a valid object id
		if (!this.isBulk() && modelId) {
			if (!isValidObjectId(modelId))
				throw new Error(`Model id is invalid: ${modelId}`);
			await this._context.assertPermission(
				`${this.getPath()}:${modelId}`
			);

			return;
		}

		await this._context.assertPermission(this.getPath());
	}
}
