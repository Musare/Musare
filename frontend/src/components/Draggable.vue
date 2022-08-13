<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */
import { onMounted, ref } from "vue";

const props = defineProps({
	name: { type: String, default: "" },
	itemKey: { type: String, default: "" },
	list: { type: Array, default: () => [] },
	componentData: { type: Object, default: () => ({}) },
	options: { type: Object, default: () => ({}) }
});

const mounted = ref(false);

onMounted(() => {
	mounted.value = true;
});

const emit = defineEmits(["start", "end", "update"]);

// When an element starts being dragged
const onDragStart = (itemIndex, event) => {
	// Set the effect of moving an element, which by default is clone. Not being used right now
	event.dataTransfer.dropEffect = "move";

	// Sets the dragging element index, list name and adds a remove function for when this item is moved to a different list
	window.draggingItemIndex = itemIndex;
	window.draggingItemListName = props.name;
	window.draggingItemOnMove = index => {
		window.draggingItemOnMove = null;
		return props.list.splice(index, 1)[0];
	};

	// Emits the start event to the parent component, indicating that dragging has started
	emit("start");
};

// When a dragging element hovers over another draggable element, this gets triggered, usually many times in a second
const onDragOver = itemIndex => {
	// The index and list name of the item that is being dragged, stored in window since it can come from another list as well
	const fromIndex = window.draggingItemIndex;
	const fromList = window.draggingItemList;
	// The new index and list name of the item that is being dragged
	const toIndex = itemIndex;
	const toList = props.name;

	// If the item hasn't changed position in the same list, don't continue
	if (fromIndex === toIndex && fromList === toList) return;

	// Update the index and list name of the dragged item
	window.draggingItemIndex = toIndex;
	window.draggingItemList = props.name;

	// If the item comes from another list
	if (toList !== fromList) {
		// Call the remove function from the dragging element, which removes the item from the previous list and returns it
		const item = window.draggingItemOnMove(fromIndex);
		// Define a new remove function for the dragging element
		window.draggingItemOnMove = index => {
			// Deletes the remove function for the dragging element
			window.draggingItemOnMove = null;
			// Remove the item from the current list and return it
			return props.list.splice(index, 1)[0];
		};
		// Add the item to the list at the new index
		props.list.splice(toIndex, 0, item);
	}
	// If the item is being reordered in the same list
	else {
		// Remove the item from the old position, and add the item to the new position
		props.list.splice(toIndex, 0, props.list.splice(fromIndex, 1)[0]);
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
</script>

<template>
	<div
		v-for="n in list.length"
		:key="`${name}-${n - 1}`"
		:id="`${name}-${n - 1}`"
	></div>

	<template v-if="mounted">
		<div v-for="(item, itemIndex) in list" :key="item[itemKey]">
			<Teleport :to="`#${name}-${itemIndex}`">
				<div
					draggable="true"
					@dragstart="onDragStart(itemIndex, $event)"
					@dragenter.prevent
					@dragover.prevent="onDragOver(itemIndex)"
					@dragend="onDragEnd()"
					@drop.prevent="onDrop()"
					:data-index="itemIndex"
					:data-list="name"
				>
					<slot name="item" :element="item"></slot>
				</div>
			</Teleport>
		</div>
	</template>
</template>
