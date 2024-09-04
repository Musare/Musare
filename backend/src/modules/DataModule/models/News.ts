import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional
} from "sequelize";
import { NewsStatus } from "@models/News/NewsStatus";
import EventsModule from "@/modules/EventsModule";
import User from "./User";
import { ObjectIdType } from "@/modules/DataModule";

export class News extends Model<
	InferAttributes<News>,
	InferCreationAttributes<News>
> {
	declare _id: CreationOptional<ObjectIdType>;

	declare title: string;

	declare markdown: string;

	declare status: CreationOptional<NewsStatus>;

	declare showToNewUsers: CreationOptional<boolean>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;
}

export const schema = {
	_id: {
		type: DataTypes.OBJECTID,
		allowNull: false,
		primaryKey: true
	},
	title: {
		type: DataTypes.STRING,
		allowNull: false
	},
	markdown: {
		type: DataTypes.TEXT,
		allowNull: false
	},
	status: {
		type: DataTypes.ENUM(...Object.values(NewsStatus)),
		defaultValue: NewsStatus.DRAFT,
		allowNull: false
	},
	showToNewUsers: {
		type: DataTypes.BOOLEAN,
		defaultValue: false,
		allowNull: false
	},
	createdAt: DataTypes.DATE,
	updatedAt: DataTypes.DATE,

	_name: {
		type: DataTypes.VIRTUAL,
		get() {
			return `news`;
		}
	}
};

export const options = {};

export const setup = async () => {
	News.afterSave(async record => {
		const oldDoc = record.previous();
		const doc = record.get();

		if (oldDoc.status === doc.status) return;

		if (doc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(`data.news.published`);
			await EventsModule.publish(
				new EventClass({
					doc
				})
			);
		} else if (oldDoc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(`data.news.unpublished`);
			await EventsModule.publish(
				new EventClass(
					{
						oldDoc
					},
					oldDoc._id!.toString()
				)
			);
		}
	});

	News.afterDestroy(async record => {
		const oldDoc = record.previous();

		if (oldDoc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(`data.news.unpublished`);
			await EventsModule.publish(
				new EventClass(
					{
						oldDoc
					},
					oldDoc._id!.toString()
				)
			);
		}
	});

	News.addHook("afterFind", (_news, options) => {
		if (!_news) return;

		// TODO improve TS
		let news: Model<
			InferAttributes<
				News,
				{
					omit: never;
				}
			>,
			InferCreationAttributes<
				News,
				{
					omit: never;
				}
			>
		>[] = [];

		if (Array.isArray(_news)) news = _news;
		// @ts-ignore - possibly not needed after TS update
		else news.push(_news);

		news.forEach(news => {
			news.dataValues.createdBy = {
				_id: news.dataValues.createdBy,
				_name: "minifiedUsers"
			};
		});
	});
};

export const setupAssociations = () => {
	News.belongsTo(User, { foreignKey: "createdBy" });
	User.hasMany(News, { foreignKey: "createdBy" });
};

export default News;
