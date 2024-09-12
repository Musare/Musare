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

	// eslint-disable-next-line
	// @ts-ignore
	protected _specialQueries = {
		createdBy: (where: { createdBy: WhereOptions<News> }) => {
			const { createdBy } = where;
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

// TODO review createdBy regex/contains/case-sensitive/etc. Maybe only allow searching for username if it's exact
