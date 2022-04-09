/* eslint-disable import/no-cycle */
import { createStore } from "vuex";

import websockets from "./modules/websockets";

import user from "./modules/user";
import settings from "./modules/settings";
import modalVisibility from "./modules/modalVisibility";
import station from "./modules/station";
import admin from "./modules/admin";

import editSongModal from "./modules/modals/editSong";
import editSongsModal from "./modules/modals/editSongs";
import importAlbumModal from "./modules/modals/importAlbum";
import viewPunishmentModal from "./modules/modals/viewPunishment";
import confirmModal from "./modules/modals/confirm";

const emptyModule = {
	namespaced: true
};

export default createStore({
	modules: {
		websockets,
		user,
		settings,
		station,
		admin,
		modalVisibility,
		modals: {
			namespaced: true,
			modules: {
				editSong: editSongModal,
				editSongs: editSongsModal,
				importAlbum: importAlbumModal,
				importPlaylist: emptyModule,
				editPlaylist: emptyModule,
				manageStation: emptyModule,
				editUser: emptyModule,
				whatIsNew: emptyModule,
				createStation: emptyModule,
				editNews: emptyModule,
				viewPunishment: viewPunishmentModal,
				report: emptyModule,
				viewReport: emptyModule,
				confirm: confirmModal
			}
		}
	},
	strict: false
});
