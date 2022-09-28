import { UserPreferences } from "../models/User";
import { GenericResponse } from "./GenericActions";

export type GetPreferencesResponse = GenericResponse & {
	data: { preferences: UserPreferences };
};
