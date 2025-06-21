<script lang="ts" setup>
import { defineAsyncComponent } from "vue";

const Input = defineAsyncComponent(
	() => import("@/pages/NewStation/Components/Input.vue")
);

withDefaults(
	defineProps<{
		options: Record<string, string>;
		required?: boolean;
		autocomplete?: string;
	}>(),
	{
		required: false,
		autocomplete: "off"
	}
);

const value = defineModel<any>();
</script>

<template>
	<Input v-model="value" :required="required" :autocomplete="autocomplete">
		<slot />

		<template #input>
			<select
				class="inpt__input"
				v-model="value"
				:required="required"
				:autocomplete="autocomplete"
			>
				<option
					v-for="(
						[optionValue, optionLabel], index
					) in Object.entries(options)"
					:key="`select-option-${index}`"
					:value="optionValue"
				>
					{{ optionLabel }}
				</option>
			</select>
		</template>
	</Input>
</template>
