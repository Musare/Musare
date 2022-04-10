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

const state = {
	modals: {
		editSong: false
	},
	currentlyActive: [],
	new: {
		activeModals: [],
		modalMap: {}
	}
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
	editSongs
};

const migratedModules = {
	whatIsNew: true,
	manageStation: true,
	login: true,
	register: true,
	createStation: true,
	importPlaylist: true,
	editPlaylist: true,
	createPlaylist: true,
	report: true,
	removeAccount: true,
	editNews: true,
	editSong: false,
	editSongs: true,
	editUser: true,
	importAlbum: true,
	viewReport: true,
	viewPunishment: true,
	confirm: true,
	bulkActions: true
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
		if (!migratedModules[modal]) {
			state.modals[modal] = false;
			const index = state.currentlyActive.indexOf(modal);
			if (index > -1) state.currentlyActive.splice(index, 1);
		} else {
			Object.entries(state.new.modalMap).forEach(([uuid, _modal]) => {
				if (modal === _modal) {
					state.new.activeModals.splice(
						state.new.activeModals.indexOf(uuid),
						1
					);
					state.currentlyActive.splice(
						state.currentlyActive.indexOf(`${modal}-${uuid}`),
						1
					);
					delete state.new.modalMap[uuid];
				}
			});
		}
	},
	openModal(state, { modal, uuid, data }) {
		if (!migratedModules[modal]) {
			state.modals[modal] = true;
			state.currentlyActive.push(modal);
		} else {
			state.new.modalMap[uuid] = modal;

			if (modalModules[modal]) {
				this.registerModule(
					["modals", modal, uuid],
					modalModules[modal]
				);
				if (data) this.dispatch(`modals/${modal}/${uuid}/init`, data);
			}

			state.new.activeModals.push(uuid);
			state.currentlyActive.push(`${modal}-${uuid}`);
		}
	},
	closeCurrentModal(state) {
		const currentlyActiveModal =
			state.currentlyActive[state.currentlyActive.length - 1];
		// TODO: make sure to only destroy/register modal listeners for a unique modal
		// remove any websocket listeners for the modal
		ws.destroyModalListeners(currentlyActiveModal);

		if (
			!migratedModules[
				currentlyActiveModal.substring(
					0,
					currentlyActiveModal.indexOf("-")
				)
			]
		) {
			state.modals[currentlyActiveModal] = false;
			state.currentlyActive.pop();
		} else {
			state.currentlyActive.pop();
			state.new.activeModals.pop();
			// const modal = currentlyActiveModal.substring(
			// 	0,
			// 	currentlyActiveModal.indexOf("-")
			// );
			const uuid = currentlyActiveModal.substring(
				currentlyActiveModal.indexOf("-") + 1
			);
			delete state.new.modalMap[uuid];
		}
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
