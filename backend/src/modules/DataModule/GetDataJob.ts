import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";
import { FilterType, GetData } from "./plugins/getData";

export default abstract class GetDataJob extends DataModuleJob {
	protected override async _validate() {
		if (typeof this._payload !== "object")
			throw new Error("Payload must be an object");

		if (typeof this._payload.page !== "number")
			throw new Error("Page must be a number");

		if (typeof this._payload.pageSize !== "number")
			throw new Error("Page size must be a number");

		if (!Array.isArray(this._payload.properties))
			throw new Error("Properties must be an array");

		this._payload.properties.forEach(property => {
			if (typeof property !== "string")
				throw new Error("Property must be a string");
		});

		if (
			typeof this._payload.sort !== "object" ||
			Array.isArray(this._payload.sort)
		)
			throw new Error("Sort must be an object");

		Object.values(this._payload.sort).forEach(sort => {
			if (sort !== "ascending" && sort !== "descending")
				throw new Error("Sort must be ascending or descending");
		});

		if (!Array.isArray(this._payload.queries))
			throw new Error("Queries must be an array");

		Object.values(this._payload.queries).forEach(query => {
			if (typeof query !== "object" || Array.isArray(query))
				throw new Error("Query must be an object");

			if (typeof query.filter !== "object" || Array.isArray(query.filter))
				throw new Error("Query filter must be an object");

			if (typeof query.filter?.property !== "string")
				throw new Error("Query filter property must be a string");

			if (
				!Object.values(FilterType).find(
					value => value === query.filterType
				)
			)
				throw new Error("Invalid Query filter type");
		});

		if (
			!["and", "or", "nor"].find(
				value => value === this._payload.operator
			)
		)
			throw new Error("Operator must be one of; and, or, nor");
	}

	protected async _execute(payload: Parameters<GetData["getData"]>[0]) {
		const model = await DataModule.getModel(this.getModelName());

		return model.getData(payload);
	}
}
