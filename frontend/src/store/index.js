/* eslint-disable import/no-cycle */
import Vue from "vue";
import Vuex from "vuex";

import websockets from "./modules/websockets";

import user from "./modules/user";
import settings from "./modules/settings";
import modalVisibility from "./modules/modalVisibility";
import station from "./modules/station";
import admin from "./modules/admin";

import editSongModal from "./modules/modals/editSong";
import manageStationModal from "./modules/modals/manageStation";
import editUserModal from "./modules/modals/editUser";
import editNewsModal from "./modules/modals/editNews";
import viewPunishmentModal from "./modules/modals/viewPunishment";
import viewReportModal from "./modules/modals/viewReport";
import reportModal from "./modules/modals/report";

Vue.use(Vuex);

export default new Vuex.Store({
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
				manageStation: manageStationModal,
				editUser: editUserModal,
				editNews: editNewsModal,
				viewPunishment: viewPunishmentModal,
				viewReport: viewReportModal,
				report: reportModal
			}
		}
	},
	strict: false
});
