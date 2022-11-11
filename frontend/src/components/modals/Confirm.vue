<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const props = defineProps({
	modalUuid: { type: String, required: true },
	message: { type: [String, Array], required: true },
	onCompleted: { type: Function, required: true }
});

const { closeCurrentModal } = useModalsStore();

const confirmAction = () => {
	props.onCompleted();
	closeCurrentModal();
};
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
