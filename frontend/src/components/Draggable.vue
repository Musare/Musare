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
	class: { type: String, default: "" },
	group: { type: String, default: "" },
	disabled: { type: [Boolean, Function], default: false }
});

const mounted = ref(false);

onMounted(() => {
	mounted.value = true;
});

const emit = defineEmits(["update:list", "start", "end", "update"]);

const itemOnMove = index => {
	// Deletes the remove function for the dragging element
	delete window.draggingItem.itemOnMove;
	// Remove the item from the current list and return it
	const list = props.list.slice();
	const listItem = list.splice(index, 1)[0];
	emit("update:list", list);
	return listItem;
};

// When an element starts being dragged
const onDragStart = (itemIndex: number, event: DragEvent) => {
	const { draggable } = event.target;

	if (props.disabled === true || !draggable) {
		event.preventDefault();
		return;
	}

	// Set the effect of moving an element, which by default is clone. Not being used right now
	event.dataTransfer.dropEffect = "move";

	// Sets the dragging element index, list name and adds a remove function for when this item is moved to a different list
	window.draggingItem = {
		itemIndex,
		itemListName: props.name,
		itemGroup: props.options.group,
		itemOnMove,
		initialItemIndex: itemIndex,
		initialItemListName: props.name
	};

	// Emits the start event to the parent component, indicating that dragging has started
	emit("start");
};

// When a dragging element hovers over another draggable element, this gets triggered, usually many times in a second
const onDragOver = (itemIndex: number, event: DragEvent) => {
	const getDraggableElement = element =>
		element.classList.contains("draggable-item")
			? element
			: getDraggableElement(element.parentElement);
	const draggableElement = getDraggableElement(event.target);
	const { draggable } = draggableElement;

	if (props.disabled === true || !draggable) return;

	// The index and list name of the item that is being dragged, stored in window since it can come from another list as well
	const fromIndex = window.draggingItem.itemIndex;
	const fromList = window.draggingItem.itemListName;
	// The new index and list name of the item that is being dragged
	const toIndex = itemIndex;
	const toList = props.name;

	// If the item hasn't changed position in the same list, don't continue
	if (fromIndex === toIndex && fromList === toList) return;

	// If the dragging item isn't from the same group, don't continue
	if (window.draggingItem.itemGroup !== props.options.group) return;

	// Update the index and list name of the dragged item
	window.draggingItem.itemIndex = toIndex;
	window.draggingItem.itemListName = props.name;

	// If the item comes from another list
	if (toList !== fromList) {
		// Call the remove function from the dragging element, which removes the item from the previous list and returns it
		const item = window.draggingItem.itemOnMove(fromIndex);
		// Define a new remove function for the dragging element
		window.draggingItem.itemOnMove = itemOnMove;
		window.draggingItem.itemGroup = props.options.group;
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
	const { itemIndex, itemListName, initialItemIndex, initialItemListName } =
		window.draggingItem;
	if (itemListName === initialItemListName)
		emit("update", {
			moved: { oldIndex: initialItemIndex, newIndex: itemIndex }
		});
	else emit("update", {});
	delete window.draggingItem;
};

// Function that gets called for each item and returns attributes
const convertAttributes = item =>
	Object.fromEntries(
		Object.entries(props.attributes).map(([key, value]) => [
			key,
			typeof value === "function" ? value(item) : value
		])
	);

const hasSlotContent = (slot, slotProps = {}) => {
	if (!slot) return false;

	return slot(slotProps).some(vnode => {
		if (
			vnode.type === Comment ||
			vnode.type.toString() === "Symbol(Comment)"
		)
			return false;

		if (Array.isArray(vnode.children) && !vnode.children.length)
			return false;

		return (
			vnode.type !== Text ||
			vnode.type.toString() !== "Symbol(Text)" ||
			(typeof vnode.children === "string" && vnode.children.trim() !== "")
		);
	});
};
</script>

<template>
	<template v-for="(item, itemIndex) in list" :key="item[itemKey]">
		<component
			v-if="hasSlotContent($slots.item, { element: item })"
			:is="tag"
			:draggable="
				typeof disabled === 'function' ? !disabled(item) : !disabled
			"
			@dragstart="onDragStart(itemIndex, $event)"
			@dragenter.prevent
			@dragover.prevent="onDragOver(itemIndex, $event)"
			@dragend="onDragEnd()"
			@drop.prevent="onDrop()"
			:data-index="itemIndex"
			:data-list="name"
			class="draggable-item"
			v-bind="convertAttributes(item)"
		>
			<slot name="item" :element="item"></slot>
		</component>
	</template>
</template>

<style>
.draggable-item .is-draggable {
	cursor: move;
}
</style>
