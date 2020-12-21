import Vue from "vue";
import Vuex from "vuex";

import user from "./modules/user";
import settings from "./modules/settings";
import modals from "./modules/modals";
import sidebars from "./modules/sidebars";
import station from "./modules/station";
import admin from "./modules/admin";

Vue.use(Vuex);

export default new Vuex.Store({
	modules: {
		user,
		settings,
		modals,
		sidebars,
		station,
		admin
	},
	strict: false
});
