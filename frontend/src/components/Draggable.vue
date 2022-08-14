<script setup lang="ts">
import { PropType, onMounted, ref } from "vue";

const props = defineProps({
	name: { type: String, default: "" },
	itemKey: { type: String, default: "" },
	list: { type: Array as PropType<any[]>, default: () => [] },
	componentData: { type: Object, default: () => ({}) },
	attributes: { type: Object, default: () => ({}) },
	options: { type: Object, default: () => ({}) },
	tag: { type: String, default: "div" },
	class: { type: String, default: "" }
});

const mounted = ref(false);

onMounted(() => {
	mounted.value = true;
});

const emit = defineEmits(["update:list", "start", "end", "update"]);

// When an element starts being dragged
const onDragStart = (itemIndex: number, event: DragEvent) => {
	// console.log(111, event);

	// Set the effect of moving an element, which by default is clone. Not being used right now
	event.dataTransfer.dropEffect = "move";

	// Sets the dragging element index, list name and adds a remove function for when this item is moved to a different list
	window.draggingItemIndex = itemIndex;
	window.draggingItemListName = props.name;
	window.draggingItemOnMove = index => {
		delete window.draggingItemOnMove;
		const list = props.list.slice();
		const listItem = list.splice(index, 1)[0];
		emit("update:list", list);
		return listItem;
	};

	// Emits the start event to the parent component, indicating that dragging has started
	emit("start");
};

// When a dragging element hovers over another draggable element, this gets triggered, usually many times in a second
const onDragOver = (itemIndex: number) => {
	// console.log(321, itemIndex);
	// The index and list name of the item that is being dragged, stored in window since it can come from another list as well
	const fromIndex = window.draggingItemIndex;
	const fromList = window.draggingItemListName;
	// The new index and list name of the item that is being dragged
	const toIndex = itemIndex;
	const toList = props.name;

	// console.log(3211, fromIndex, fromList, toIndex, toList);

	// If the item hasn't changed position in the same list, don't continue
	if (fromIndex === toIndex && fromList === toList) return;

	// Update the index and list name of the dragged item
	window.draggingItemIndex = toIndex;
	window.draggingItemListName = props.name;

	// If the item comes from another list
	if (toList !== fromList) {
		// Call the remove function from the dragging element, which removes the item from the previous list and returns it
		const item = window.draggingItemOnMove(fromIndex);
		// Define a new remove function for the dragging element
		window.draggingItemOnMove = index => {
			// Deletes the remove function for the dragging element
			delete window.draggingItemOnMove;
			// Remove the item from the current list and return it
			const list = props.list.slice();
			const listItem = list.splice(index, 1)[0];
			emit("update:list", list);
			return listItem;
		};
		// Add the item to the list at the new index
		const list = props.list.slice();
		list.splice(toIndex, 0, item);
		emit("update:list", list);
	}
	// If the item is being reordered in the same list
	else {
		// Remove the item from the old position, and add the item to the new position
		const list = props.list.slice();
		list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);
		emit("update:list", list);
	}
};
// Gets called when the element that is being dragged is released
const onDragEnd = () => {
	// Emits the end event to parent component, indicating that dragging has ended
	emit("end");
};
// Gets called when an element is dropped on another element
const onDrop = () => {
	// Emits the update event to parent component, indicating that the order is now done and ordering/moving is done
	emit("update");
};

// Function that gets called for each item and returns attributes
const convertAttributes = item =>
	Object.fromEntries(
		Object.entries(props.attributes).map(([key, value]) => [
			key,
			typeof value === "function" ? value(item) : value
		])
	);
</script>

<template>
	<component
		:is="tag"
		v-for="(item, itemIndex) in list"
		:key="item[itemKey]"
		draggable="true"
		@dragstart="onDragStart(itemIndex, $event)"
		@dragenter.prevent
		@dragover.prevent="onDragOver(itemIndex)"
		@dragend="onDragEnd()"
		@drop.prevent="onDrop()"
		:data-index="itemIndex"
		:data-list="name"
		v-bind="convertAttributes(item)"
	>
		<slot name="item" :element="item"></slot>
	</component>
</template>
