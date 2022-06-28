<script setup lang="ts">
import { ref } from "vue";

defineProps({
	placement: { type: String, default: "top" }
});

const emit = defineEmits(["confirm"]);

const clickedOnce = ref(false);
const body = ref(document.body);

const confirm = event => {
	if (
		!event ||
		event.type !== "click" ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey
	)
		return;

	clickedOnce.value = false;
	emit("confirm");
	setTimeout(() => {
		ref("confirm").tippy.hide();
	}, 25);
};

const click = event => {
	if (clickedOnce.value) confirm(event);
	else clickedOnce.value = true;
};

const shiftClick = event => {
	confirm(event);
};

const delayedHide = () => {
	setTimeout(() => {
		clickedOnce.value = false;
	}, 25);
};
</script>

<template>
	<tippy
		:interactive="true"
		:touch="true"
		:placement="placement"
		theme="quickConfirm"
		ref="quickConfirm"
		trigger="click"
		:append-to="body"
		@hide="delayedHide()"
	>
		<div
			@click.shift.stop="shiftClick($event)"
			@click.exact="click($event)"
		>
			<slot ref="trigger" />
		</div>
		<template #content>
			<a @click="confirm($event)"> Click to Confirm </a>
		</template>
	</tippy>
</template>
