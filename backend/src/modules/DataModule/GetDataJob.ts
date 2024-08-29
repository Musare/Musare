import Joi from "joi";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";
import { FindOptions, WhereOptions, Op } from "sequelize";

export enum FilterType {
	REGEX = "regex",
	CONTAINS = "contains",
	EXACT = "exact",
	DATETIME_BEFORE = "datetimeBefore",
	DATETIME_AFTER = "datetimeAfter",
	NUMBER_LESSER_EQUAL = "numberLesserEqual",
	NUMBER_LESSER = "numberLesser",
	NUMBER_GREATER = "numberGreater",
	NUMBER_GREATER_EQUAL = "numberGreaterEqual",
	NUMBER_EQUAL = "numberEquals",
	BOOLEAN = "boolean",
	SPECIAL = "special"
}

export default abstract class GetDataJob extends DataModuleJob {
	protected static _payloadSchema = Joi.object({
		page: Joi.number().required(),
		pageSize: Joi.number().required(),
		properties: Joi.array()
			.items(Joi.string().required())
			.min(1)
			.required(),
		sort: Joi.object()
			.pattern(
				/^/,
				Joi.string().valid("ascending", "descending").required()
			)
			.required(),
		queries: Joi.array()
			.items(
				Joi.object({
					filter: Joi.object({
						property: Joi.string().required()
					}).required(),
					filterType: Joi.string()
						.valid(...Object.values(FilterType))
						.required()
				})
			)
			.required(),
		operator: Joi.string().valid("and", "or", "nor").required()
	});

	protected _blacklistedProperties?: string[];

	protected _specialFilters?: Record<string, (query: FindOptions, data: any) => FindOptions>;

	protected _specialProperties?: Record<string, (query: FindOptions) => FindOptions>;

	protected _specialQueries?: Record<string, (query: WhereOptions) => WhereOptions>;

	protected async _execute() {
		const { page, pageSize, properties, sort, queries, operator } = this._payload;

		let findQuery: FindOptions = {};

		// If a query filter property or sort property is blacklisted, throw error
		if (this._blacklistedProperties?.length ?? 0 > 0) {
			if (
				queries.some(query =>
					this._blacklistedProperties!.some(blacklistedProperty =>
						blacklistedProperty.startsWith(
							query.filter.property
						)
					)
				)
			)
				throw new Error(
					"Unable to filter by blacklisted property."
				);
			if (
				Object.keys(sort).some(property =>
					this._blacklistedProperties!.some(blacklistedProperty =>
						blacklistedProperty.startsWith(property)
					)
				)
			)
				throw new Error("Unable to sort by blacklisted property.");
		}

		// If a filter or property exists for a special property, add some custom pipeline steps
		if (this._specialProperties)
			Object.entries(this._specialProperties).forEach(
				([specialProperty, modifyQuery]) => {
					// Check if a filter with the special property exists
					const filterExists =
						queries
							.map(query => query.filter.property)
							.indexOf(specialProperty) !== -1;

					// Check if a property with the special property exists
					const propertyExists =
						properties.indexOf(specialProperty) !== -1;

					// If no such filter or property exists, skip this function
					if (!filterExists && !propertyExists) return;

					// Add the specified pipeline steps into the pipeline
					findQuery = modifyQuery(findQuery);
				}
			);

		// Adds where stage to query, which is responsible for filtering
		const filterQueries = queries.flatMap(query => {
			const { data, filter, filterType } = query;
			const { property } = filter;

			const newQuery: any = {};
			switch (filterType) {
				case FilterType.REGEX:
					newQuery[property] = new RegExp(
						`${data.slice(1, data.length - 1)}`,
						"i"
					);
					break;
				case FilterType.CONTAINS:
					newQuery[property] = new RegExp(
						`${data.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
						"i"
					);
					break;
				case FilterType.EXACT:
					newQuery[property] = data.toString();
					break;
				case FilterType.DATETIME_BEFORE:
					newQuery[property] = { [Op.lte]: new Date(data) };
					break;
				case FilterType.DATETIME_AFTER:
					newQuery[property] = { [Op.gte]: new Date(data) };
					break;
				case FilterType.NUMBER_LESSER_EQUAL:
					newQuery[property] = { [Op.lte]: Number(data) };
					break;
				case FilterType.NUMBER_LESSER:
					newQuery[property] = { [Op.lt]: Number(data) };
					break;
				case FilterType.NUMBER_GREATER:
					newQuery[property] = { [Op.gt]: Number(data) };
					break;
				case FilterType.NUMBER_GREATER_EQUAL:
					newQuery[property] = { [Op.gte]: Number(data) };
					break;
				case FilterType.NUMBER_EQUAL:
					newQuery[property] = { [Op.eq]: Number(data) };
					break;
				case FilterType.BOOLEAN:
					newQuery[property] = { [Op.eq]: !!data };
					break;
				case FilterType.SPECIAL:
					if (
						typeof this._specialFilters?.[filter.property] ===
							"function"
					) {
						findQuery = this._specialFilters[filter.property](findQuery, data);
						newQuery[property] = { [Op.eq]: true };
					}
					break;
				default:
					throw new Error(`Invalid filter type for "${filter}"`);
			}

			if (
				typeof this._specialQueries?.[filter.property] === "function"
			) {
				return this._specialQueries[filter.property](newQuery);
			}

			return newQuery;
		});

		if (filterQueries.length > 0)
			findQuery.where = {
				[Op[operator]]: filterQueries
			};

		// Adds order stage to query if there is at least one column being sorted, responsible for sorting data
		if (Object.keys(sort).length > 0)
			findQuery.order = Object.entries(sort).map(([property, direction]) => [
				property,
				direction === "ascending" ? "ASC" : "DESC"
			]);

		findQuery.attributes = {
			include: properties,
			exclude: this._blacklistedProperties
		};
		findQuery.offset = pageSize * (page - 1);
		findQuery.limit = pageSize;

		// Executes the query
		const { rows, count } = (await this.getModel().findAndCountAll(findQuery));

		const data = rows.map(model => model.toJSON()); // TODO: Review generally

		return { data, count };
	}
}
