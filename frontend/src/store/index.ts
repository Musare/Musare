/* eslint-disable import/no-cycle */
import { createStore } from "vuex";

import user from "./modules/user";
import modalVisibility from "./modules/modalVisibility";
import admin from "./modules/admin";

const emptyModule = {
	namespaced: true
};

export default createStore({
	modules: {
		user,
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
		}
	},
	strict: false
});
