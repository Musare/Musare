import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useUserPreferencesStore = defineStore("userPreferences", {
	state: () => ({
		nightmode: false,
		autoSkipDisliked: true,
		activityLogPublic: false,
		anonymousSongRequests: false,
		activityWatch: false
	}),
	actions: {
		changeNightmode(nightmode) {
			this.nightmode = nightmode;
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
		}
	}
});
