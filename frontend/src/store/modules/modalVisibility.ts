/* eslint no-param-reassign: 0 */
import ws from "@/ws";

import whatIsNew from "./modals/whatIsNew";
import viewYoutubeVideo from "./modals/viewYoutubeVideo";

import { useEditUserStore } from "@/stores/editUser";
import { useEditSongStore } from "@/stores/editSong";
import { useEditSongsStore } from "@/stores/editSongs";
import { useBulkActionsStore } from "@/stores/bulkActions";
import { useConfirmStore } from "@/stores/confirm";
import { useCreateStationStore } from "@/stores/createStation";
import { useEditNewsStore } from "@/stores/editNews";
import { useEditPlaylistStore } from "@/stores/editPlaylist";
import { useImportAlbumStore } from "@/stores/importAlbum";
import { useManageStationStore } from "@/stores/manageStation";
import { useRemoveAccountStore } from "@/stores/removeAccount";
import { useReportStore } from "@/stores/report";
import { useViewApiRequestStore } from "@/stores/viewApiRequest";
import { useViewPunishmentStore } from "@/stores/viewPunishment";
import { useViewReportStore } from "@/stores/viewReport";

const state = {
	modals: {},
	activeModals: []
};

const piniaStores = [
	"editUser",
	"editSong",
	"editSongs",
	"bulkActions",
	"confirm",
	"createStation",
	"editNews",
	"editPlaylist",
	"importAlbum",
	"manageStation",
	"removeAccount",
	"report",
	"viewApiRequest",
	"viewPunishment",
	"viewReport"
];

const modalModules = {
	whatIsNew,
	viewYoutubeVideo
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
	},
	closeAllModals: ({ commit }) => {
		commit("closeAllModals");
	}
};

const mutations = {
	closeModal(state, modal) {
		Object.entries(state.modals).forEach(([uuid, _modal]) => {
			if (modal === _modal) {
				ws.destroyModalListeners(uuid);
				state.activeModals.splice(state.activeModals.indexOf(uuid), 1);
				delete state.modals[uuid];
			}
		});
	},
	openModal(state, { modal, uuid, data }) {
		state.modals[uuid] = modal;

		if (piniaStores.indexOf(modal) !== -1) {
			let store;

			switch (modal) {
				case "editUser":
					store = useEditUserStore({ modalUuid: uuid });
					break;
				case "editSong":
					store = useEditSongStore({ modalUuid: uuid });
					break;
				case "editSongs":
					store = useEditSongsStore({ modalUuid: uuid });
					break;
				case "bulkActions":
					store = useBulkActionsStore({ modalUuid: uuid });
					break;
				case "confirm":
					store = useConfirmStore({ modalUuid: uuid });
					break;
				case "createStation":
					store = useCreateStationStore({ modalUuid: uuid });
					break;
				case "editNews":
					store = useEditNewsStore({ modalUuid: uuid });
					break;
				case "editPlaylist":
					store = useEditPlaylistStore({ modalUuid: uuid });
					break;
				case "importAlbum":
					store = useImportAlbumStore({ modalUuid: uuid });
					break;
				case "manageStation":
					store = useManageStationStore({ modalUuid: uuid });
					break;
				case "removeAccount":
					store = useRemoveAccountStore({ modalUuid: uuid });
					break;
				case "report":
					store = useReportStore({ modalUuid: uuid });
					break;
				case "viewApiRequest":
					store = useViewApiRequestStore({ modalUuid: uuid });
					break;
				case "viewPunishment":
					store = useViewPunishmentStore({ modalUuid: uuid });
					break;
				case "viewReport":
					store = useViewReportStore({ modalUuid: uuid });
					break;
				default:
					break;
			}

			if (typeof store.init === "function" && data) store.init(data);
		} else if (modalModules[modal]) {
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
	},
	closeAllModals(state) {
		state.activeModals.forEach(modalUuid => {
			ws.destroyModalListeners(modalUuid);
		});

		state.activeModals = [];
		state.modals = {};
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
