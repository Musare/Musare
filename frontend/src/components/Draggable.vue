<script setup lang="ts">
import { PropType, Slot as SlotType, watch, onMounted, ref } from "vue";

const props = defineProps({
	itemKey: { type: String, default: "" },
	list: { type: Array as PropType<any[]>, default: () => [] },
	attributes: { type: Object, default: () => ({}) },
	tag: { type: String, default: "div" },
	class: { type: String, default: "" },
	group: { type: String, default: "" },
	disabled: { type: [Boolean, Function], default: false }
});

const listUuid = ref(
	"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, symbol => {
		let array;

		if (symbol === "y") {
			array = ["8", "9", "a", "b"];
			return array[Math.floor(Math.random() * array.length)];
		}

		array = new Uint8Array(1);
		window.crypto.getRandomValues(array);
		return (array[0] % 16).toString(16);
	})
);
const mounted = ref(false);
const data = ref([] as any[]);

watch(
	() => props.list,
	list => {
		data.value = list;
	}
);

onMounted(() => {
	data.value = props.list;
	mounted.value = true;
});

const emit = defineEmits(["update:list", "start", "end", "update"]);

const itemOnMove = (index: number) => {
	// Deletes the remove function for the dragging element
	if (window.draggingItem && window.draggingItem.itemOnMove)
		delete window.draggingItem.itemOnMove;
	// Remove the item from the current list and return it
	const listItem = data.value.splice(index, 1)[0];
	emit("update:list", data.value);
	return listItem;
};

// When an element starts being dragged
const onDragStart = (itemIndex: number, event: DragEvent) => {
	const { draggable } = event.target as HTMLElement;

	if (props.disabled === true || !draggable || !event.dataTransfer) {
		event.preventDefault();
		return;
	}

	// Set the effect of moving an element, which by default is clone. Not being used right now
	event.dataTransfer.dropEffect = "move";

	// Sets the dragging element index, list uuid and adds a remove function for when this item is moved to a different list
	window.draggingItem = {
		itemIndex,
		itemListUuid: listUuid.value,
		itemGroup: props.group,
		itemOnMove,
		initialItemIndex: itemIndex,
		initialItemListUuid: listUuid.value
	};

	// Emits the start event to the parent component, indicating that dragging has started
	emit("start");
};

// When a dragging element hovers over another draggable element, this gets triggered, usually many times in a second
const onDragOver = (itemIndex: number, event: DragEvent) => {
	const getDraggableElement = (element: any): any =>
		element.classList.contains("draggable-item")
			? element
			: getDraggableElement(element.parentElement);
	const draggableElement = getDraggableElement(event.target);
	const { draggable } = draggableElement;

	if (props.disabled === true || !draggable || !window.draggingItem) return;

	// The index and list uuid of the item that is being dragged, stored in window since it can come from another list as well
	const fromIndex = window.draggingItem.itemIndex;
	const fromList = window.draggingItem.itemListUuid;
	// The new index and list uuid of the item that is being dragged
	const toIndex = itemIndex;
	const toList = listUuid.value;

	// Don't continue if fromIndex is invalid
	if (fromIndex === -1 || toIndex === -1) return;

	// If the item hasn't changed position in the same list, don't continue
	if (fromIndex === toIndex && fromList === toList) return;

	// If the dragging item isn't from the same group, don't continue
	if (
		fromList !== toList &&
		(props.group === "" || window.draggingItem.itemGroup !== props.group)
	)
		return;

	// Update the index and list uuid of the dragged item
	window.draggingItem.itemIndex = toIndex;
	window.draggingItem.itemListUuid = listUuid.value;

	// If the item comes from another list
	if (toList !== fromList && window.draggingItem.itemOnMove) {
		// Call the remove function from the dragging element, which removes the item from the previous list and returns it
		const item = window.draggingItem.itemOnMove(fromIndex);
		// Define a new remove function for the dragging element
		window.draggingItem.itemOnMove = itemOnMove;
		window.draggingItem.itemGroup = props.group;
		// Add the item to the list at the new index
		data.value.splice(toIndex, 0, item);
		emit("update:list", data.value);
	}
	// If the item is being reordered in the same list
	else {
		// Remove the item from the old position, and add the item to the new position
		data.value.splice(toIndex, 0, data.value.splice(fromIndex, 1)[0]);
		emit("update:list", data.value);
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
	if (!window.draggingItem) return;
	const { itemIndex, itemListUuid, initialItemIndex, initialItemListUuid } =
		window.draggingItem;
	if (itemListUuid === initialItemListUuid)
		emit("update", {
			moved: {
				oldIndex: initialItemIndex,
				newIndex: itemIndex,
				updatedList: data.value
			}
		});
	else emit("update", {});
	delete window.draggingItem;
};

// Function that gets called for each item and returns attributes
const convertAttributes = (item: any) =>
	Object.fromEntries(
		Object.entries(props.attributes).map(([key, value]) => [
			key,
			typeof value === "function" ? value(item) : value
		])
	);

const hasSlotContent = (slot: SlotType | undefined, slotProps = {}) => {
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
	<template v-for="(item, itemIndex) in data" :key="item[itemKey]">
		<component
			v-if="$slots.item && hasSlotContent($slots.item, { element: item })"
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
			:data-list="listUuid"
			class="draggable-item"
			v-bind="convertAttributes(item)"
		>
			<slot name="item" :element="item" :index="itemIndex"></slot>
		</component>
	</template>
</template>

<style scoped>
.draggable-item[draggable="true"] {
	cursor: move;
}
.draggable-item:not(:last-of-type) {
	margin-bottom: 10px;
}
</style>
