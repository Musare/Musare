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
			@keydown.enter="$emit('submitted')"
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

<script>
export default {
	props: {
		modelValue: {
			type: String,
			default: ""
		},
		placeholder: {
			type: String,
			default: "Search value"
		},
		disabled: {
			type: Boolean,
			default: false
		},
		allItems: {
			type: Array,
			default: () => []
		}
	},
	emits: ["update:modelValue"],
	data() {
		return {
			inputFocussed: false,
			containerFocussed: false,
			itemFocussed: false,
			keydownInputTimeout: null,
			items: []
		};
	},
	computed: {
		value: {
			get() {
				return this.modelValue;
			},
			set(value) {
				this.$emit("update:modelValue", value);
			}
		}
	},
	methods: {
		blurInput(event) {
			if (
				event.relatedTarget &&
				event.relatedTarget.classList.contains("autosuggest-item")
			)
				this.itemFocussed = true;
			this.inputFocussed = false;
		},
		focusInput() {
			this.inputFocussed = true;
		},
		keydownInput() {
			clearTimeout(this.keydownInputTimeout);
			this.keydownInputTimeout = setTimeout(() => {
				if (this.value && this.value.length > 1) {
					this.items = this.allItems.filter(item =>
						item.toLowerCase().startsWith(this.value.toLowerCase())
					);
				} else this.items = [];
			}, 1000);
		},
		focusAutosuggestContainer() {
			this.containerFocussed = true;
		},
		blurAutosuggestContainer() {
			this.containerFocussed = false;
		},
		selectAutosuggestItem(item) {
			this.value = item;
			this.items = [];
		},
		focusAutosuggestItem() {
			this.itemFocussed = true;
		},
		blurAutosuggestItem(event) {
			if (
				!event.relatedTarget ||
				!event.relatedTarget.classList.contains("autosuggest-item")
			)
				this.itemFocussed = false;
		}
	}
};
</script>

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
