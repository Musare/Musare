/* eslint-disable import/no-cycle */
import { createStore } from "vuex";

import modalVisibility from "./modules/modalVisibility";

export default createStore({
	modules: {
		modalVisibility,
		modals: {
			namespaced: true,
			modules: {}
		}
	},
	strict: false
});
