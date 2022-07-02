// WIP
import { ref, onMounted, onUnmounted, nextTick } from "vue";

export function useDragBox() {
	const dragBox = ref({
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
	});

	const onDragBoxUpdate = ref();

	const setOnDragBoxUpdate = newOnDragBoxUpdate => {
		onDragBoxUpdate.value = newOnDragBoxUpdate;
	}

	const setInitialBox = (initial, reset = false) => {
		dragBox.value.initial = initial || dragBox.value.initial;
		if (reset)
			dragBox.value = { ...dragBox.value, ...dragBox.value.initial };
	};

	const resetBoxPosition = (preventUpdate = false) => {
		setInitialBox(null, true);
		dragBox.value.latest.top = dragBox.value.top;
		dragBox.value.latest.left = dragBox.value.left;
		if (!preventUpdate && typeof onDragBoxUpdate.value === "function")
			onDragBoxUpdate.value();
	};

	const onDragBox = e => {
		const e1 = e || window.event;
		const e1IsTouch = e1.type === "touchstart";
		e1.preventDefault();

		if (e1IsTouch) {
			// Handle double click from touch (if this method is twice in a row within one second)
			if (Date.now() - dragBox.value.lastTappedDate <= 1000) {
				resetBoxPosition();
				dragBox.value.lastTappedDate = 0;
				return;
			}
			dragBox.value.lastTappedDate = Date.now();
		}

		dragBox.value.pos3 = e1IsTouch
			? e1.changedTouches[0].clientX
			: e1.clientX;
		dragBox.value.pos4 = e1IsTouch
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
			dragBox.value.pos1 = dragBox.value.pos3 - e2ClientX;
			dragBox.value.pos2 = dragBox.value.pos4 - e2ClientY;
			dragBox.value.pos3 = e2ClientX;
			dragBox.value.pos4 = e2ClientY;
			// set the element's new position:
			dragBox.value.top -= dragBox.value.pos2;
			dragBox.value.left -= dragBox.value.pos1;

			if (
				dragBox.value.top >
				document.body.clientHeight - dragBox.value.height
			)
				dragBox.value.top =
					document.body.clientHeight - dragBox.value.height;
			if (dragBox.value.top < 0) dragBox.value.top = 0;
			if (
				dragBox.value.left >
				document.body.clientWidth - dragBox.value.width
			)
				dragBox.value.left =
					document.body.clientWidth - dragBox.value.width;
			if (dragBox.value.left < 0) dragBox.value.left = 0;
		};

		document.onmouseup = document.ontouchend = () => {
			document.onmouseup = null;
			document.ontouchend = null;
			document.onmousemove = null;
			document.ontouchmove = null;

			if (typeof onDragBoxUpdate.value === "function")
				onDragBoxUpdate.value();
		};
	};

	const onWindowResizeDragBox = () => {
		if (dragBox.value.debounceTimeout)
			clearTimeout(dragBox.value.debounceTimeout);

		dragBox.value.debounceTimeout = setTimeout(() => {
			if (
				dragBox.value.top === dragBox.value.latest.top &&
				dragBox.value.left === dragBox.value.latest.left
			) {
				resetBoxPosition();
			}
			else {
				if (
					dragBox.value.top >
					document.body.clientHeight - dragBox.value.height
				)
					dragBox.value.top =
						document.body.clientHeight - dragBox.value.height;
				if (dragBox.value.top < 0) dragBox.value.top = 0;
				if (
					dragBox.value.left >
					document.body.clientWidth - dragBox.value.width
				)
					dragBox.value.left =
						document.body.clientWidth - dragBox.value.width;
				if (dragBox.value.left < 0) dragBox.value.left = 0;

				if (typeof onDragBoxUpdate.value === "function")
					onDragBoxUpdate.value();
			}
		}, 50);
	};

	onMounted(async () => {
		resetBoxPosition(true);

		await nextTick();

		onWindowResizeDragBox();
		window.addEventListener("resize", onWindowResizeDragBox);
	});

	onUnmounted(() => {
		window.removeEventListener("resize", onWindowResizeDragBox);
		if (dragBox.value.debounceTimeout)
			clearTimeout(dragBox.value.debounceTimeout);
	});

	return {
		dragBox,
		setInitialBox,
		onDragBox,
		resetBoxPosition,
		onWindowResizeDragBox,
		setOnDragBoxUpdate
	};
};
