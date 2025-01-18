export type UserPreferences = {
	orderOfPlaylists: string[];
	nightmode: boolean;
	autoSkipDisliked: boolean;
	activityLogPublic: boolean;
	anonymousSongRequests: boolean;
	activityWatch: boolean;
	defaultStationPrivacy: "public" | "unlisted" | "private";
	defaultPlaylistPrivacy: "public" | "private";
};

export type UserModel = {
	preferences: UserPreferences;
};
