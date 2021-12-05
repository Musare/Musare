<template>
	<div>
		<div>
			<button
				v-for="column in hidableSortedColumns"
				:key="column.name"
				class="button"
				@click="toggleColumnVisibility(column)"
			>
				{{
					`${
						this.shownColumns.indexOf(column.name) !== -1
							? "Hide"
							: "Show"
					} ${column.name} column`
				}}
			</button>
		</div>
		<div class="table-outer-container">
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
										'item-draggable': column.draggable
									}"
									:style="{
										minWidth: column.minWidth,
										width: column.width,
										maxWidth: column.maxWidth
									}"
									v-if="
										shownColumns.indexOf(column.name) !== -1
									"
								>
									<span @click="changeSort(column)">
										{{ column.displayName }}
										<span
											v-if="
												column.sortable &&
												sort[column.sortProperty]
											"
											>({{
												sort[column.sortProperty]
											}})</span
										>
									</span>
									<tippy
										v-if="column.sortable"
										:touch="true"
										:interactive="true"
										placement="bottom"
										theme="search"
										ref="search"
										trigger="click"
									>
										<i
											class="
												material-icons
												action-dropdown-icon
											"
											:content="`Filter by ${column.displayName}`"
											v-tippy
											@click.prevent="true"
											>search</i
										>

										<template #content>
											<div
												class="
													control
													is-grouped
													input-with-button
												"
											>
												<p class="control is-expanded">
													<input
														class="input"
														type="text"
														:placeholder="`Filter by ${column.displayName}`"
														:value="
															column.filterProperty !==
															null
																? filter[
																		column
																			.filterProperty
																  ]
																: ''
														"
														@keyup.enter="
															changeFilter(
																column,
																$event
															)
														"
													/>
												</p>
												<p class="control">
													<a class="button is-info">
														<i
															class="
																material-icons
																icon-with-button
															"
															>search</i
														>
													</a>
												</p>
											</div>
										</template>
									</tippy>
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
									v-if="
										column.properties.every(
											property =>
												item[property] !== undefined
										)
									"
								></slot>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div class="table-footer">
				<div>
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
				<div>
					<div class="control">
						<label class="label">Items per page</label>
						<p class="control select">
							<select
								v-model.number="pageSize"
								@change="getData()"
							>
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
				</div>
			</div>
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
		/*
		Column properties:
		name: Unique lowercase name
		displayName: Nice name for the column header
		properties: The properties this column needs to show data
		sortable: Boolean for whether the order of a particular column can be changed 
		sortProperty: The property the backend will sort on if this column gets sorted, e.g. title
		filterable: Boolean for whether or not a column can use a filter
		filterProperty: The property the backend will filter on, e.g. title
		hidable: Boolean for whether a column can be hidden
		defaultVisibility: Default visibility for a column, either "shown" or "hidden"
		draggable: Boolean for whether a column can be dragged/reordered
		minWidth: Minimum width of column, e.g. 50px
		width: Width of column, e.g. 100px
		maxWidth: Maximum width of column, e.g. 150px
		*/
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
			shownColumns: [],
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
				column => this.shownColumns.indexOf(column.name) !== -1
			);
		},
		hidableSortedColumns() {
			return this.orderedColumns.filter(column => column.hidable);
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
				filterable: false,
				hidable: false,
				draggable: false
			},
			...this.columns
		];
		this.orderedColumns = columns;
		// A column will be shown if the defaultVisibility is set to shown, OR if the defaultVisibility is not set to shown and hidable is false
		this.shownColumns = columns
			.filter(column => column.defaultVisibility !== "hidden")
			.map(column => column.name);

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
			if (this.shownColumns.indexOf(column.name) !== -1) {
				this.shownColumns.splice(
					this.shownColumns.indexOf(column.name),
					1
				);
			} else {
				this.shownColumns.push(column.name);
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
.night-mode .table-outer-container {
	.table-container .table {
		&,
		thead th {
			background-color: var(--dark-grey-3);
			color: var(--light-grey-2);
		}

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

	.table-footer {
		background-color: var(--dark-grey-3);
		color: var(--light-grey-2);
	}
}

.table-outer-container {
	border-radius: 5px;
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
	margin: 10px 0;
	overflow: hidden;

	.table-container {
		overflow-x: auto;

		table {
			border-collapse: separate;

			thead {
				tr {
					th {
						white-space: nowrap;

						&.sortable {
							cursor: pointer;
						}

						span > .material-icons {
							font-size: 22px;
							position: relative;
							top: 6px;

							&:first-child {
								margin-left: auto;
							}
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

	.table-footer {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		line-height: 36px;
		background-color: var(--white);

		& > div:first-child,
		div .control {
			display: flex;
			flex-direction: row;
			margin-bottom: 0 !important;

			button {
				margin: 5px;
				font-size: 20px;
			}
			p,
			label {
				margin: 5px;
				font-size: 14px;
				font-weight: 600;
			}
			&.select::after {
				top: 18px;
			}
		}
	}
}
</style>
