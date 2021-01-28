import Vue from "vue";
import Vuex from "vuex";

import user from "./modules/user";
import settings from "./modules/settings";
import modals from "./modules/modals";
import station from "./modules/station";
import admin from "./modules/admin";
import editSongModal from "./modules/editSongModal";
import editStationModal from "./modules/editStationModal";
import editUserModal from "./modules/editUserModal";
import editNewsModal from "./modules/editNewsModal";
import viewPunishmentModal from "./modules/viewPunishmentModal";

Vue.use(Vuex);

export default new Vuex.Store({
	modules: {
		user,
		settings,
		modals,
		station,
		admin,
		editSongModal,
		editStationModal,
		editUserModal,
		editNewsModal,
		viewPunishmentModal
	},
	strict: false
});
