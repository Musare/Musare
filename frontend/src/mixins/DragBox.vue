<script>
export default {
	data() {
		return {
			dragBox: {
				top: 0,
				left: 0,
				pos1: 0,
				pos2: 0,
				pos3: 0,
				pos4: 0,
				width: 400,
				height: 50,
				initial: {
					top: 0,
					left: 0
				},
				latest: {
					top: null,
					left: null
				},
				debounceTimeout: null,
				lastTappedDate: 0
			}
		};
	},
	mounted() {
		this.resetBoxPosition(true);

		this.$nextTick(() => {
			this.onWindowResizeDragBox();
			window.addEventListener("resize", this.onWindowResizeDragBox);
		});
	},
	unmounted() {
		window.removeEventListener("resize", this.onWindowResizeDragBox);
		if (this.dragBox.debounceTimeout)
			clearTimeout(this.dragBox.debounceTimeout);
	},
	methods: {
		setInitialBox(initial, reset) {
			this.dragBox.initial = initial || this.dragBox.initial;
			if (reset)
				this.dragBox = { ...this.dragBox, ...this.dragBox.initial };
		},
		onDragBox(e) {
			const e1 = e || window.event;
			const e1IsTouch = e1.type === "touchstart";
			e1.preventDefault();

			if (e1IsTouch) {
				// Handle double click from touch (if this method is twice in a row within one second)
				if (Date.now() - this.dragBox.lastTappedDate <= 1000) {
					this.resetBoxPosition();
					this.dragBox.lastTappedDate = 0;
					return;
				}
				this.dragBox.lastTappedDate = Date.now();
			}

			this.dragBox.pos3 = e1IsTouch
				? e1.changedTouches[0].clientX
				: e1.clientX;
			this.dragBox.pos4 = e1IsTouch
				? e1.changedTouches[0].clientY
				: e1.clientY;

			document.onmousemove = document.ontouchmove = e => {
				const e2 = e || window.event;
				const e2IsTouch = e2.type === "touchmove";
				if (!e2IsTouch) e2.preventDefault();

				// Get the clientX and clientY
				const e2ClientX = e2IsTouch
					? e2.changedTouches[0].clientX
					: e2.clientX;
				const e2ClientY = e2IsTouch
					? e2.changedTouches[0].clientY
					: e2.clientY;

				// calculate the new cursor position:
				this.dragBox.pos1 = this.dragBox.pos3 - e2ClientX;
				this.dragBox.pos2 = this.dragBox.pos4 - e2ClientY;
				this.dragBox.pos3 = e2ClientX;
				this.dragBox.pos4 = e2ClientY;
				// set the element's new position:
				this.dragBox.top -= this.dragBox.pos2;
				this.dragBox.left -= this.dragBox.pos1;

				if (this.dragBox.top < 0) this.dragBox.top = 0;
				if (
					this.dragBox.top >
					document.body.clientHeight - this.dragBox.height
				)
					this.dragBox.top =
						document.body.clientHeight - this.dragBox.height;
				if (this.dragBox.left < 0) this.dragBox.left = 0;
				if (
					this.dragBox.left >
					document.body.clientWidth - this.dragBox.width
				)
					this.dragBox.left =
						document.body.clientWidth - this.dragBox.width;
			};

			document.onmouseup = document.ontouchend = () => {
				document.onmouseup = null;
				document.ontouchend = null;
				document.onmousemove = null;
				document.ontouchmove = null;

				if (typeof this.onDragBoxUpdate === "function")
					this.onDragBoxUpdate();
			};
		},
		resetBoxPosition(preventUpdate) {
			this.setInitialBox(null, true);
			this.dragBox.latest.top = this.dragBox.top;
			this.dragBox.latest.left = this.dragBox.left;
			if (!preventUpdate && typeof this.onDragBoxUpdate === "function")
				this.onDragBoxUpdate();
		},
		onWindowResizeDragBox() {
			if (this.dragBox.debounceTimeout)
				clearTimeout(this.dragBox.debounceTimeout);

			this.dragBox.debounceTimeout = setTimeout(() => {
				if (
					this.dragBox.top === this.dragBox.latest.top &&
					this.dragBox.left === this.dragBox.latest.left
				)
					this.resetBoxPosition();
				else {
					if (this.dragBox.top < 0) this.dragBox.top = 0;
					if (
						this.dragBox.top >
						document.body.clientHeight - this.dragBox.height
					)
						this.dragBox.top =
							document.body.clientHeight - this.dragBox.height;
					if (this.dragBox.left < 0) this.dragBox.left = 0;
					if (
						this.dragBox.left >
						document.body.clientWidth - this.dragBox.width
					)
						this.dragBox.left =
							document.body.clientWidth - this.dragBox.width;

					if (typeof this.onDragBoxUpdate === "function")
						this.onDragBoxUpdate();
				}
			}, 50);
		}
	}
};
</script>
