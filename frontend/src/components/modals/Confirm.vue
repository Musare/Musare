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
import { mapState, mapActions } from "vuex";
import Modal from "../Modal.vue";

export default {
	components: { Modal },
	computed: {
		...mapState("modals/confirm", {
			message: state => state.message
		})
	},
	beforeUnmount() {
		this.updateConfirmMessage("");
	},
	methods: {
		confirmAction() {
			this.$emit("confirmed");
			this.closeCurrentModal();
		},
		...mapActions("modals/confirm", ["updateConfirmMessage"]),
		...mapActions("modalVisibility", ["closeCurrentModal"])
	}
};
</script>
