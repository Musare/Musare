<template>
	<tippy
		interactive="true"
		placement="top"
		theme="confirm"
		ref="confirm"
		trigger="click"
		@click.shift="confirm()"
	>
		<template #trigger @click.shift="confirm()">
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
