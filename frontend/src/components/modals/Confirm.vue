<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useConfirmStore } from "@/stores/confirm";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const confirmStore = useConfirmStore(props);
const { message } = storeToRefs(confirmStore);
const { confirm } = confirmStore;

const { closeCurrentModal } = useModalsStore();

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
					<ul v-if="Array.isArray(message)">
						<li v-for="messageItem in message" :key="messageItem">
							{{ messageItem }}
						</li>
					</ul>
					<template v-else>
						{{ message }}
					</template>
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
