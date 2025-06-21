<script lang="ts" setup>
withDefaults(
	defineProps<{
		type?: HTMLButtonElement["type"];
		icon?: string;
		disabled?: boolean;
		square?: boolean;
		inverse?: boolean;
		danger?: boolean;
		grey?: boolean;
	}>(),
	{
		type: "button",
		icon: null,
		disabled: false,
		square: false,
		inverse: false,
		danger: false,
		grey: false
	}
);
</script>

<template>
	<button
		:type="type"
		:class="{
			btn: true,
			'btn--square': square,
			'btn--inverse': inverse,
			'btn--danger': danger,
			'btn--grey': grey
		}"
		:disabled="disabled"
	>
		<i v-if="icon" class="btn__icon material-icons" aria-hidden="true">
			{{ icon }}
		</i>
		<slot />
	</button>
</template>

<style lang="less" scoped>
.btn {
	--secondary-color: var(--white);

	display: inline-flex;
	font-size: 14px !important;
	align-items: center;
	outline: none;
	border-radius: 5px;
	padding: 5px 10px;
	line-height: 18px;
	font-weight: 500 !important;
	gap: 5px;
	border: solid 1px var(--primary-color);
	background-color: var(--primary-color);
	color: var(--secondary-color);
	cursor: pointer;
	transition: filter ease-in-out 0.2s;

	&[disabled] {
		filter: grayscale(1);
		cursor: not-allowed;
	}

	&:not([disabled]):hover,
	&:not([disabled]):focus {
		filter: brightness(90%);
	}

	&--square {
		aspect-ratio: 1;
		padding: 5px;
	}

	&--inverse {
		background-color: var(--secondary-color);
		color: var(--primary-color);
		border-color: var(--primary-color);
	}

	&--danger {
		--primary-color: var(--red);
	}

	&--grey {
		background-color: var(--light-grey-2);
		color: var(--primary-color);
		border-color: var(--light-grey-1);
	}

	&__icon {
		font-size: 18px;
	}
}
</style>
