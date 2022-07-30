<script setup lang="ts">
import { useStore } from "vuex";
import { onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useConfirmStore } from "@/stores/confirm";

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const confirmStore = useConfirmStore(props);
const { message } = storeToRefs(confirmStore);
const { confirm } = confirmStore;

const store = useStore();

const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");

const confirmAction = () => {
	confirm();
	closeCurrentModal();
};

onBeforeUnmount(() => {
	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	confirmStore.$dispose();
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
