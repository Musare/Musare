<template>
	<div>
		<div>
			<button
				v-for="column in orderedColumns"
				:key="column.name"
				class="button"
				@click="toggleColumnVisibility(column)"
			>
				{{
					`${
						this.enabledColumns.indexOf(column.name) !== -1
							? "Hide"
							: "Show"
					} ${column.name} column`
				}}
			</button>
		</div>
		<table class="table">
			<thead>
				<draggable
					item-key="name"
					v-model="orderedColumns"
					v-bind="columnDragOptions"
					tag="tr"
				>
					<template #item="{ element: column }">
						<th
							:class="{ sortable: column.sortable }"
							v-if="enabledColumns.indexOf(column.name) !== -1"
							@click="changeSort(column)"
						>
							{{ column.displayName }}
							<span
								v-if="
									column.sortable && sort[column.sortProperty]
								"
								>({{ sort[column.sortProperty] }})</span
							>
							<input
								v-if="column.sortable"
								placeholder="Filter"
								@click.stop
								@keyup.enter="changeFilter(column, $event)"
							/>
						</th>
					</template>
				</draggable>
			</thead>
			<tbody>
				<tr
					v-for="(item, itemIndex) in data"
					:key="item._id"
					:class="{
						selected: item.selected,
						highlighted: item.highlighted
					}"
					@click="clickItem(itemIndex, $event)"
				>
					<td
						v-for="column in sortedFilteredColumns"
						:key="`${item._id}-${column.name}`"
					>
						<slot
							:name="`column-${column.name}`"
							:item="item"
						></slot>
					</td>
				</tr>
			</tbody>
		</table>
		<br />
		<div class="control">
			<label class="label">Items per page</label>
			<p class="control select">
				<select v-model.number="pageSize" @change="getData()">
					<option value="10">10</option>
					<option value="25">25</option>
					<option value="50">50</option>
					<option value="100">100</option>
					<option value="250">250</option>
					<option value="500">500</option>
					<option value="1000">1000</option>
				</select>
			</p>
		</div>
		<br />
		<p>Page {{ page }} / {{ lastPage }}</p>
		<br />
		<button class="button is-primary" @click="changePage(page - 1)">
			Go to previous page</button
		>&nbsp;
		<button class="button is-primary" @click="changePage(page + 1)">
			Go to next page</button
		>&nbsp;
		<button class="button is-primary" @click="changePage(1)">
			Go to first page</button
		>&nbsp;
		<button class="button is-primary" @click="changePage(lastPage)">
			Go to last page
		</button>
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import draggable from "vuedraggable";

import Toast from "toasters";

import ws from "@/ws";

export default {
	components: {
		draggable
	},
	props: {
		columns: { type: Array, default: null },
		dataAction: { type: String, default: null }
	},
	data() {
		return {
			page: 1,
			pageSize: 10,
			data: [],
			count: 0, // TODO Rename
			sort: {},
			filter: {},
			orderedColumns: [],
			enabledColumns: [],
			columnDragOptions() {
				return {
					animation: 200,
					group: "columns",
					disabled: false,
					ghostClass: "draggable-list-ghost",
					filter: ".ignore-elements",
					fallbackTolerance: 50
				};
			}
		};
	},
	computed: {
		properties() {
			return Array.from(
				new Set(
					this.sortedFilteredColumns.flatMap(
						column => column.properties
					)
				)
			);
		},
		lastPage() {
			return Math.ceil(this.count / this.pageSize);
		},
		sortedFilteredColumns() {
			return this.orderedColumns.filter(
				column => this.enabledColumns.indexOf(column.name) !== -1
			);
		},
		lastSelectedItemIndex() {
			return this.data.findIndex(item => item.highlighted);
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.orderedColumns = this.columns;
		this.enabledColumns = this.columns.map(column => column.name);

		ws.onConnect(this.init);
	},
	methods: {
		init() {
			this.getData();
		},
		getData() {
			this.socket.dispatch(
				this.dataAction,
				this.page,
				this.pageSize,
				this.properties,
				this.sort,
				this.filter,
				res => {
					console.log(111, res);
					new Toast(res.message);
					if (res.status === "success") {
						const { data, count } = res.data;
						this.data = data;
						this.count = count;
					}
				}
			);
		},
		changePage(page) {
			if (page < 1) return;
			if (page > this.lastPage) return;
			if (page === this.page) return;
			this.page = page;
			this.getData();
		},
		changeSort(column) {
			if (column.sortable) {
				const { sortProperty } = column;
				if (this.sort[sortProperty] === undefined)
					this.sort[sortProperty] = "ascending";
				else if (this.sort[sortProperty] === "ascending")
					this.sort[sortProperty] = "descending";
				else if (this.sort[sortProperty] === "descending")
					delete this.sort[sortProperty];
				this.getData();
			}
		},
		changeFilter(column, event) {
			if (column.filterable) {
				const { value } = event.target;
				const { filterProperty } = column;
				if (this.filter[filterProperty] !== undefined && value === "") {
					delete this.filter[filterProperty];
				} else if (this.filter[filterProperty] !== value) {
					this.filter[filterProperty] = value;
				} else return;
				this.getData();
			}
		},
		toggleColumnVisibility(column) {
			if (this.enabledColumns.indexOf(column.name) !== -1) {
				this.enabledColumns.splice(
					this.enabledColumns.indexOf(column.name),
					1
				);
			} else {
				this.enabledColumns.push(column.name);
			}
			this.getData();
		},
		clickItem(itemIndex, event) {
			const { shiftKey, ctrlKey } = event;
			// Shift was pressed, so attempt to select all items between the clicked item and last clicked item
			if (shiftKey) {
				// If there is a last clicked item
				if (this.lastSelectedItemIndex >= 0) {
					// Clicked item is lower than last item, so select upwards until it reaches the last selected item
					if (itemIndex > this.lastSelectedItemIndex) {
						for (
							let itemIndexUp = itemIndex;
							itemIndexUp > this.lastSelectedItemIndex;
							itemIndexUp -= 1
						) {
							this.data[itemIndexUp].selected = true;
						}
					}
					// Clicked item is higher than last item, so select downwards until it reaches the last selected item
					else if (itemIndex < this.lastSelectedItemIndex) {
						for (
							let itemIndexDown = itemIndex;
							itemIndexDown < this.lastSelectedItemIndex;
							itemIndexDown += 1
						) {
							this.data[itemIndexDown].selected = true;
						}
					}
				}
			}
			// Ctrl was pressed, so toggle selected on the clicked item
			else if (ctrlKey) {
				this.data[itemIndex].selected = !this.data[itemIndex].selected;
			}
			// Neither ctrl nor shift were pressed, so unselect all items and set the clicked item to selected
			else {
				this.data = this.data.map(item => ({
					...item,
					selected: false
				}));
				this.data[itemIndex].selected = true;
			}

			// Set the last clicked item to no longer be highlighted, if it exists
			if (this.lastSelectedItemIndex >= 0)
				this.data[this.lastSelectedItemIndex].highlighted = false;
			// Set the clicked item to be highlighted
			this.data[itemIndex].highlighted = true;
		}
	}
};
</script>

<style lang="scss" scoped>
.table {
	thead {
		tr {
			th {
				&.sortable {
					cursor: pointer;
				}
			}
		}
	}

	tbody {
		tr {
			&.selected {
				outline: 1px solid red;
			}

			&.highlighted {
				outline: 1px solid blue;
			}

			&.selected.highlighted {
				outline: 1px solid green;
			}
		}
	}
}
</style>
