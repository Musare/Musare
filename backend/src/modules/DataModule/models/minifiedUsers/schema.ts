import { Model, Schema, SchemaOptions, SchemaTypes } from "mongoose";
import { UserSchema } from "../users/schema";
import { UserRole } from "../users/UserRole";
import { UserAvatarType } from "../users/UserAvatarType";
import { UserAvatarColor } from "../users/UserAvatarColor";

export type MinifiedUserSchema = Pick<
	UserSchema,
	| "_id"
	| "name"
	| "username"
	| "location"
	| "bio"
	| "role"
	| "avatar"
	| "createdAt"
	| "updatedAt"
>;

export type MinifiedUserModel = Model<MinifiedUserSchema>;

export const schema = new Schema<MinifiedUserSchema, MinifiedUserModel>(
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
		}
	},
	{
		autoCreate: false,
		autoIndex: false,
		collection: "minifiedUsers",
		patchHistory: { enabled: false }
	}
);

export type UserSchemaType = typeof schema;

export type UserSchemaOptions = SchemaOptions<UserSchema>;
