<template>
	<tippy
		interactive="true"
		:placement="placement"
		theme="confirm"
		ref="confirm"
		trigger="click"
		@hide="confirm(false)"
	>
		<template #trigger>
			<div @click.shift.stop="confirm(true)" @click.exact="confirm()">
				<slot />
			</div>
		</template>
		<a @click.exact="confirm(true)"> Click to Confirm </a>
	</tippy>
</template>

<script>
export default {
	props: {
		placement: {
			type: String,
			default: "top"
		}
	},
	data() {
		return {
			clickedOnce: false
		};
	},
	methods: {
		confirm(confirm) {
			if (confirm === false) {
				this.clickedOnce = false;
			} else if (confirm === true || this.clickedOnce === true) {
				this.$emit("confirm");
				this.clickedOnce = false;
			} else {
				this.clickedOnce = true;
			}
		}
	}
};
</script>
