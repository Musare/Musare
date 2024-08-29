import {
	Sequelize,
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
} from "sequelize";
import { NewsStatus } from "@models/News/NewsStatus";
import EventsModule from "@/modules/EventsModule";

export class News extends Model<
	InferAttributes<News>,
	InferCreationAttributes<News>
> {
	declare id: CreationOptional<number>;

	declare title: string;

	declare markdown: string;

	declare status: CreationOptional<NewsStatus>;

	declare showToNewUsers: CreationOptional<boolean>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;
}

export const schema = {
	id: {
		type: DataTypes.BIGINT,
		autoIncrement: true,
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
	createdBy: {
		type: DataTypes.BIGINT,
		allowNull: false
	},
	createdAt: DataTypes.DATE,
	updatedAt: DataTypes.DATE
};

export const options = {};

export const setup = async () => {
	News.afterSave(async record => {
		const oldDoc = record.previous();
		const doc = record.get();
	
		if (oldDoc.status === doc.status) return;
	
		if (doc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(
				`data.news.published`
			);
			await EventsModule.publish(new EventClass({
				doc
			}));
		} else if (oldDoc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(
				`data.news.unpublished`
			);
			await EventsModule.publish(new EventClass({
				oldDoc
			}, oldDoc.id!.toString()));
		}
	});
	
	News.afterDestroy(async record => {
		const oldDoc = record.previous();
	
		if (oldDoc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(
				`data.news.unpublished`
			);
			await EventsModule.publish(new EventClass({
				oldDoc
			}, oldDoc.id!.toString()));
		}
	});
};

export default News;
