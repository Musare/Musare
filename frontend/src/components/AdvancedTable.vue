<template>
	<div>
		<div>
			<button
				v-for="column in orderedColumns.filter(
					c => c.name !== 'select'
				)"
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
		<div class="table-container">
			<table class="table">
				<thead>
					<draggable
						item-key="name"
						v-model="orderedColumns"
						v-bind="columnDragOptions"
						tag="tr"
						draggable=".item-draggable"
					>
						<template #item="{ element: column }">
							<th
								:class="{
									sortable: column.sortable,
									'item-draggable': column.name !== 'select'
								}"
								v-if="
									enabledColumns.indexOf(column.name) !== -1
								"
								@click="changeSort(column)"
							>
								{{ column.displayName }}
								<span
									v-if="
										column.sortable &&
										sort[column.sortProperty]
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
		</div>
		<div class="row control">
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
		<div class="row">
			<button
				v-if="page > 1"
				class="button is-primary material-icons"
				@click="changePage(1)"
				content="First Page"
				v-tippy
			>
				skip_previous
			</button>
			<button
				v-if="page > 1"
				class="button is-primary material-icons"
				@click="changePage(page - 1)"
				content="Previous Page"
				v-tippy
			>
				fast_rewind
			</button>

			<p>Page {{ page }} / {{ lastPage }}</p>

			<button
				v-if="page < lastPage"
				class="button is-primary material-icons"
				@click="changePage(page + 1)"
				content="Next Page"
				v-tippy
			>
				fast_forward
			</button>
			<button
				v-if="page < lastPage"
				class="button is-primary material-icons"
				@click="changePage(lastPage)"
				content="Last Page"
				v-tippy
			>
				skip_next
			</button>
		</div>
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
		const columns = [
			{
				name: "select",
				displayName: "",
				properties: [],
				sortable: false,
				filterable: false
			},
			...this.columns
		];
		this.orderedColumns = columns;
		this.enabledColumns = columns.map(column => column.name);

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
.night-mode {
	.table {
		background-color: var(--dark-grey-3);
		color: var(--light-grey-2);

		tr {
			&:nth-child(even) {
				background-color: var(--dark-grey-2);
			}

			&:hover,
			&:focus,
			&.highlighted {
				background-color: var(--dark-grey);
			}
		}
	}
}

.table-container {
	border-radius: 5px;
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
	overflow-x: auto;
	margin: 10px 0;

	table {
		border-collapse: separate;

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
				&.selected td:first-child {
					border-left: 5px solid var(--primary-color);
					padding-left: 0;
				}

				&.highlighted {
					background-color: var(--light-grey);

					td:first-child {
						border-left: 5px solid var(--red);
						padding-left: 0;
					}
				}

				&.selected.highlighted td:first-child {
					border-left: 5px solid var(--green);
					padding-left: 0;
				}
			}
		}
	}

	table thead tr th:first-child,
	table tbody tr td:first-child {
		position: sticky;
		left: 0;
		z-index: 2;
		padding: 0;
		padding-left: 5px;
	}
}

.row {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	margin: 10px;

	button {
		font-size: 22px;
		margin: auto 5px;
	}

	p,
	label {
		font-size: 18px;
		margin: auto 5px;
	}
}
</style>
