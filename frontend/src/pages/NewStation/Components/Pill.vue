<script lang="ts" setup>
defineProps<{
	icon?: string;
}>();
</script>

<template>
	<div class="pll">
		<i v-if="icon" class="pll__icon material-icons" aria-hidden="true">
			{{ icon }}
		</i>
		<slot />
	</div>
</template>

<style lang="less" scoped>
.pll {
	display: inline-flex;
	font-size: 14px !important;
	align-items: center;
	outline: none;
	border-radius: 20px;
	padding: 5px 10px;
	line-height: 18px;
	font-weight: 500 !important;
	gap: 5px;
	border: solid 1px var(--light-grey-2);
	background-color: var(--light-grey-2);
	color: var(--black);

	&__icon {
		font-size: 18px;
	}
}
</style>
