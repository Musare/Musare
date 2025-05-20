<script lang="ts" setup>
import { onMounted, ref } from "vue";

const props = defineProps<{
	tabs: string[];
	default?: string;
}>();

const selected = ref();

const selectTab = (tab: string) => {
	selected.value = tab;
};

onMounted(() => {
	const defaultTab = props.tabs.find(
		tab => typeof props.default === "undefined" || tab === props.default
	);
	if (defaultTab) selectTab(defaultTab);
});
</script>

<template>
	<div class="tbs">
		<ul>
			<li
				v-for="tab in tabs"
				:key="`tab-option-${tab}`"
				:class="{ 'tbs__li--selected': selected === tab }"
			>
				<button @click.prevent="selectTab(tab)">
					{{ tab }}
				</button>
			</li>
		</ul>
		<div class="tbs__tb">
			<template v-for="tab in tabs" :key="`tab-${tab}`">
				<slot v-if="selected === tab" :name="tab" />
			</template>
		</div>
	</div>
</template>

<style lang="less" scoped>
.tbs {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	background-color: var(--white);
	border-radius: 5px;
	border: solid 1px var(--light-grey-1);
	overflow: hidden;

	ul {
		display: flex;
		flex-shrink: 0;
		overflow-x: auto;
		border-bottom: solid 1px var(--light-grey-1);

		li {
			display: inline-flex;
			flex: 1 0 0;

			button {
				display: inline-flex;
				justify-content: center;
				flex-grow: 1;
				font-size: 14px;
				text-align: center;
				outline: none;
				border-radius: 0;
				padding: 5px 10px;
				line-height: 18px;
				font-weight: 600;
				border: solid 1px var(--light-grey-2);
				background-color: var(--light-grey-2);
				color: var(--black);
				cursor: pointer;
				transition: filter ease-in-out 0.2s;
				white-space: nowrap;

				&:hover {
					filter: brightness(90%);
				}
			}

			&.tbs__li--selected button {
				border: solid 1px var(--white);
				background-color: var(--white);
				color: var(--primary-color);
			}

			&:first-child button {
				border-radius: 5px 0 0 0;
			}

			&:last-child button {
				border-radius: 0 5px 0 0;
			}

			&:only-child button {
				border-radius: 5px 5px 0 0;
			}

			&:not(:first-child):not(:only-child) {
				border-left: solid 1px var(--light-grey-1);
			}
		}
	}

	&__tb {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		padding: 10px;
		overflow: auto;
		gap: 10px;
	}
}
</style>
