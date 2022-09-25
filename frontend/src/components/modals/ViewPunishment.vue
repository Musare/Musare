<script setup lang="ts">
import { defineAsyncComponent, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useViewPunishmentStore } from "@/stores/viewPunishment";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const PunishmentItem = defineAsyncComponent(
	() => import("@/components/PunishmentItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const viewPunishmentStore = useViewPunishmentStore(props);
const { punishmentId, punishment } = storeToRefs(viewPunishmentStore);
const { viewPunishment } = viewPunishmentStore;

const { closeCurrentModal } = useModalsStore();

const deactivatePunishment = event => {
	event.preventDefault();
	socket.dispatch(
		"punishments.deactivatePunishment",
		punishmentId.value,
		res => {
			if (res.status === "success") {
				viewPunishmentStore.deactivatePunishment();
			} else {
				new Toast(res.message);
			}
		}
	);
};

onMounted(() => {
	socket.onConnect(() => {
		socket.dispatch(`punishments.findOne`, punishmentId.value, res => {
			if (res.status === "success") {
				viewPunishment(res.data.punishment);

				socket.dispatch(
					"apis.joinRoom",
					`view-punishment.${punishmentId.value}`
				);

				socket.on(
					"event:admin.punishment.updated",
					({ data }) => {
						punishment.value = data.punishment;
					},
					{ modalUuid: props.modalUuid }
				);
			} else {
				new Toast("Punishment with that ID not found");
				closeCurrentModal();
			}
		});
	});
});

onBeforeUnmount(() => {
	socket.dispatch(
		"apis.leaveRoom",
		`view-punishment.${punishmentId.value}`,
		() => {}
	);

	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	viewPunishmentStore.$dispose();
});
</script>

<template>
	<div>
		<modal title="View Punishment">
			<template #body v-if="punishment && punishment._id">
				<punishment-item
					:punishment="punishment"
					@deactivate="deactivatePunishment"
				/>
			</template>
		</modal>
	</div>
</template>
