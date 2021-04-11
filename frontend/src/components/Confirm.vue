<template>
	<tippy
		interactive="true"
		placement="top"
		theme="confirm"
		ref="confirm"
		trigger="click"
	>
		<template #trigger>
			<slot />
		</template>
		<a @click.prevent="confirm()"> Confirm </a>
	</tippy>
</template>

<script>
export default {
	methods: {
		confirm() {
			this.$emit("confirm");
		}
	}
};
</script>
