import Vue from "vue";
import Vuex from "vuex";
Vue.use(Vuex);

import user from "./modules/user";
import modals from "./modules/modals";
import station from "./modules/station";
import admin from "./modules/admin";

export default new Vuex.Store({
	modules: {
		user,
		modals,
		station,
		admin
	},
	strict: false
});
