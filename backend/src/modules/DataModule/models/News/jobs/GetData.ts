import News from "@models/News";
import { FindOptions, WhereOptions, Op } from "sequelize";
import GetDataJob from "@/modules/DataModule/GetDataJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class GetData extends GetDataJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;

	protected _specialProperties?: Record<
		string,
		(query: FindOptions<News>) => FindOptions<News>
	> = {
		createdBy: query => query
	};

	protected _specialQueries?: Record<
		string,
		(where: WhereOptions<News>) => {
			query: WhereOptions<News>;
			includeProperties: string[];
		}
	> = {
		createdBy: where => {
			const createdBy =
				where.createdBy instanceof RegExp
					? where.createdBy.source
					: where.createdBy;
			// See https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/#complex-where-clauses-at-the-top-level for more info
			return {
				query: {
					[Op.or]: [
						{ createdBy },
						{ "$createdByModel.username$": createdBy }
					]
				},
				includeProperties: ["createdByModel"]
			};
		}
	};
}

// TODO createdBy should not allow contains/RegExp? Maybe. Or only allow searching for username if it's exact
