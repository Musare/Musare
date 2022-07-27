<script setup lang="ts">
import { useStore } from "vuex";
import { ref, defineAsyncComponent, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalState } from "@/vuex_helpers";
import ws from "@/ws";

const AutoSuggest = defineAsyncComponent(
	() => import("@/components/AutoSuggest.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");
const setJob = payload => store.dispatch("longJobs/setJob", payload);

const { socket } = useWebsocketsStore();

const { type } = useModalState("modals/bulkActions/MODAL_UUID", {
	modalUuid: props.modalUuid
});

const method = ref("add");
const items = ref([]);
const itemInput = ref();
const allItems = ref([]);

const init = () => {
	if (type.autosuggest && type.autosuggestDataAction)
		socket.dispatch(type.autosuggestDataAction, res => {
			if (res.status === "success") {
				const { items } = res.data;
				allItems.value = items;
			} else {
				new Toast(res.message);
			}
		});
};

const addItem = () => {
	if (!itemInput.value) return;
	if (type.regex && !type.regex.test(itemInput.value)) {
		new Toast(`Invalid ${type.name} format.`);
	} else if (items.value.includes(itemInput.value)) {
		new Toast(`Duplicate ${type.name} specified.`);
	} else {
		items.value.push(itemInput.value);
		itemInput.value = null;
	}
};

const removeItem = index => {
	items.value.splice(index, 1);
};

const applyChanges = () => {
	let id;
	let title;

	socket.dispatch(type.action, method.value, items.value, type.items, {
		cb: () => {},
		onProgress: res => {
			if (res.status === "started") {
				id = res.id;
				title = res.title;
				closeCurrentModal();
			}

			if (id)
				setJob({
					id,
					name: title,
					...res
				});
		}
	});
};

onBeforeUnmount(() => {
	itemInput.value = null;
	items.value = [];
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "bulkActions", props.modalUuid]);
});

onMounted(() => {
	ws.onConnect(init);
});
</script>

<template>
	<div>
		<modal title="Bulk Actions" class="bulk-actions-modal" size="slim">
			<template #body>
				<label class="label">Method</label>
				<div class="control is-expanded select">
					<select v-model="method">
						<option value="add">Add</option>
						<option value="remove">Remove</option>
						<option value="replace">Replace</option>
					</select>
				</div>

				<label class="label">{{ type.name.slice(0, -1) }}</label>
				<div class="control is-grouped input-with-button">
					<auto-suggest
						v-model="itemInput"
						:placeholder="`Enter ${type.name} to ${method}`"
						:all-items="allItems"
						@submitted="addItem()"
					/>
					<p class="control">
						<button
							class="button is-primary material-icons"
							@click="addItem()"
						>
							add
						</button>
					</p>
				</div>

				<label class="label"
					>{{ type.name }} to be
					{{ method === "add" ? `added` : `${method}d` }}</label
				>
				<div v-if="items.length > 0">
					<div
						v-for="(item, index) in items"
						:key="`item-${item}`"
						class="pill"
					>
						{{ item }}
						<span
							class="material-icons remove-item"
							@click="removeItem(index)"
							content="Remove item"
							v-tippy
							>highlight_off</span
						>
					</div>
				</div>
				<p v-else>No {{ type.name }} specified</p>
			</template>
			<template #footer>
				<button
					class="button is-primary"
					:disabled="items.length === 0"
					@click="applyChanges()"
				>
					Apply Changes
				</button>
			</template>
		</modal>
	</div>
</template>

<style lang="less" scoped>
.label {
	text-transform: capitalize;
}

.control.input-with-button > div {
	flex: 1;
}

.pill {
	display: inline-flex;

	.remove-item {
		font-size: 16px;
		margin: auto 2px auto 5px;
		cursor: pointer;
	}
}

:deep(.autosuggest-container) {
	width: calc(100% - 40px);
	top: unset;
}
</style>
