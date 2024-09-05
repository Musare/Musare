import * as associationsBase from "sequelize/types/associations/base";
import * as dataTypes from "sequelize/types/data-types";
import { OBJECTID as ObjectIdClass } from "@/modules/DataModule";

declare module "sequelize/types/associations/base" {
	export interface ForeignKeyOptions
		extends associationsBase.ForeignKeyOptions {
		type: dataTypes;
	}
}

declare module "sequelize/types/data-types" {
	export const OBJECTID = ObjectIdClass;
}
