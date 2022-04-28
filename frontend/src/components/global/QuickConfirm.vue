<template>
	<tippy
		:interactive="true"
		:touch="true"
		:placement="placement"
		theme="quickConfirm"
		ref="quickConfirm"
		trigger="click"
		:append-to="body"
		@hide="delayedHide()"
	>
		<div
			@click.shift.stop="shiftClick($event)"
			@click.exact="click($event)"
		>
			<slot ref="trigger" />
		</div>
		<template #content>
			<a @click="confirm($event)"> Click to Confirm </a>
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
				event.metaKey
			)
				return;

			this.clickedOnce = false;
			this.$emit("confirm");
			setTimeout(() => {
				this.$refs.confirm.tippy.hide();
			}, 25);
		},
		click(event) {
			if (!this.clickedOnce) this.clickedOnce = true;
			else this.confirm(event);
		},
		shiftClick(event) {
			this.confirm(event);
		},
		delayedHide() {
			setTimeout(() => {
				this.clickedOnce = false;
			}, 25);
		}
	}
};
</script>
