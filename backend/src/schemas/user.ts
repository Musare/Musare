import { Model, Schema, SchemaTypes, Types } from "mongoose";
import { BaseSchema } from "../types/Schemas";

export enum UserRole {
	ADMIN = "admin",
	MODERATOR = "moderator",
	USER = "user"
}

export enum UserAvatarType {
	GRAVATAR = "gravatar",
	INITIALS = "initials"
}

export enum UserAvatarColor {
	BLUE = "blue",
	GREEN = "green",
	ORANGE = "orange",
	PURPLE = "purple",
	RED = "red",
	TEAL = "teal"
}

export interface UserSchema extends BaseSchema {
	username: string;
	role: UserRole;
	email: {
		address: string;
		verified: boolean;
		verificationToken?: string;
	};
	avatar: {
		type: UserAvatarType;
		url?: string;
		color?: UserAvatarColor;
	};
	services: {
		password?: {
			password: string;
			reset: {
				code: string;
				expires: number;
			};
			set: {
				code: string;
				expires: number;
			};
		};
		github?: {
			id: number;
			access_token: string;
		};
	};
	statistics: {
		songsRequested: number;
	};
	likedSongsPlaylist: Types.ObjectId;
	dislikedSongsPlaylist: Types.ObjectId;
	favoriteStations: Types.ObjectId[];
	name: string;
	location?: string;
	bio?: string;
	preferences: {
		orderOfPlaylists: Types.ObjectId[];
		nightmode: boolean;
		autoSkipDisliked: boolean;
		activityLogPublic: boolean;
		anonymousSongRequests: boolean;
		activityWatch: boolean;
	};
}

export type UserModel = Model<UserSchema>;

export const schema = new Schema<UserSchema, UserModel>(
	{
		username: {
			type: SchemaTypes.String,
			required: true
		},
		role: {
			type: SchemaTypes.String,
			enum: Object.values(UserRole),
			required: true
		},
		email: {
			address: {
				type: SchemaTypes.String,
				required: true
			},
			verified: {
				type: SchemaTypes.Boolean,
				default: false,
				required: true
			},
			verificationToken: {
				type: SchemaTypes.String,
				required: false
			}
		},
		avatar: {
			type: {
				type: SchemaTypes.String,
				enum: Object.values(UserAvatarType),
				required: true
			},
			url: {
				type: SchemaTypes.String,
				required: false
			},
			color: {
				type: SchemaTypes.String,
				enum: Object.values(UserAvatarColor),
				required: false
			}
		},
		services: {
			password: {
				password: SchemaTypes.String,
				reset: {
					code: {
						type: SchemaTypes.String,
						minLength: 8,
						maxLength: 8
					},
					expires: { type: SchemaTypes.Date }
				},
				set: {
					code: {
						type: SchemaTypes.String,
						minLength: 8,
						maxLength: 8
					},
					expires: { type: SchemaTypes.Date }
				}
			},
			github: {
				id: SchemaTypes.Number,
				access_token: SchemaTypes.String
			}
		},
		statistics: {
			songsRequested: {
				type: SchemaTypes.Number,
				default: 0,
				required: true
			}
		},
		likedSongsPlaylist: {
			type: SchemaTypes.ObjectId,
			required: true
		},
		dislikedSongsPlaylist: {
			type: SchemaTypes.ObjectId,
			required: true
		},
		favoriteStations: [SchemaTypes.ObjectId],
		name: {
			type: SchemaTypes.String,
			required: true
		},
		location: {
			type: SchemaTypes.String,
			required: false
		},
		bio: {
			type: SchemaTypes.String,
			required: false
		},
		preferences: {
			orderOfPlaylists: [SchemaTypes.ObjectId],
			nightmode: {
				type: SchemaTypes.Boolean,
				default: false,
				required: true
			},
			autoSkipDisliked: {
				type: SchemaTypes.Boolean,
				default: true,
				required: true
			},
			activityLogPublic: {
				type: SchemaTypes.Boolean,
				default: false,
				required: true
			},
			anonymousSongRequests: {
				type: SchemaTypes.Boolean,
				default: false,
				required: true
			},
			activityWatch: {
				type: SchemaTypes.Boolean,
				default: false,
				required: true
			}
		}
	},
	{ documentVersion: 4 }
);

export type UserSchemaType = typeof schema;
