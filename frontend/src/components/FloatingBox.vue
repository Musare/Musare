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
			width: width + 'px',
			height: height + 'px',
			top: top + 'px',
			left: left + 'px'
		}"
		@mousedown.left="onResizeBox"
	>
		<div class="box-header item-draggable" @mousedown.left="onDragBox">
			<span class="drag material-icons">drag_indicator</span>
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
export default {
	props: {
		id: { type: String, default: null },
		column: { type: Boolean, default: true },
		title: { type: String, default: null },
		persist: { type: Boolean, default: false }
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
	min-height: 50px !important;
	min-width: 50px !important;
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
