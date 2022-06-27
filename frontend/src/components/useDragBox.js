// WIP
import { onUnmounted } from "vue";

export default () => {
	let dragBox = {
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
	};

	const setInitialBox = (initial, reset) => {
		dragBox.initial = initial || dragBox.initial;
		if (reset) dragBox = { ...dragBox, ...dragBox.initial };
	};

	// eslint-disable-next-line
	const resetBoxPosition = preventUpdate => {
		setInitialBox(null, true);
		dragBox.latest.top = dragBox.top;
		dragBox.latest.left = dragBox.left;
		// if (!preventUpdate && typeof onDragBoxUpdate === "function")
		// 	onDragBoxUpdate();
	};

	const onDragBox = e => {
		const e1 = e || window.event;
		const e1IsTouch = e1.type === "touchstart";
		e1.preventDefault();

		if (e1IsTouch) {
			// Handle double click from touch (if this method is twice in a row within one second)
			if (Date.now() - dragBox.lastTappedDate <= 1000) {
				resetBoxPosition();
				dragBox.lastTappedDate = 0;
				return;
			}
			dragBox.lastTappedDate = Date.now();
		}

		dragBox.pos3 = e1IsTouch ? e1.changedTouches[0].clientX : e1.clientX;
		dragBox.pos4 = e1IsTouch ? e1.changedTouches[0].clientY : e1.clientY;

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
			dragBox.pos1 = dragBox.pos3 - e2ClientX;
			dragBox.pos2 = dragBox.pos4 - e2ClientY;
			dragBox.pos3 = e2ClientX;
			dragBox.pos4 = e2ClientY;
			// set the element's new position:
			dragBox.top -= dragBox.pos2;
			dragBox.left -= dragBox.pos1;

			if (dragBox.top > document.body.clientHeight - dragBox.height)
				dragBox.top = document.body.clientHeight - dragBox.height;
			if (dragBox.top < 0) dragBox.top = 0;
			if (dragBox.left > document.body.clientWidth - dragBox.width)
				dragBox.left = document.body.clientWidth - dragBox.width;
			if (dragBox.left < 0) dragBox.left = 0;
		};

		document.onmouseup = document.ontouchend = () => {
			document.onmouseup = null;
			document.ontouchend = null;
			document.onmousemove = null;
			document.ontouchmove = null;

			// if (typeof onDragBoxUpdate === "function") onDragBoxUpdate();
		};
	};

	const onWindowResizeDragBox = () => {
		if (dragBox.debounceTimeout) clearTimeout(dragBox.debounceTimeout);

		dragBox.debounceTimeout = setTimeout(() => {
			if (
				dragBox.top === dragBox.latest.top &&
				dragBox.left === dragBox.latest.left
			)
				resetBoxPosition();
			else {
				if (dragBox.top > document.body.clientHeight - dragBox.height)
					dragBox.top = document.body.clientHeight - dragBox.height;
				if (dragBox.top < 0) dragBox.top = 0;
				if (dragBox.left > document.body.clientWidth - dragBox.width)
					dragBox.left = document.body.clientWidth - dragBox.width;
				if (dragBox.left < 0) dragBox.left = 0;

				// if (typeof onDragBoxUpdate === "function") onDragBoxUpdate();
			}
		}, 50);
	};

	resetBoxPosition(true);

	onWindowResizeDragBox();
	window.addEventListener("resize", onWindowResizeDragBox);

	onUnmounted(() => {
		window.removeEventListener("resize", onWindowResizeDragBox);
		if (dragBox.debounceTimeout) clearTimeout(dragBox.debounceTimeout);
	});
	return {
		dragBox,
		setInitialBox,
		onDragBox,
		resetBoxPosition,
		onWindowResizeDragBox
	};
};
