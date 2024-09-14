import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional
} from "sequelize";
import { ObjectIdType } from "@/modules/DataModule";
import { StationType } from "./Station/StationType";
import { StationTheme } from "./Station/StationTheme";
import { StationPrivacy } from "./Station/StationPrivacy";

export class Station extends Model<
	// eslint-disable-next-line no-use-before-define
	InferAttributes<Station>,
	// eslint-disable-next-line no-use-before-define
	InferCreationAttributes<Station>
> {
	declare _id: CreationOptional<ObjectIdType>;

	declare name: string;

	declare type: StationType;

	declare displayName: string;

	declare description: string;

	declare paused: CreationOptional<boolean>;

	// TODO currentSong

	declare currentSongIndex: CreationOptional<number>;

	declare timePaused: CreationOptional<number>;

	declare pausedAt: CreationOptional<Date>;

	declare startedAt: CreationOptional<Date>;

	declare playlist: ObjectIdType;

	declare privacy: CreationOptional<StationPrivacy>;

	// TODO queue

	declare owner: CreationOptional<ObjectIdType>;

	// TODO requests

	// TODO autofill

	declare theme: CreationOptional<StationTheme>;

	// TODO blacklist

	// TODO djs

	declare skipVoteThreshold: CreationOptional<number>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;
}

// TODO validation
export const schema = {
	_id: {
		type: DataTypes.OBJECTID,
		primaryKey: true,
		allowNull: false
	},
	name: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true
	},
	type: {
		type: DataTypes.ENUM(...Object.values(StationType)),
		allowNull: false
	},
	displayName: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true
	},
	description: {
		type: DataTypes.STRING,
		allowNull: false
	},
	paused: {
		type: DataTypes.BOOLEAN,
		defaultValue: false,
		allowNull: false
	},
	// TODO currentSong
	currentSongIndex: {
		type: DataTypes.SMALLINT, // TODO check if max is checked against, and if we need custom validation to not go over the max
		defaultValue: 0,
		allowNull: false
	},
	timePaused: {
		type: DataTypes.INTEGER, // TODO do we need to care about 2038?
		defaultValue: 0,
		allowNull: false
	},
	pausedAt: {
		type: DataTypes.INTEGER,
		defaultValue: 0,
		allowNull: false
	},
	startedAt: {
		type: DataTypes.INTEGER,
		defaultValue: 0,
		allowNull: false
	},
	// playlist: {
	// 	type: DataTypes.OBJECTID,
	// 	allowNull: false
	// },
	privacy: {
		type: DataTypes.ENUM(...Object.values(StationPrivacy)),
		defaultValue: StationPrivacy.PRIVATE,
		allowNull: false
	},
	// TODO queue
	// owner: { // Only used for community stations
	// 	type: DataTypes.OBJECTID
	// }, // TODO add validator to make sure owner is required for community stations, see https://sequelize.org/docs/v6/core-concepts/validations-and-constraints/#model-wide-validations
	// TODO requests
	// TODO autofill
	theme: {
		type: DataTypes.ENUM(...Object.values(StationTheme)),
		defaultValue: StationTheme.BLUE,
		allowNull: false
	},
	// TODO blacklist
	// TODO djs
	skipVoteThreshold: {
		type: DataTypes.SMALLINT,
		defaultValue: 50,
		allowNull: false
	},

	createdAt: DataTypes.DATE,
	updatedAt: DataTypes.DATE,
	_name: {
		type: DataTypes.VIRTUAL,
		get() {
			return `stations`;
		}
	},
	// Temporary
	djs: {
		type: DataTypes.VIRTUAL,
		get() {
			return [];
		}
	}
};

export const options = {};

export const setup = async () => {
	// Station.afterSave(async record => {});

	// Station.afterDestroy(async record => {});

	Station.addHook("afterFind", (station, options) => {
		console.log("AFTER FIND STATION", station, options);
	});
};

export default Station;
