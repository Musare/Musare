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
		<ul class="tbs__selectors">
			<li
				v-for="tab in tabs"
				:key="`tab-option-${tab}`"
				class="tbs__selector"
				:class="{ 'tbs__selector--selected': selected === tab }"
			>
				<button @click.prevent="selectTab(tab)">
					{{ tab }}
				</button>
			</li>
			<li class="tbs__divider"></li>
			<li class="tbs__placeholder"></li>
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

	&__selectors {
		display: flex;
		flex-shrink: 0;
		overflow-x: auto;
		background-color: var(--light-grey-2);
		border-bottom: solid 1px var(--light-grey-1);
	}

	&__selector {
		display: inline-flex;
		flex: 0 1 160px;

		button {
			display: inline-flex;
			justify-content: center;
			flex-grow: 1;
			font-size: 14px !important;
			font-weight: 600 !important;
			text-align: center;
			outline: none;
			border-radius: 0;
			padding: 5px 10px;
			line-height: 20px;
			border: none;
			border-left: solid 1px var(--light-grey-1);
			background-color: var(--light-grey-2);
			color: var(--black);
			cursor: pointer;
			transition: filter ease-in-out 0.2s;
			white-space: nowrap;

			&:hover {
				filter: brightness(90%);
			}
		}

		&:first-child button {
			border-left-color: var(--light-grey-2);
		}

		&--selected {
			button {
				background-color: var(--white);
				color: var(--primary-color);
			}

			&:first-child button {
				border-left-color: var(--white);
			}
		}
	}

	&__divider {
		display: inline-flex;
		background-color: var(--light-grey-1);
		flex: 1 0 0;
		max-width: 1px;
	}

	&__placeholder {
		display: inline-flex;
		background-color: transparent;
		flex: 1 0 0;
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
