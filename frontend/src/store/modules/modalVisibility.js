/* eslint no-param-reassign: 0 */
import ws from "@/ws";

import editUser from "./modals/editUser";
import whatIsNew from "./modals/whatIsNew";
import createStation from "./modals/createStation";
import editNews from "./modals/editNews";
import manageStation from "./modals/manageStation";
import importPlaylist from "./modals/importPlaylist";
import editPlaylist from "./modals/editPlaylist";
import report from "./modals/report";
import viewReport from "./modals/viewReport";
import bulkActions from "./modals/bulkActions";
import viewPunishment from "./modals/viewPunishment";
import importAlbum from "./modals/importAlbum";
import confirm from "./modals/confirm";
import editSongs from "./modals/editSongs";
import editSong from "./modals/editSong";

const state = {
	modals: {},
	activeModals: []
};

const modalModules = {
	editUser,
	whatIsNew,
	createStation,
	editNews,
	manageStation,
	importPlaylist,
	editPlaylist,
	report,
	viewReport,
	bulkActions,
	viewPunishment,
	importAlbum,
	confirm,
	editSongs,
	editSong
};

const getters = {};

const actions = {
	closeModal: ({ commit }, modal) => {
		if (modal === "register")
			lofig.get("recaptcha.enabled").then(enabled => {
				if (enabled) window.location.reload();
			});

		commit("closeModal", modal);
	},
	openModal: ({ commit }, dataOrModal) =>
		new Promise(resolve => {
			const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
				/[xy]/g,
				symbol => {
					let array;

					if (symbol === "y") {
						array = ["8", "9", "a", "b"];
						return array[Math.floor(Math.random() * array.length)];
					}

					array = new Uint8Array(1);
					window.crypto.getRandomValues(array);
					return (array[0] % 16).toString(16);
				}
			);

			if (typeof dataOrModal === "string")
				commit("openModal", { modal: dataOrModal, uuid });
			else commit("openModal", { ...dataOrModal, uuid });
			resolve({ uuid });
		}),
	closeCurrentModal: ({ commit }) => {
		commit("closeCurrentModal");
	}
};

const mutations = {
	closeModal(state, modal) {
		Object.entries(state.modals).forEach(([uuid, _modal]) => {
			if (modal === _modal) {
				state.activeModals.splice(state.activeModals.indexOf(uuid), 1);
				delete state.modals[uuid];
			}
		});
	},
	openModal(state, { modal, uuid, data }) {
		state.modals[uuid] = modal;

		if (modalModules[modal]) {
			this.registerModule(["modals", modal, uuid], modalModules[modal]);
			if (data) this.dispatch(`modals/${modal}/${uuid}/init`, data);
		}

		state.activeModals.push(uuid);
	},
	closeCurrentModal(state) {
		const currentlyActiveModalUuid =
			state.activeModals[state.activeModals.length - 1];
		// TODO: make sure to only destroy/register modal listeners for a unique modal
		// remove any websocket listeners for the modal
		ws.destroyModalListeners(currentlyActiveModalUuid);

		state.activeModals.pop();

		delete state.modals[currentlyActiveModalUuid];
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
