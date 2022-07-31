<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps({
	modelValue: { type: String, default: "" },
	placeholder: { type: String, default: "Search value" },
	disabled: { type: Boolean, default: false },
	allItems: { type: Array, default: () => [] }
});

const emit = defineEmits(["update:modelValue", "submitted"]);

const inputFocussed = ref(false);
const containerFocussed = ref(false);
const itemFocussed = ref(false);
const keydownInputTimeout = ref();
const items = ref([]);

const value = computed({
	get: () => props.modelValue,
	set: value => emit("update:modelValue", value)
});

const blurInput = event => {
	if (
		event.relatedTarget &&
		event.relatedTarget.classList.contains("autosuggest-item")
	)
		itemFocussed.value = true;
	inputFocussed.value = false;
};

const focusInput = () => {
	inputFocussed.value = true;
};

const keydownInput = () => {
	clearTimeout(keydownInputTimeout.value);
	keydownInputTimeout.value = setTimeout(() => {
		if (value.value && value.value.length > 1) {
			items.value = props.allItems.filter(item =>
				item.toLowerCase().startsWith(value.value.toLowerCase())
			);
		} else items.value = [];
	}, 1000);
};

const focusAutosuggestContainer = () => {
	containerFocussed.value = true;
};

const blurAutosuggestContainer = () => {
	containerFocussed.value = false;
};

const selectAutosuggestItem = item => {
	value.value = item;
	items.value = [];
};

const focusAutosuggestItem = () => {
	itemFocussed.value = true;
};

const blurAutosuggestItem = event => {
	if (
		!event.relatedTarget ||
		!event.relatedTarget.classList.contains("autosuggest-item")
	)
		itemFocussed.value = false;
};
</script>

<template>
	<div>
		<input
			v-model="value"
			class="input"
			type="text"
			:placeholder="placeholder"
			:disabled="disabled"
			@blur="blurInput($event)"
			@focus="focusInput()"
			@keydown.enter="emit('submitted')"
			@keydown="keydownInput()"
		/>
		<div
			class="autosuggest-container"
			v-if="
				(inputFocussed || containerFocussed || itemFocussed) &&
				items.length > 0
			"
			@mouseover="focusAutosuggestContainer()"
			@mouseleave="blurAutosuggestContainer()"
		>
			<span
				class="autosuggest-item"
				tabindex="0"
				@click="selectAutosuggestItem(item)"
				@keyup.enter="selectAutosuggestItem(item)"
				@focus="focusAutosuggestItem()"
				@blur="blurAutosuggestItem($event)"
				v-for="item in items"
				:key="item"
			>
				{{ item }}
			</span>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode .autosuggest-container {
	background-color: var(--dark-grey) !important;

	.autosuggest-item {
		background-color: var(--dark-grey) !important;
		color: var(--white) !important;
		border-color: var(--dark-grey) !important;
	}

	.autosuggest-item:hover,
	.autosuggest-item:focus {
		background-color: var(--dark-grey-2) !important;
	}
}

.autosuggest-container {
	position: absolute;
	background: var(--white);
	width: calc(100% + 1px);
	top: 35px;
	z-index: 200;
	overflow: auto;
	max-height: 98px;
	clear: both;

	.autosuggest-item {
		padding: 8px;
		display: block;
		border: 1px solid var(--light-grey-2);
		margin-top: -1px;
		line-height: 16px;
		cursor: pointer;
		-webkit-user-select: none;
		-ms-user-select: none;
		-moz-user-select: none;
		user-select: none;
	}

	.autosuggest-item:hover,
	.autosuggest-item:focus {
		background-color: var(--light-grey);
	}

	.autosuggest-item:first-child {
		border-top: none;
	}

	.autosuggest-item:last-child {
		border-radius: 0 0 @border-radius @border-radius;
	}
}
</style>
