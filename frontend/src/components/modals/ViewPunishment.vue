<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const PunishmentItem = defineAsyncComponent(
	() => import("@/components/PunishmentItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	punishmentId: { type: String, required: true }
});

const { socket } = useWebsocketsStore();

const { closeCurrentModal } = useModalsStore();

const punishment = ref({});

const deactivatePunishment = event => {
	event.preventDefault();
	socket.dispatch(
		"punishments.deactivatePunishment",
		props.punishmentId,
		res => {
			if (res.status === "success") {
				punishment.value.active = false;
			} else {
				new Toast(res.message);
			}
		}
	);
};

onMounted(() => {
	socket.onConnect(() => {
		socket.dispatch(`punishments.findOne`, props.punishmentId, res => {
			if (res.status === "success") {
				punishment.value = res.data.punishment;

				socket.dispatch(
					"apis.joinRoom",
					`view-punishment.${props.punishmentId}`
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
		`view-punishment.${props.punishmentId}`,
		() => {}
	);
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
