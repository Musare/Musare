<template>
	<div>
		<transition name="save-button-transition" mode="out-in">
			<button
				:class="['button', 'save-button-mixin', style]"
				:key="status"
				:disabled="status === 'disabled'"
				v-html="message"
				@click="$emit('clicked')"
			/>
		</transition>
	</div>
</template>

<script>
export default {
	props: {
		defaultMessage: { type: String, default: "Save Changes" }
	},
	emits: ["clicked"],
	data() {
		return {
			status: "default" // enum: ["default", "disabled", "save-failure", "save-success"],
		};
	},
	computed: {
		message() {
			switch (this.status) {
				case "save-success":
					return `<i class="material-icons icon-with-button">done</i>Saved Changes`;
				case "save-failure":
					return `<i class="material-icons icon-with-button">error_outline</i>Failed to save`;
				case "disabled":
					return "Saving...";
				default:
					return this.defaultMessage
						? this.defaultMessage
						: "Save Changes";
			}
		},
		style() {
			switch (this.status) {
				case "save-success":
					return "is-success";
				case "save-failure":
					return `is-danger`;
				case "disabled":
					return "is-default";
				default:
					return "is-primary";
			}
		}
	},
	methods: {
		handleSuccessfulSave() {
			if (this.status !== "save-success") {
				this.status = "save-success";
				setTimeout(() => {
					this.status = "default";
				}, 2000);
			}
		},
		handleFailedSave() {
			if (this.status !== "save-failure") {
				this.status = "save-failure";
				setTimeout(() => {
					this.status = "default";
				}, 2000);
			}
		}
	}
};
</script>
