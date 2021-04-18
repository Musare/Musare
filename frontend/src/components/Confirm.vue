<template>
	<tippy
		interactive="true"
		:placement="placement"
		theme="confirm"
		ref="confirm"
		trigger="click"
		class="button-with-tooltip"
		@hide="clickedOnce = false"
	>
		<template #trigger>
			<div @click.shift.stop="confirm(true)" @click.exact="confirm()">
				<slot />
			</div>
		</template>
		<a @click="confirm(null, $event)">
			Click to Confirm
		</a>
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
		confirm(confirm, event) {
			if (confirm === null) {
				/* eslint-disable no-param-reassign */
				if (
					event &&
					event.type === "click" &&
					!event.altKey &&
					!event.ctrlKey &&
					!event.metaKey &&
					!event.shiftKey
				)
					confirm = true;
				else confirm = false;
			}

			if (confirm === false) {
				this.clickedOnce = false;
				this.$refs.confirm.tip.hide();
			} else if (confirm === true || this.clickedOnce === true) {
				this.clickedOnce = false;
				this.$emit("confirm");
			} else this.clickedOnce = true;
		}
	}
};
</script>
