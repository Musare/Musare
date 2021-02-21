<script>
export default {
	data() {
		return {
			saveStatus: "default" // enum: ["default", "disabled", "save-failure", "save-success"],
		};
	},
	computed: {
		saveButtonMessage() {
			switch (this.saveStatus) {
				case "save-success":
					return `<i class="material-icons icon-with-button">done</i>Saved Changes`;
				case "save-failure":
					return `<i class="material-icons icon-with-button">error_outline</i>Failed to save`;
				case "disabled":
					return "Saving...";
				default:
					return "Save changes";
			}
		},
		saveButtonStyle() {
			switch (this.saveStatus) {
				case "save-success":
					return "is-success";
				case "save-failure":
					return `is-danger`;
				default:
					return "is-primary";
			}
		}
	},
	methods: {
		successfulSave() {
			if (this.saveStatus !== "save-success") {
				this.saveStatus = "save-success";
				setTimeout(() => {
					this.saveStatus = "default";
				}, 2000);
			}
		},
		failedSave() {
			if (this.saveStatus !== "save-failure") {
				this.saveStatus = "save-failure";
				setTimeout(() => {
					this.saveStatus = "default";
				}, 2000);
			}
		}
	}
};
</script>

<style lang="scss" scoped>
.save-changes {
	margin-top: 20px;

	&:disabled {
		background-color: var(--light-grey) !important;
		color: var(--black);
	}
}

.saving-changes-transition-enter-active {
	transition: all 0.1s ease;
}

.saving-changes-transition-enter {
	transform: translateX(20px);
	opacity: 0;
}
</style>
