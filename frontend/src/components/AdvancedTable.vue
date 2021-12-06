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
				<div class="table-header">
					<div class="table-buttons">
						<tippy
							:touch="true"
							:interactive="true"
							placement="bottom"
							theme="search"
							ref="search"
							trigger="click"
						>
							<a class="button is-info" @click.prevent="true">
								<i class="material-icons icon-with-button"
									>search</i
								>
								Search
							</a>

							<template #content>
								<div
									v-for="(query, index) in advancedQuery"
									:key="`query-${index}`"
									class="advanced-query"
								>
									<div class="control select">
										<select v-model="query.filter">
											<option
												v-for="f in filters"
												:key="f.name"
												:value="f"
											>
												{{ f.displayName }}
											</option>
										</select>
									</div>
									<p class="control is-expanded">
										<input
											v-if="query.filter.type === 'regex'"
											v-model="query.regex"
											class="input"
											type="text"
											placeholder="Search value"
											@keyup.enter="changeFilter()"
										/>
									</p>
									<div class="control">
										<button
											class="
												button
												material-icons
												is-success
											"
											@click="addQueryItem()"
										>
											control_point
										</button>
									</div>
									<div
										v-if="advancedQuery.length > 1"
										class="control"
									>
										<button
											class="
												button
												material-icons
												is-danger
											"
											@click="removeQueryItem(index)"
										>
											remove_circle_outline
										</button>
									</div>
								</div>
								<a
									class="button is-info"
									@click="changeFilter()"
								>
									<i class="material-icons icon-with-button"
										>search</i
									>
									Search
								</a>
							</template>
						</tippy>
					</div>
				</div>
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
									<div>
										<span>
											{{ column.displayName }}
										</span>
										<span
											v-if="column.sortable"
											:content="`Sort by ${column.displayName}`"
											v-tippy
										>
											<span
												v-if="
													!sort[column.sortProperty]
												"
												class="material-icons"
												@click="changeSort(column)"
											>
												unfold_more
											</span>
											<span
												v-if="
													sort[
														column.sortProperty
													] === 'ascending'
												"
												class="material-icons"
												@click="changeSort(column)"
											>
												expand_less
											</span>
											<span
												v-if="
													sort[
														column.sortProperty
													] === 'descending'
												"
												class="material-icons"
												@click="changeSort(column)"
											>
												expand_more
											</span>
										</span>
									</div>
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
				<div class="table-footer">
					<div class="page-controls">
						<button
							:class="{ disabled: page === 1 }"
							class="button is-primary material-icons"
							:disabled="page === 1"
							@click="changePage(1)"
							content="First Page"
							v-tippy
						>
							skip_previous
						</button>
						<button
							:class="{ disabled: page === 1 }"
							class="button is-primary material-icons"
							:disabled="page === 1"
							@click="changePage(page - 1)"
							content="Previous Page"
							v-tippy
						>
							fast_rewind
						</button>

						<p>Page {{ page }} / {{ lastPage }}</p>

						<button
							:class="{ disabled: page === lastPage }"
							class="button is-primary material-icons"
							:disabled="page === lastPage"
							@click="changePage(page + 1)"
							content="Next Page"
							v-tippy
						>
							fast_forward
						</button>
						<button
							:class="{ disabled: page === lastPage }"
							class="button is-primary material-icons"
							:disabled="page === lastPage"
							@click="changePage(lastPage)"
							content="Last Page"
							v-tippy
						>
							skip_next
						</button>
					</div>
					<div class="page-size">
						<div class="control">
							<label class="label">Items per page</label>
							<p class="control select">
								<select
									v-model.number="pageSize"
									@change="changePageSize()"
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
		hidable: Boolean for whether a column can be hidden
		defaultVisibility: Default visibility for a column, either "shown" or "hidden"
		draggable: Boolean for whether a column can be dragged/reordered
		minWidth: Minimum width of column, e.g. 50px
		width: Width of column, e.g. 100px
		maxWidth: Maximum width of column, e.g. 150px
		*/
		columns: { type: Array, default: null },
		filters: { type: Array, default: null },
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
			},
			advancedQuery: [
				{
					regex: "",
					filter: {}
				}
			]
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

		const pageSize = parseInt(localStorage.getItem("adminPageSize"));
		if (!Number.isNaN(pageSize)) this.pageSize = pageSize;

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
		changePageSize() {
			this.getData();
			localStorage.setItem("adminPageSize", this.pageSize);
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
		changeFilter() {
			this.advancedQuery.forEach(query => {
				const { regex } = query;
				const { name } = query.filter;
				if (this.filter[name] !== undefined && regex === "") {
					delete this.filter[name];
				} else if (this.filter[name] !== regex) {
					this.filter[name] = regex;
				}
			});
			this.getData();
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
		},
		addQueryItem() {
			this.advancedQuery.push({
				regex: "",
				filter: {}
			});
		},
		removeQueryItem(index) {
			this.advancedQuery.splice(index, 1);
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

	.table-header,
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
						height: 40px;
						line-height: 40px;
						border: 1px solid var(--light-grey-2);
						border-width: 1px 1px 1px 0;

						&:first-child,
						&:last-child {
							border-width: 1px 0 1px;
						}

						&.sortable {
							cursor: pointer;
						}

						& > div {
							display: flex;
							white-space: nowrap;

							& > span {
								& > .material-icons {
									font-size: 22px;
									position: relative;
									top: 6px;
									cursor: pointer;
								}

								&:first-child {
									margin-right: auto;
								}
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

					td {
						border: 1px solid var(--light-grey-2);
						border-width: 0 1px 1px 0;

						&:first-child,
						&:last-child {
							border-width: 0 0 1px;
						}
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

	.table-header,
	.table-footer {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-between;
		line-height: 36px;
		background-color: var(--white);
	}

	.table-header .table-buttons > span > .button {
		margin: 5px;
	}

	.table-footer {
		.page-controls,
		.page-size > .control {
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

.advanced-query {
	display: flex;
	margin-bottom: 5px;

	& > .control {
		& > input,
		& > select,
		& > .button {
			border-radius: 0;
		}
		&:first-child {
			& > input,
			& > select,
			& > .button {
				border-radius: 5px 0 0 5px;
			}
		}
		&:last-child {
			& > input,
			& > select,
			& > .button {
				border-radius: 0 5px 5px 0;
			}
		}
		& > .button {
			font-size: 22px;
		}
	}
}
</style>
