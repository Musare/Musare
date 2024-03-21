import { PipelineStage, Schema, SchemaTypes } from "mongoose";

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

export interface GetData {
	getData(payload: {
		page: number;
		pageSize: number;
		properties: string[];
		sort: Record<string, "ascending" | "descending">;
		queries: {
			data: any;
			filter: {
				property: string;
			};
			filterType: FilterType;
		}[];
		operator: "and" | "or" | "nor";
	}): Promise<{
		data: any[];
		count: number;
	}>;
}

export default function getDataPlugin(schema: Schema) {
	schema.static(
		"getData",
		async function getData(
			payload: Parameters<GetData["getData"]>[0]
		): ReturnType<GetData["getData"]> {
			const { page, pageSize, properties, sort, queries, operator } =
				payload;

			const getData = schema.get("getData");
			if (!getData)
				throw new Error("Schema doesn't have getData defined.");
			const {
				blacklistedProperties,
				specialFilters,
				specialProperties,
				specialQueries
			} = getData;

			const pipeline: PipelineStage[] = [];

			// If a query filter property or sort property is blacklisted, throw error
			if (Array.isArray(blacklistedProperties)) {
				if (
					queries.some(query =>
						blacklistedProperties.some(blacklistedProperty =>
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
						blacklistedProperties.some(blacklistedProperty =>
							blacklistedProperty.startsWith(property)
						)
					)
				)
					throw new Error("Unable to sort by blacklisted property.");
			}

			// If a filter or property exists for a special property, add some custom pipeline steps
			if (typeof specialProperties === "object")
				Object.entries(specialProperties).forEach(
					([specialProperty, pipelineSteps]) => {
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
						pipeline.push(...pipelineSteps);
					}
				);

			// Adds the match stage to aggregation pipeline, which is responsible for filtering
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
						newQuery[property] = { $lte: new Date(data) };
						break;
					case FilterType.DATETIME_AFTER:
						newQuery[property] = { $gte: new Date(data) };
						break;
					case FilterType.NUMBER_LESSER_EQUAL:
						newQuery[property] = { $lte: Number(data) };
						break;
					case FilterType.NUMBER_LESSER:
						newQuery[property] = { $lt: Number(data) };
						break;
					case FilterType.NUMBER_GREATER:
						newQuery[property] = { $gt: Number(data) };
						break;
					case FilterType.NUMBER_GREATER_EQUAL:
						newQuery[property] = { $gte: Number(data) };
						break;
					case FilterType.NUMBER_EQUAL:
						newQuery[property] = { $eq: Number(data) };
						break;
					case FilterType.BOOLEAN:
						newQuery[property] = { $eq: !!data };
						break;
					case FilterType.SPECIAL:
						if (
							typeof specialFilters === "object" &&
							typeof specialFilters[filter.property] ===
								"function"
						) {
							pipeline.push(
								...specialFilters[filter.property](data)
							);
							newQuery[property] = { $eq: true };
						}
						break;
					default:
						throw new Error(`Invalid filter type for "${filter}"`);
				}

				if (
					typeof specialQueries === "object" &&
					typeof specialQueries[filter.property] === "function"
				) {
					return specialQueries[filter.property](newQuery);
				}

				return newQuery;
			});

			const filterQuery: any = {};

			if (filterQueries.length > 0)
				filterQuery[`$${operator}`] = filterQueries;

			pipeline.push({ $match: filterQuery });

			// Adds sort stage to aggregation pipeline if there is at least one column being sorted, responsible for sorting data
			if (Object.keys(sort).length > 0)
				pipeline.push({
					$sort: Object.fromEntries(
						Object.entries(sort).map(([property, direction]) => [
							property,
							direction === "ascending" ? 1 : -1
						])
					)
				});

			// Adds first project stage to aggregation pipeline, responsible for including only the requested properties
			pipeline.push({
				$project: Object.fromEntries(
					properties.map(property => [property, 1])
				)
			});

			// Adds second project stage to aggregation pipeline, responsible for excluding some specific properties
			if (
				Array.isArray(blacklistedProperties) &&
				blacklistedProperties.length > 0
			)
				pipeline.push({
					$project: Object.fromEntries(
						blacklistedProperties.map(property => [property, 0])
					)
				});

			// Adds the facet stage to aggregation pipeline, responsible for returning a total document count, skipping and limitting the documents that will be returned
			pipeline.push({
				$facet: {
					count: [{ $count: "count" }],
					documents: [
						{ $skip: pageSize * (page - 1) },
						{ $limit: pageSize }
					]
				}
			});

			// Executes the aggregation pipeline
			const [result] = await this.aggregate(pipeline).exec();

			if (result.count.length === 0) return { data: [], count: 0 };

			properties.forEach(property => {
				const type = schema.path(property);
				if (type instanceof SchemaTypes.ObjectId) {
					const { ref } = type?.options ?? {};
					if (ref) {
						result.documents = result.documents.map(
							(document: any) => ({
								...document,
								[property]: {
									_name: ref,
									_id: document[property]
								}
							})
						);
					}
				} else if (
					type instanceof SchemaTypes.Array &&
					type.caster instanceof SchemaTypes.ObjectId
				) {
					console.log("Array relation not implemented", property);
				}
			});

			result.documents = result.documents.map((document: any) => ({
				...document,
				// TODO properly support getModelName in TypeScript
				// eslint-disable-next-line
				// @ts-ignore
				_name: schema.statics.getModelName()
			}));

			const { documents: data } = result;
			const { count } = result.count[0];

			return { data, count };
		}
	);
}
