<template>
	<tippy
		:interactive="true"
		:touch="true"
		:placement="placement"
		theme="confirm"
		ref="confirm"
		trigger="click"
		:append-to="body"
		@onHide="clickedOnce = false"
		@hide="delayedHide()"
	>
		<div @click.shift.stop="confirm()" @click.exact="clickedOnce = true">
			<slot ref="trigger" />
		</div>
		<template #content>
			<a @click="confirm($event)">
				Click to Confirm
			</a>
		</template>
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
	emits: ["confirm"],
	data() {
		return {
			clickedOnce: false,
			body: document.body
		};
	},

	methods: {
		// eslint-disable-next-line no-unused-vars
		confirm(event) {
			if (
				!event ||
				event.type !== "click" ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey
			)
				return;

			this.clickedOnce = false;
			this.$emit("confirm");
			this.$refs.confirm.tippy.hide();
		},
		delayedHide() {
			setTimeout(() => {
				this.clickedOnce = false;
			}, 25);
		}
	}
};
</script>
