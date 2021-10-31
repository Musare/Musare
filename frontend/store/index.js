import Vue from "vue";
import Vuex from "vuex";

import user from "./modules/user";
import modals from "./modules/modals";
import station from "./modules/station";
import admin from "./modules/admin";

Vue.use(Vuex);

export default new Vuex.Store({
	modules: {
		user,
		modals,
		station,
		admin
	},
	strict: false
});
