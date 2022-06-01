<template>
	<div>
		<modal title="Bulk Actions" class="bulk-actions-modal">
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

<script>
import { mapGetters, mapActions } from "vuex";

import Toast from "toasters";

import AutoSuggest from "@/components/AutoSuggest.vue";

import ws from "@/ws";
import { mapModalState } from "@/vuex_helpers";

export default {
	components: { AutoSuggest },
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {
			method: "add",
			items: [],
			itemInput: null,
			allItems: []
		};
	},
	computed: {
		...mapModalState("modals/bulkActions/MODAL_UUID", {
			type: state => state.type
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	beforeUnmount() {
		this.itemInput = null;
		this.items = [];
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule(["modals", "bulkActions", this.modalUuid]);
	},
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			if (this.type.autosuggest && this.type.autosuggestDataAction)
				this.socket.dispatch(this.type.autosuggestDataAction, res => {
					if (res.status === "success") {
						const { items } = res.data;
						this.allItems = items;
					} else {
						new Toast(res.message);
					}
				});
		},
		addItem() {
			if (!this.itemInput) return;
			if (this.type.regex && !this.type.regex.test(this.itemInput)) {
				new Toast(`Invalid ${this.type.name} format.`);
			} else if (this.items.includes(this.itemInput)) {
				new Toast(`Duplicate ${this.type.name} specified.`);
			} else {
				this.items.push(this.itemInput);
				this.itemInput = null;
			}
		},
		removeItem(index) {
			this.items.splice(index, 1);
		},
		applyChanges() {
			let toast;

			this.socket.dispatch(
				this.type.action,
				this.method,
				this.items,
				this.type.items,
				{
					cb: () => {
						// new Toast(res.message);
						// if (res.status === "success")
						// 	this.closeModal("bulkActions");
					},
					onProgress: res => {
						if (!toast) {
							toast = new Toast({
								content: res.message,
								persistent: true,
								interactable: false
							});
						} else {
							toast.content = res.message;
						}
						if (
							res.status === "success" ||
							res.status === "error"
						) {
							setTimeout(() => {
								toast.destroy();
							}, 4000);
						}
					}
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

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
