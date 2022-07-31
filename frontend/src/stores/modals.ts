import { defineStore } from "pinia";
import { defineAsyncComponent } from "vue";
import ws from "@/ws";

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
import { useViewYoutubeVideoStore } from "@/stores/viewYoutubeVideo";
import { useWhatIsNewStore } from "@/stores/whatIsNew";

export const useModalsStore = defineStore("modals", {
	state: () => ({
		modals: {},
		activeModals: []
	}),
	actions: {
		closeModal(modal) {
			if (modal === "register")
				lofig.get("recaptcha.enabled").then(enabled => {
					if (enabled) window.location.reload();
				});

			Object.entries(this.modals).forEach(([uuid, _modal]) => {
				if (modal === _modal) {
					ws.destroyModalListeners(uuid);
					this.activeModals.splice(
						this.activeModals.indexOf(uuid),
						1
					);
					delete this.modals[uuid];
				}
			});
		},
		openModal(dataOrModal) {
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

			let modal;
			let data;
			if (typeof dataOrModal === "string") modal = dataOrModal;
			else {
				modal = dataOrModal.modal;
				data = dataOrModal.data;
			}
			this.modals[uuid] = modal;

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
				case "viewYoutubeVideo":
					store = useViewYoutubeVideoStore({ modalUuid: uuid });
					break;
				case "whatIsNew":
					store = useWhatIsNewStore({ modalUuid: uuid });
					break;
				default:
					break;
			}
			if (typeof store.init === "function" && data) store.init(data);

			this.activeModals.push(uuid);

			return { uuid };
		},
		closeCurrentModal() {
			const currentlyActiveModalUuid =
				this.activeModals[this.activeModals.length - 1];
			// TODO: make sure to only destroy/register modal listeners for a unique modal
			// remove any websocket listeners for the modal
			ws.destroyModalListeners(currentlyActiveModalUuid);

			this.activeModals.pop();

			delete this.modals[currentlyActiveModalUuid];
		},
		closeAllModals() {
			this.activeModals.forEach(modalUuid => {
				ws.destroyModalListeners(modalUuid);
			});

			this.activeModals = [];
			this.modals = {};
		}
	}
});

export const useModalComponents = (baseDirectory, map) => {
	const modalComponents = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalComponents[mapKey] = defineAsyncComponent(
			() => import(`@/${baseDirectory}/${mapValue}`)
		);
	});
	return modalComponents;
};
