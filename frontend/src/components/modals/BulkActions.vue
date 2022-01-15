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
					<input
						v-model="itemInput"
						class="input"
						type="text"
						:placeholder="`Enter ${type.name} to ${method}`"
						autocomplete="off"
						@keypress.enter="addItem()"
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
						class="tag"
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

import Modal from "../Modal.vue";

export default {
	components: { Modal },
	props: {
		type: {
			type: Object,
			default: () => {}
		}
	},
	data() {
		return {
			method: "add",
			items: [],
			itemInput: null
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	beforeUnmount() {
		this.itemInput = null;
		this.items = [];
	},
	methods: {
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
			this.socket.dispatch(
				this.type.action,
				this.method,
				this.items,
				this.type.items,
				res => {
					new Toast(res.message);
					this.closeModal("bulkActions");
				}
			);
		},
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
.label {
	text-transform: capitalize;
}

.select.is-expanded select {
	width: 100%;
}

.tag {
	display: inline-flex;
	margin: 5px;
	padding: 5px 10px;
	font-size: 14px;
	font-weight: 600;
	border-radius: 5px;
	background-color: var(--primary-color);
	color: var(--white);
	transition: all 0.2s ease-in-out;

	&:hover,
	&:focus {
		filter: brightness(90%);
		transition: all 0.2s ease-in-out;
	}

	.remove-item {
		font-size: 16px;
		margin: auto 2px auto 5px;
		cursor: pointer;
	}
}
</style>
