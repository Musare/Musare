<script lang="ts" setup>
defineProps<{
	icon?: string;
	label?: string;
	href?: string;
	target?: string;
}>();
</script>

<template>
	<li class="dropdown-list-item">
		<slot v-if="$slots.default" />
		<component
			v-else
			:is="href ? 'a' : 'button'"
			class="dropdown-list-item__action"
			:href="href"
			:target="target"
		>
			<span
				v-if="icon"
				class="material-icons dropdown-list-item__icon"
				aria-hidden="true"
			>
				{{ icon }}
			</span>
			{{ label }}
		</component>
	</li>
</template>

<style lang="less" scoped>
.dropdown-list-item {
	display: flex;

	:deep(&__icon) {
		font-size: 18px;
	}

	:deep(&__action) {
		display: inline-flex;
		flex-grow: 1;
		align-items: center;
		gap: 10px;
		border: none;
		background-color: var(--white);
		padding: 5px 10px;
		line-height: 20px;
		font-size: 12px !important;
		font-weight: 500 !important;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: filter ease-in-out 0.2s;

		&:hover,
		&:focus {
			filter: brightness(90%);
		}
	}

	&:only-child :deep(.dropdown-list-item__action) {
		border-radius: 5px;
	}

	&:not(:only-child) {
		&:first-child :deep(.dropdown-list-item__action) {
			border-radius: 5px 5px 0 0;
		}

		&:last-child :deep(.dropdown-list-item__action) {
			border-radius: 0 0 5px 5px;
		}

		&:not(:last-child) :deep(.dropdown-list-item__action) {
			border-bottom: solid 1px var(--light-grey-1);
		}
	}
}
</style>
