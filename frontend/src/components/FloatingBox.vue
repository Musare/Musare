<template>
	<div
		ref="box"
		:class="{
			'floating-box': true,
			column
		}"
		:id="id"
		v-if="persist || shown"
		:style="{
			width: dragBox.width + 'px',
			height: dragBox.height + 'px',
			top: dragBox.top + 'px',
			left: dragBox.left + 'px'
		}"
		@mousedown.left="onResizeBox"
	>
		<div class="box-header item-draggable" @mousedown.left="onDragBox">
			<span class="drag material-icons" @dblclick="resetBoxPosition()"
				>drag_indicator</span
			>
			<span v-if="title" class="box-title">{{ title }}</span>
			<span
				v-if="!persist"
				class="delete material-icons"
				@click="toggleBox()"
				>highlight_off</span
			>
		</div>
		<div class="box-body">
			<slot name="body"></slot>
		</div>
	</div>
</template>

<script>
import DragBox from "@/mixins/DragBox.vue";

export default {
	mixins: [DragBox],
	props: {
		id: { type: String, default: null },
		column: { type: Boolean, default: true },
		title: { type: String, default: null },
		persist: { type: Boolean, default: false },
		initial: { type: String, default: "align-top" },
		minWidth: { type: Number, default: 100 },
		maxWidth: { type: Number, default: 1000 },
		minHeight: { type: Number, default: 100 },
		maxHeight: { type: Number, default: 1000 }
	},
	data() {
		return {
			shown: false
		};
	},
	mounted() {
		let initial = {
			top: 10,
			left: 10,
			width: 200,
			height: 400
		};
		if (this.id !== null && localStorage[`box:${this.id}`]) {
			const json = JSON.parse(localStorage.getItem(`box:${this.id}`));
			initial = { ...initial, ...json };
			this.shown = json.shown;
		} else {
			initial.top =
				this.initial === "align-bottom"
					? document.body.clientHeight - 10 - initial.height
					: 10;
		}
		this.setInitialBox(initial, true);
	},
	methods: {
		onResizeBox(e) {
			if (e.target !== this.$refs.box) return;

			document.onmouseup = () => {
				document.onmouseup = null;

				const { height, width } = e.target.style;

				this.dragBox.height = Math.min(
					Math.max(
						Number(
							height
								.split("")
								.splice(0, height.length - 2)
								.join("")
						),
						this.minHeight
					),
					this.maxHeight
				);

				this.dragBox.width = Math.min(
					Math.max(
						Number(
							width
								.split("")
								.splice(0, width.length - 2)
								.join("")
						),
						this.minWidth
					),
					this.maxWidth
				);

				this.saveBox();
			};
		},
		toggleBox() {
			this.shown = !this.shown;
			this.saveBox();
		},
		resetBoxDimensions() {
			this.dragBox.width = 200;
			this.dragBox.height = 200;
			this.saveBox();
		},
		saveBox() {
			if (this.id === null) return;
			localStorage.setItem(
				`box:${this.id}`,
				JSON.stringify({
					height: this.dragBox.height,
					width: this.dragBox.width,
					top: this.dragBox.top,
					left: this.dragBox.left,
					shown: this.shown
				})
			);
			this.setInitialBox({
				top:
					this.initial === "align-bottom"
						? document.body.clientHeight - 10 - this.dragBox.height
						: 10,
				left: 10
			});
		},
		onDragBoxUpdate() {
			this.saveBox();
		}
	}
};
</script>

<style lang="less">
.night-mode .floating-box {
	background-color: var(--dark-grey-2) !important;
	border: 0 !important;
	.box-body b {
		color: var(--light-grey-2) !important;
	}
}

.floating-box {
	display: flex;
	flex-direction: column;
	background-color: var(--white);
	color: var(--black);
	position: fixed;
	z-index: 10000000;
	resize: both;
	overflow: auto;
	border: 1px solid var(--light-grey-2);
	border-radius: @border-radius;
	padding: 0;

	.box-header {
		display: flex;
		height: 30px;
		width: 100%;
		background-color: var(--primary-color);
		color: var(--white);
		z-index: 100000001;

		.box-title {
			font-size: 16px;
			font-weight: 600;
			line-height: 30px;
			margin-right: 5px;
		}

		.material-icons {
			font-size: 20px;
			line-height: 30px;

			&:hover,
			&:focus {
				filter: brightness(90%);
			}

			&.drag {
				margin: 0 5px;
			}

			&.delete {
				margin: 0 5px 0 auto;
				cursor: pointer;
			}
		}
	}

	.box-body {
		display: flex;
		flex-wrap: wrap;
		padding: 10px;
		height: calc(100% - 30px); /* 30px is the height of the box-header */
		overflow: auto;

		span {
			padding: 3px 6px;
		}
	}

	&.column .box-body {
		flex-flow: column;
		span {
			flex: 1;
			display: block;
		}
	}
}
</style>
