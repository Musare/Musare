<script setup lang="ts">
import { useStore } from "vuex";
import { onBeforeUnmount } from "vue";
import { useModalState, useModalActions } from "@/vuex_helpers";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { message } = useModalState("modals/confirm/MODAL_UUID", {
	modalUuid: props.modalUuid
});

const { confirm } = useModalActions("modals/confirm/MODAL_UUID", ["confirm"], {
	modalUuid: props.modalUuid
});
const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");

const confirmAction = () => {
	confirm();
	closeCurrentModal();
};

onBeforeUnmount(() => {
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "confirm", props.modalUuid]);
});
</script>

<template>
	<div>
		<modal class="confirm-modal" title="Confirm Action" :size="'slim'">
			<template #body>
				<div class="confirm-modal-inner-container">
					{{ message }}
				</div>
			</template>
			<template #footer>
				<button class="button is-danger" @click="confirmAction()">
					<i class="material-icons icon-with-button">warning</i>
					Confirm
				</button>
			</template>
		</modal>
	</div>
</template>
