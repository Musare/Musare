import { defineAsyncComponent } from "vue";
import { defineStore } from "pinia";
import { generateUuid } from "@common/utils/generateUuid";
import { useWebsocketsStore } from "@/stores/websockets";
import { useConfigStore } from "@/stores/config";

export const useModalsStore = defineStore("modals", {
	state: (): {
		modals: Record<string, { modal: string; props?: Record<string, any> }>;
		activeModals: string[];
		preventCloseUnsaved: Record<string, () => boolean>;
		preventCloseCbs: Record<string, () => Promise<void>>;
	} => ({
		modals: {},
		activeModals: [],
		preventCloseUnsaved: {},
		preventCloseCbs: {}
	}),
	actions: {
		openModal(
			dataOrModal: string | { modal: string; props?: Record<string, any> }
		) {
			const uuid = generateUuid();
			let modal;
			let props;
			if (typeof dataOrModal === "string") modal = dataOrModal;
			else {
				modal = dataOrModal.modal;
				props = dataOrModal.props;
			}
			this.modals[uuid] = { modal, props };
			this.activeModals.push(uuid);
			return { uuid };
		},
		closeModal(uuid: string, force = false) {
			Object.entries(this.modals).forEach(([_uuid, modal]) => {
				if (uuid === _uuid) {
					if (modal.modal === "register") {
						const configStore = useConfigStore();
						if (configStore.recaptcha.enabled)
							window.location.reload();
					}
					const close = () => {
						const { socket } = useWebsocketsStore();
						socket.destroyModalListeners(uuid);
						this.activeModals.splice(
							this.activeModals.indexOf(uuid),
							1
						);
						delete this.modals[uuid];
						delete this.preventCloseCbs[uuid];
						delete this.preventCloseUnsaved[uuid];
					};
					if (
						!force &&
						typeof this.preventCloseCbs[uuid] !== "undefined"
					)
						this.preventCloseCbs[uuid]().then(() => {
							close();
						});
					else if (
						!force &&
						typeof this.preventCloseUnsaved[uuid] !== "undefined" &&
						this.preventCloseUnsaved[uuid]()
					) {
						this.openModal({
							modal: "confirm",
							props: {
								message:
									"You have unsaved changes. Are you sure you want to discard these changes and close the modal?",
								onCompleted: close
							}
						});
					} else close();
				}
			});
		},
		closeCurrentModal(force = false) {
			const currentlyActiveModalUuid =
				this.activeModals[this.activeModals.length - 1];
			this.closeModal(currentlyActiveModalUuid, force);
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

export const useModalComponents = (
	baseDirectory: string,
	map: Record<string, string>
) => {
	const modalComponents: Record<string, any> = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalComponents[mapKey] = defineAsyncComponent(
			() => import(`@/${baseDirectory}/${mapValue}`)
		);
	});
	return modalComponents;
};
