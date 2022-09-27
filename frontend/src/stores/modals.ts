import { defineStore } from "pinia";
import utils from "@/utils";

import { useWebsocketsStore } from "@/stores/websockets";
import { useEditUserStore } from "@/stores/editUser";
import { useEditSongStore } from "@/stores/editSong";
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
	state: (): {
		modals: {
			[key: string]: string;
		};
		activeModals: string[];
		preventCloseUnsaved: { [uuid: string]: () => boolean };
		preventCloseCbs: { [uuid: string]: () => Promise<void> };
	} => ({
		modals: {},
		activeModals: [],
		preventCloseUnsaved: {},
		preventCloseCbs: {}
	}),
	actions: {
		closeModal(uuid: string) {
			Object.entries(this.modals).forEach(([_uuid, modal]) => {
				if (uuid === _uuid) {
					if (modal === "register")
						lofig
							.get("recaptcha.enabled")
							.then((enabled: boolean) => {
								if (enabled) window.location.reload();
							});
					const close = () => {
						const { socket } = useWebsocketsStore();
						socket.destroyModalListeners(uuid);
						this.activeModals.splice(
							this.activeModals.indexOf(uuid),
							1
						);
						delete this.modals[uuid];
					};
					if (typeof this.preventCloseCbs[uuid] !== "undefined")
						this.preventCloseCbs[uuid]().then(() => {
							close();
						});
					else if (
						typeof this.preventCloseUnsaved[uuid] !== "undefined" &&
						this.preventCloseUnsaved[uuid]()
					) {
						this.openModal({
							modal: "confirm",
							data: {
								message:
									"You have unsaved changes. Are you sure you want to discard these changes and close the modal?",
								onCompleted: close
							}
						});
					} else close();
				}
			});
		},
		openModal(dataOrModal: string | { modal: string; data?: any }) {
			const uuid = utils.guid();

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
			if (store && typeof store.init === "function" && data)
				store.init(data);

			this.activeModals.push(uuid);

			return { uuid };
		},
		closeCurrentModal() {
			const currentlyActiveModalUuid =
				this.activeModals[this.activeModals.length - 1];
			this.closeModal(currentlyActiveModalUuid);
		},
		closeAllModals() {
			const { socket } = useWebsocketsStore();
			this.activeModals.forEach(modalUuid => {
				socket.destroyModalListeners(modalUuid);
			});

			this.activeModals = [];
			this.modals = {};
		}
	}
});
