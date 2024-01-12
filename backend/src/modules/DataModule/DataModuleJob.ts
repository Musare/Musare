import { HydratedDocument, Model, isObjectIdOrHexString } from "mongoose";
import Job from "@/Job";
import DataModule from "../DataModule";
import { JobOptions } from "@/types/JobOptions";
import { UserModel } from "./models/users/schema";
import { forEachIn } from "@/utils/forEachIn";

export default abstract class DataModuleJob extends Job {
	protected static _modelName: string;

	protected static _hasPermission:
		| boolean
		| CallableFunction
		| (boolean | CallableFunction)[] = false;

	public constructor(payload?: unknown, options?: JobOptions) {
		super(DataModule, payload, options);
	}

	public static override getName() {
		return `${this._modelName}.${super.getName()}`;
	}

	public override getName() {
		return `${
			(this.constructor as typeof DataModuleJob)._modelName
		}.${super.getName()}`;
	}

	public static getModelName() {
		return this._modelName;
	}

	public getModelName() {
		return (this.constructor as typeof DataModuleJob)._modelName;
	}

	public static async hasPermission(
		model: HydratedDocument<Model<any>>,
		user?: UserModel
	) {
		const options = Array.isArray(this._hasPermission)
			? this._hasPermission
			: [this._hasPermission];

		return options.reduce(async (previous, option) => {
			if (await previous) return true;

			if (typeof option === "boolean") return option;

			if (typeof option === "function") return option(model, user);

			return false;
		}, Promise.resolve(false));
	}

	protected override async _authorize() {
		const modelId = this._payload?._id;

		if (isObjectIdOrHexString(modelId)) {
			await this._context.assertPermission(
				`${this.getPath()}.${modelId}`
			);

			return;
		}

		const modelIds = this._payload?.modelIds;

		if (Array.isArray(modelIds)) {
			await forEachIn(modelIds, async _id =>
				this._context.assertPermission(`${this.getPath()}.${_id}`)
			);
		}

		await this._context.assertPermission(this.getPath());
	}
}
