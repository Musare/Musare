/* eslint-disable import/no-cycle */
import { createStore } from "vuex";

import websockets from "./modules/websockets";

import user from "./modules/user";
import modalVisibility from "./modules/modalVisibility";
import station from "./modules/station";
import admin from "./modules/admin";
import longJobs from "./modules/longJobs";

const emptyModule = {
	namespaced: true
};

export default createStore({
	modules: {
		websockets,
		user,
		station,
		admin,
		modalVisibility,
		modals: {
			namespaced: true,
			modules: {
				editSong: emptyModule,
				editSongs: emptyModule,
				importAlbum: emptyModule,
				editPlaylist: emptyModule,
				manageStation: emptyModule,
				whatIsNew: emptyModule,
				createStation: emptyModule,
				editNews: emptyModule,
				viewApiRequest: emptyModule,
				viewPunishment: emptyModule,
				report: emptyModule,
				viewReport: emptyModule,
				confirm: emptyModule,
				bulkActions: emptyModule,
				viewYoutubeVideo: emptyModule,
				removeAccount: emptyModule
			}
		},
		longJobs
	},
	strict: false
});
