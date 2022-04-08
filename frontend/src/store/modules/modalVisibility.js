/* eslint no-param-reassign: 0 */
import ws from "@/ws";

import editUser from "./modals/editUser";

const state = {
	modals: {
		whatIsNew: false,
		manageStation: false,
		login: false,
		register: false,
		createStation: false,
		importPlaylist: false,
		editPlaylist: false,
		createPlaylist: false,
		report: false,
		removeAccount: false,
		editNews: false,
		editSong: false,
		editSongs: false,
		importAlbum: false,
		viewReport: false,
		viewPunishment: false,
		confirm: false,
		editSongConfirm: false,
		editSongsConfirm: false,
		bulkActions: false
	},
	currentlyActive: [],
	new: {
		activeModals: [],
		modalMap: {}
	}
};

const modalModules = {
	editUser
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
	openModal: ({ commit }, data) =>
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

			commit("openModal", { ...data, uuid });
			resolve({ uuid });
		}),
	closeCurrentModal: ({ commit }) => {
		commit("closeCurrentModal");
	}
};

const mutations = {
	closeModal(state, modal) {
		if (!modalModules[modal]) {
			state.modals[modal] = false;
			const index = state.currentlyActive.indexOf(modal);
			if (index > -1) state.currentlyActive.splice(index, 1);
		}
	},
	async openModal(state, { modal, uuid, data }) {
		if (!modalModules[modal]) {
			state.modals[modal] = true;
			state.currentlyActive.push(modal);
		} else {
			state.new.modalMap[uuid] = modal;
			state.new.activeModals.push(uuid);
			state.currentlyActive.push(`${modal}-${uuid}`);

			this.registerModule(["modals", modal, uuid], modalModules[modal]);
			this.dispatch(`modals/${modal}/${uuid}/init`, data);
		}
	},
	closeCurrentModal(state) {
		const currentlyActiveModal =
			state.currentlyActive[state.currentlyActive.length - 1];
		// TODO: make sure to only destroy/register modal listeners for a unique modal
		// remove any websocket listeners for the modal
		ws.destroyModalListeners(currentlyActiveModal);

		if (
			!modalModules[
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
