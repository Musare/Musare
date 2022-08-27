<script setup lang="ts">
import { ref, computed, defineExpose } from "vue";

const props = defineProps({
	defaultMessage: { type: String, default: "Save Changes" }
});

const emit = defineEmits(["clicked"]);

const status = ref("default"); // enum: ["default", "disabled", "save-failure", "save-success"]

const message = computed(() => {
	switch (status.value) {
		case "save-success":
			return `<i class="material-icons icon-with-button">done</i>Saved Changes`;
		case "save-failure":
			return `<i class="material-icons icon-with-button">error_outline</i>Failed to save`;
		case "disabled":
		case "saving":
			return "Saving...";
		case "verifying":
			return "Verifying...";
		default:
			return props.defaultMessage || "Save Changes";
	}
});
const style = computed(() => {
	switch (status.value) {
		case "save-success":
			return "is-success";
		case "save-failure":
			return `is-danger`;
		case "saving":
		case "verifying":
		case "disabled":
			return "is-default";
		default:
			return "is-primary";
	}
});

const handleSuccessfulSave = () => {
	if (status.value !== "save-success") {
		status.value = "save-success";
		setTimeout(() => {
			status.value = "default";
		}, 2000);
	}
};

const handleFailedSave = () => {
	if (status.value !== "save-failure") {
		status.value = "save-failure";
		setTimeout(() => {
			status.value = "default";
		}, 2000);
	}
};

defineExpose({
	handleSuccessfulSave,
	handleFailedSave
});
</script>

<template>
	<div>
		<transition name="save-button-transition" mode="out-in">
			<button
				:class="['button', 'save-button-mixin', style]"
				:key="status"
				:disabled="status === 'disabled'"
				v-html="message"
				@click="emit('clicked')"
			/>
		</transition>
	</div>
</template>
