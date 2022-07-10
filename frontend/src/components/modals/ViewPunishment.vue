<script setup lang="ts">
import { useStore } from "vuex";
import { defineAsyncComponent, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { useModalState, useModalActions } from "@/vuex_helpers";
import ws from "@/ws";

const PunishmentItem = defineAsyncComponent(
	() => import("@/components/PunishmentItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { socket } = store.state.websockets;

const { punishmentId, punishment } = useModalState(
	"modals/viewPunishment/MODAL_UUID",
	{
		modalUuid: props.modalUuid
	}
);

const { viewPunishment } = useModalActions(
	"modals/viewPunishment/MODAL_UUID",
	["viewPunishment"],
	{
		modalUuid: props.modalUuid
	}
);

const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");

const init = () => {
	socket.dispatch(`punishments.findOne`, punishmentId, res => {
		if (res.status === "success") {
			const { punishment } = res.data;
			viewPunishment(punishment);
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
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "viewPunishment", props.modalUuid]);
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
