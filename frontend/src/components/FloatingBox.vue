<template>
	<div
		ref="box"
		:class="{
			'floating-box': true,
			column
		}"
		:id="id"
		v-if="shown"
		:style="{
			width: width + 'px',
			height: height + 'px',
			top: top + 'px',
			left: left + 'px'
		}"
		@mousedown.left="onResizeBox"
	>
		<div class="box-header item-draggable" @mousedown.left="onDragBox">
			<span class="delete material-icons" @click="toggleBox()"
				>highlight_off</span
			>
		</div>
		<div class="box-body">
			<slot name="body"></slot>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		id: { type: String, default: null },
		column: { type: Boolean, default: true }
	},
	data() {
		return {
			width: 200,
			height: 200,
			top: 0,
			left: 0,
			shown: false,
			pos1: 0,
			pos2: 0,
			pos3: 0,
			pos4: 0
		};
	},
	mounted() {
		if (this.id !== null && localStorage[`box:${this.id}`]) {
			const json = JSON.parse(localStorage.getItem(`box:${this.id}`));
			this.height = json.height;
			this.width = json.width;
			this.top = json.top;
			this.left = json.left;
			this.shown = json.shown;
		}
	},
	methods: {
		onDragBox(e) {
			const e1 = e || window.event;
			e1.preventDefault();

			this.pos3 = e1.clientX;
			this.pos4 = e1.clientY;

			document.onmousemove = e => {
				const e2 = e || window.event;
				e2.preventDefault();
				// calculate the new cursor position:
				this.pos1 = this.pos3 - e.clientX;
				this.pos2 = this.pos4 - e.clientY;
				this.pos3 = e.clientX;
				this.pos4 = e.clientY;
				// set the element's new position:
				this.top -= this.pos2;
				this.left -= this.pos1;
			};

			document.onmouseup = () => {
				document.onmouseup = null;
				document.onmousemove = null;

				this.saveBox();
			};
		},
		onResizeBox(e) {
			if (e.target !== this.$refs.box) return;

			document.onmouseup = () => {
				document.onmouseup = null;

				const { height, width } = e.target.style;

				this.height = Number(
					height
						.split("")
						.splice(0, height.length - 2)
						.join("")
				);
				this.width = Number(
					width
						.split("")
						.splice(0, width.length - 2)
						.join("")
				);

				this.saveBox();
			};
		},
		toggleBox() {
			this.shown = !this.shown;
			this.saveBox();
		},
		resetBox() {
			this.top = 0;
			this.left = 0;
			this.width = 200;
			this.height = 200;
			this.saveBox();
		},
		saveBox() {
			if (this.id === null) return;
			localStorage.setItem(
				`box:${this.id}`,
				JSON.stringify({
					height: this.height,
					width: this.width,
					top: this.top,
					left: this.left,
					shown: this.shown
				})
			);
		}
	}
};
</script>

<style lang="scss">
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
	border-radius: 5px;
	min-height: 50px !important;
	min-width: 50px !important;
	padding: 0;

	.box-header {
		z-index: 100000001;
		background-color: var(--primary-color);
		display: block;
		height: 24px;
		width: 100%;

		.delete.material-icons {
			position: absolute;
			top: 2px;
			right: 2px;
			font-size: 20px;
			color: var(--white);
			cursor: pointer;
			&:hover,
			&:focus {
				filter: brightness(90%);
			}
		}
	}

	.box-body {
		display: flex;
		flex-wrap: wrap;
		padding: 10px;
		height: calc(100% - 24px); /* 24px is the height of the box-header */
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
