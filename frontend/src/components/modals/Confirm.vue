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
	emits: ["confirmed"],
	data() {
		return {
			modalName: ""
		};
	},
	computed: {
		...mapState("modalVisibility", {
			currentlyActive: state => state.currentlyActive
		}),
		...mapState("modals/confirm", {
			message: state => state.message
		})
	},
	mounted() {
		// eslint-disable-next-line
		this.modalName = this.currentlyActive[0];
	},
	methods: {
		confirmAction() {
			this.updateConfirmMessage("");
			this.$emit("confirmed");
			this.closeModal(this.modalName);
		},
		...mapActions("modals/confirm", ["updateConfirmMessage"]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>
