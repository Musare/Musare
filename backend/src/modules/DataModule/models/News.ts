import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	ForeignKey,
	NonAttribute,
	BelongsToCreateAssociationMixin,
	BelongsToGetAssociationMixin,
	BelongsToSetAssociationMixin,
	Association
} from "sequelize";
import { NewsStatus } from "@models/News/NewsStatus";
import EventsModule from "@/modules/EventsModule";
import User from "./User";
import { ObjectIdType } from "@/modules/DataModule";

export class News extends Model<
	// eslint-disable-next-line no-use-before-define
	InferAttributes<News>,
	// eslint-disable-next-line no-use-before-define
	InferCreationAttributes<News>
> {
	declare _id: CreationOptional<ObjectIdType>;

	declare title: string;

	declare markdown: string;

	declare status: CreationOptional<NewsStatus>;

	declare showToNewUsers: CreationOptional<boolean>;

	declare createdBy:
		| ForeignKey<User["_id"]>
		| {
				_id: ForeignKey<User["_id"]>;
				_name: "minifiedUsers";
		  };

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;

	declare getCreatedByModel: BelongsToGetAssociationMixin<User>;

	declare setCreatedByModel: BelongsToSetAssociationMixin<User, number>;

	declare createCreatedByModel: BelongsToCreateAssociationMixin<User>;

	declare createdByModel?: NonAttribute<User>;

	declare static associations: {
		// eslint-disable-next-line no-use-before-define
		createdByModel: Association<News, User>;
	};
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
			return "news";
		}
	},

	_associations: {
		type: DataTypes.VIRTUAL,
		get() {
			return {
				createdBy: "minifiedUsers"
			};
		}
	}
};

export const options = {};

export const setup = async () => {
	News.belongsTo(User, {
		as: "createdByModel",
		foreignKey: {
			name: "createdBy",
			type: DataTypes.OBJECTID,
			allowNull: false
		},
		onDelete: "RESTRICT",
		onUpdate: "RESTRICT"
	});

	News.afterSave(async record => {
		const doc = record.get();

		const oldStatus = record.previous("status");
		const newStatus = record.get("status");

		if (oldStatus === newStatus) return;

		if (newStatus === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(`data.news.published`);
			await EventsModule.publish(
				new EventClass({
					doc: record
				})
			);
		} else if (oldStatus === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(`data.news.unpublished`);
			await EventsModule.publish(
				new EventClass(
					{
						oldDoc: {
							_id: doc._id.toString()
						}
					},
					doc._id.toString()
				)
			);
		}
	});

	News.afterDestroy(async record => {
		const doc = record.get();

		if (doc.status === NewsStatus.PUBLISHED) {
			const EventClass = EventsModule.getEvent(`data.news.unpublished`);
			await EventsModule.publish(
				new EventClass(
					{
						oldDoc: {
							_id: doc._id.toString()
						}
					},
					doc._id.toString()
				)
			);
		}
	});
};

export default News;
