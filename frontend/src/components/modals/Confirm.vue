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

<script>
import { mapActions } from "vuex";

import { mapModalState, mapModalActions } from "@/vuex_helpers";

export default {
	props: {
		modalUuid: { type: String, default: "" }
	},
	computed: {
		...mapModalState("modals/confirm/MODAL_UUID", {
			message: state => state.message
		})
	},
	beforeUnmount() {
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule(["modals", "confirm", this.modalUuid]);
	},
	methods: {
		confirmAction() {
			this.confirm();
			this.closeCurrentModal();
		},
		...mapModalActions("modals/confirm/MODAL_UUID", ["confirm"]),
		...mapActions("modalVisibility", ["closeCurrentModal"])
	}
};
</script>
