import { UserPreferences } from "../models/User";
import { BaseResponse } from "./BaseActions";

export type UpdatePreferencesResponse = BaseResponse;
export type GetPreferencesResponse = BaseResponse & {
	data: { preferences: UserPreferences };
};
