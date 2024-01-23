import { Model, Schema, SchemaOptions, SchemaTypes, Types } from "mongoose";
import { GetData } from "@/modules/DataModule/plugins/getData";
import { BaseSchema } from "@/modules/DataModule/types/Schemas";
import { StationType } from "./StationType";
import { StationPrivacy } from "./StationPrivacy";
import { StationTheme } from "./StationTheme";
import { StationRequestsAccess } from "./StationRequestsAccess";
import { StationAutofillMode } from "./StationAutofillMode";
import config from "./config";

export interface StationSchema extends BaseSchema {
	type: StationType;
	name: string;
	displayName: string;
	description: string;
	privacy: StationPrivacy;
	theme: StationTheme;
	owner?: Types.ObjectId;
	djs: Types.ObjectId[];
	currentSong?: Types.ObjectId;
	currentSongIndex?: number;
	startedAt?: NativeDate;
	paused: boolean;
	timePaused: number;
	pausedAt?: NativeDate;
	playlist: Types.ObjectId;
	queue: Types.ObjectId[];
	blacklist: Types.ObjectId[];
	requests?: {
		enabled: boolean;
		access: StationRequestsAccess;
		limit: number;
	};
	autofill?: {
		enabled: boolean;
		playlists: Types.ObjectId[];
		limit: number;
		mode: StationAutofillMode;
	};
}

export interface StationModel extends Model<StationSchema>, GetData {}

export const schema = new Schema<StationSchema, StationModel>(
	{
		type: {
			type: SchemaTypes.String,
			enum: Object.values(StationType),
			required: true
		},
		name: {
			type: SchemaTypes.String,
			unique: true,
			minLength: 2,
			maxLength: 16,
			required: true
		},
		displayName: {
			type: SchemaTypes.String,
			unique: true,
			minLength: 2,
			maxLength: 32,
			required: true
		},
		description: {
			type: SchemaTypes.String,
			minLength: 2,
			maxLength: 128,
			required: true
		},
		privacy: {
			type: SchemaTypes.String,
			default: StationPrivacy.PRIVATE,
			enum: Object.values(StationPrivacy),
			required: true
		},
		theme: {
			type: SchemaTypes.String,
			default: StationTheme.BLUE,
			enum: Object.values(StationTheme),
			required: true
		},
		owner: {
			type: SchemaTypes.ObjectId,
			ref: "minifiedUsers",
			required: false
		},
		djs: [{ type: SchemaTypes.ObjectId, ref: "users" }],
		currentSong: {
			type: SchemaTypes.ObjectId,
			required: false
		},
		currentSongIndex: {
			type: SchemaTypes.Number,
			required: false
		},
		startedAt: {
			type: SchemaTypes.Date,
			required: false
		},
		paused: {
			type: SchemaTypes.Boolean,
			default: false
		},
		timePaused: {
			type: SchemaTypes.Number,
			default: 0
		},
		pausedAt: {
			type: SchemaTypes.Date,
			required: false
		},
		playlist: {
			type: SchemaTypes.ObjectId
		},
		queue: [{ type: SchemaTypes.ObjectId }],
		blacklist: [{ type: SchemaTypes.ObjectId }],
		requests: {
			enabled: {
				type: SchemaTypes.Boolean,
				default: true
			},
			access: {
				type: SchemaTypes.String,
				default: StationRequestsAccess.OWNER,
				enum: Object.values(StationRequestsAccess)
			},
			limit: {
				type: SchemaTypes.Number,
				default: 5,
				min: 1,
				max: 50
			}
		},
		autofill: {
			enabled: {
				type: SchemaTypes.Boolean,
				default: true
			},
			playlists: [{ type: SchemaTypes.ObjectId }],
			limit: {
				type: SchemaTypes.Number,
				default: 30,
				min: 1,
				max: 50
			},
			mode: {
				type: SchemaTypes.String,
				default: StationAutofillMode.RANDOM,
				enum: Object.values(StationAutofillMode)
			}
		}
	},
	config
);

export type StationSchemaType = typeof schema;

export type StationSchemaOptions = SchemaOptions<StationSchema>;
