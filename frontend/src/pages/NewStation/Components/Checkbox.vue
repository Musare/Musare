<script lang="ts" setup>
const isChecked = defineModel<boolean>();
</script>

<template>
	<input type="checkbox" v-model="isChecked" />
</template>

<style lang="less" scoped>
input[type="checkbox"] {
	aspect-ratio: 1;
	height: 1em;
	background-color: var(--white);
	border: solid 1px var(--light-grey-1);
	appearance: none;
	border-radius: @border-radius;
	cursor: pointer;
	position: relative;

	&:checked {
		&:before,
		&:after {
			content: "";
			position: absolute;
			background-color: var(--primary-color);
			transform: rotate(45deg);
		}

		&:before {
			top: 16%;
			right: 28%;
			width: 16%;
			height: 64%;
		}

		&:after {
			top: 48%;
			left: 8%;
			width: 45%;
			height: 16%;
		}
	}
}
</style>
