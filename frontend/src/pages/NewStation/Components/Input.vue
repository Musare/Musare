<script lang="ts" setup>
import { InputTypeHTMLAttribute } from "vue";

withDefaults(
	defineProps<{
		type?: InputTypeHTMLAttribute;
		required?: boolean;
		autocomplete?: string;
	}>(),
	{
		type: "text",
		required: false,
		autocomplete: "off"
	}
);

const value = defineModel<any>();
</script>

<template>
	<label class="inpt">
		<strong class="inpt__label">
			<slot />
		</strong>

		<slot v-if="$slots.input" name="input" />
		<input
			v-else
			class="inpt__input"
			:type="type"
			v-model="value"
			:required="required"
			:autocomplete="autocomplete"
		/>
	</label>
</template>

<style lang="less" scoped>
.inpt {
	display: inline-flex;
	flex-direction: column;
	gap: 5px;

	&__label {
		color: var(--dark-grey-1);
		font-size: 0.9em;
	}

	:deep(&__input) {
		flex-grow: 1;
		line-height: 18px;
		font-size: 12px !important;
		padding: 5px 10px;
		background-color: var(--light-grey-2);
		border-radius: 5px;
		border: solid 1px var(--light-grey-1);
	}
}
</style>
