export type UserPreferences = {
	orderOfPlaylists: string[];
	nightmode: boolean;
	autoSkipDisliked: boolean;
	activityLogPublic: boolean;
	anonymousSongRequests: boolean;
	activityWatch: boolean;
};

export type UserModel = {
	preferences: UserPreferences;
};
