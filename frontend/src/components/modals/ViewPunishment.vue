<script setup lang="ts">
import { defineAsyncComponent, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useViewPunishmentStore } from "@/stores/viewPunishment";
import ws from "@/ws";

const PunishmentItem = defineAsyncComponent(
	() => import("@/components/PunishmentItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const { socket } = useWebsocketsStore();

const viewPunishmentStore = useViewPunishmentStore(props);
const { punishmentId, punishment } = storeToRefs(viewPunishmentStore);
const { viewPunishment } = viewPunishmentStore;

const { closeCurrentModal } = useModalsStore();

const init = () => {
	socket.dispatch(`punishments.findOne`, punishmentId.value, res => {
		if (res.status === "success") {
			viewPunishment(res.data.punishment);
		} else {
			new Toast("Punishment with that ID not found");
			closeCurrentModal();
		}
	});
};

onMounted(() => {
	ws.onConnect(init);
});

onBeforeUnmount(() => {
	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	viewPunishmentStore.$dispose();
});
</script>

<template>
	<div>
		<modal title="View Punishment">
			<template #body v-if="punishment && punishment._id">
				<punishment-item :punishment="punishment" />
			</template>
		</modal>
	</div>
</template>
