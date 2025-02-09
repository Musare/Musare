import { defineStore } from "pinia";

export const useUserPreferencesStore = defineStore("userPreferences", {
	state: (): {
		nightmode: boolean;
		autoSkipDisliked: boolean;
		activityLogPublic: boolean;
		anonymousSongRequests: boolean;
		activityWatch: boolean;
		defaultStationPrivacy: "public" | "unlisted" | "private";
		defaultPlaylistPrivacy: "public" | "private";
	} => ({
		nightmode: false,
		autoSkipDisliked: true,
		activityLogPublic: false,
		anonymousSongRequests: false,
		activityWatch: false,
		defaultStationPrivacy: "private",
		defaultPlaylistPrivacy: "public"
	}),
	actions: {
		changeNightmode(nightmode) {
			this.nightmode = nightmode;
			localStorage.setItem("nightmode", `${nightmode}`);
		},
		changeAutoSkipDisliked(autoSkipDisliked) {
			this.autoSkipDisliked = autoSkipDisliked;
		},
		changeActivityLogPublic(activityLogPublic) {
			this.activityLogPublic = activityLogPublic;
		},
		changeAnonymousSongRequests(anonymousSongRequests) {
			this.anonymousSongRequests = anonymousSongRequests;
		},
		changeActivityWatch(activityWatch) {
			this.activityWatch = activityWatch;
		},
		changeDefaultStationPrivacy(defaultStationPrivacy) {
			this.defaultStationPrivacy = defaultStationPrivacy;
		},
		changeDefaultPlaylistPrivacy(defaultPlaylistPrivacy) {
			this.defaultPlaylistPrivacy = defaultPlaylistPrivacy;
		}
	}
});
