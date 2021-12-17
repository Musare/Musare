<template>
	<div>
		<div
			class="table-outer-container"
			@mousemove="columnResizingMouseMove($event)"
		>
			<div class="table-header">
				<div>
					<tippy
						v-if="filters.length > 0"
						:touch="true"
						:interactive="true"
						placement="bottom"
						theme="search"
						ref="search"
						trigger="click"
					>
						<button class="button is-info">
							<i class="material-icons icon-with-button"
								>filter_list</i
							>
							Filters
						</button>

						<template #content>
							<div class="control is-grouped input-with-button">
								<p class="control select is-expanded">
									<select v-model="addFilterValue">
										<option
											v-for="type in filters"
											:key="type.name"
											:value="type"
										>
											{{ type.displayName }}
										</option>
									</select>
								</p>
								<p class="control">
									<button
										class="button material-icons is-success"
										@click="addFilterItem()"
									>
										control_point
									</button>
								</p>
							</div>
							<div
								v-for="(filter, index) in editingFilters"
								:key="`filter-${index}`"
								class="control is-grouped is-expanded"
							>
								<div class="control select">
									<select
										v-model="filter.filter"
										@change="changeFilterType(index)"
									>
										<option
											v-for="type in filters"
											:key="type.name"
											:value="type"
										>
											{{ type.displayName }}
										</option>
									</select>
								</div>
								<div class="control select">
									<select
										v-model="filter.filterType"
										:disabled="!filter.filterType"
									>
										<option
											v-for="filterType in filterTypes(
												filter.filter
											)"
											:key="filterType.name"
											:value="filterType.name"
											:selected="
												filter.filter
													.defaultFilterType ===
												filterType.name
											"
										>
											{{ filterType.displayName }}
										</option>
									</select>
								</div>
								<p class="control is-expanded">
									<input
										v-model="filter.data"
										class="input"
										type="text"
										placeholder="Search value"
										:disabled="!filter.filterType"
									/>
								</p>
								<div class="control">
									<button
										class="button material-icons is-danger"
										@click="removeFilterItem(index)"
									>
										remove_circle_outline
									</button>
								</div>
							</div>
							<div
								v-if="editingFilters.length > 1"
								class="control is-expanded is-grouped"
							>
								<label class="control label"
									>Filter operator</label
								>
								<div class="control select is-expanded">
									<select v-model="filterOperator">
										<option
											v-for="operator in filterOperators"
											:key="operator.name"
											:value="operator.name"
										>
											{{ operator.displayName }}
										</option>
									</select>
								</div>
							</div>
							<div
								class="advanced-filter-bottom"
								v-if="editingFilters.length > 0"
							>
								<div class="control is-expanded">
									<button
										class="button is-info"
										@click="applyFilterAndGetData()"
									>
										<i
											class="
												material-icons
												icon-with-button
											"
											>filter_list</i
										>
										Apply filters
									</button>
								</div>
							</div>
							<div
								class="advanced-filter-bottom"
								v-else-if="editingFilters.length === 0"
							>
								<div class="control is-expanded">
									<button
										class="button is-info"
										@click="applyFilterAndGetData()"
									>
										<i
											class="
												material-icons
												icon-with-button
											"
											>filter_list</i
										>
										Apply filters
									</button>
								</div>
							</div>
						</template>
					</tippy>
					<tippy
						v-if="appliedFilters.length > 0"
						:touch="true"
						:interactive="true"
						theme="info"
						ref="activeFilters"
					>
						<div class="filters-indicator">
							{{ appliedFilters.length }}
							<i class="material-icons" @click.prevent="true"
								>filter_list</i
							>
						</div>

						<template #content>
							<p
								v-for="(filter, index) in appliedFilters"
								:key="`filter-${index}`"
							>
								{{ filter.filter.displayName }}
								{{ filter.filterType }} "{{ filter.data }}"
								{{
									appliedFilters.length === index + 1
										? ""
										: filterOperator
								}}
							</p>
						</template>
					</tippy>
					<i
						v-else
						class="filters-indicator material-icons"
						content="No active filters"
						v-tippy="{ theme: 'info' }"
					>
						filter_list_off
					</i>
				</div>
				<div>
					<tippy
						v-if="hidableSortedColumns.length > 0"
						:touch="true"
						:interactive="true"
						placement="bottom"
						theme="dropdown"
						ref="editColumns"
						trigger="click"
					>
						<a class="button is-info" @click.prevent="true">
							<i class="material-icons icon-with-button">tune</i>
							Columns
						</a>

						<template #content>
							<draggable
								item-key="name"
								v-model="orderedColumns"
								v-bind="columnDragOptions"
								tag="div"
								draggable=".item-draggable"
								class="nav-dropdown-items"
							>
								<template #item="{ element: column }">
									<button
										v-if="
											column.name !== 'select' &&
											column.name !== 'placeholder'
										"
										:class="{
											sortable: column.sortable,
											'item-draggable': column.draggable,
											'nav-item': true
										}"
										@click.prevent="
											toggleColumnVisibility(column)
										"
									>
										<p
											class="
												control
												is-expanded
												checkbox-control
											"
										>
											<label class="switch">
												<input
													v-if="column.hidable"
													type="checkbox"
													:id="index"
													:checked="
														shownColumns.indexOf(
															column.name
														) !== -1
													"
													@click="
														toggleColumnVisibility(
															column
														)
													"
												/>
												<span
													:class="{
														slider: true,
														round: true,
														disabled:
															!column.hidable
													}"
												></span>
											</label>
											<label :for="index">
												<span></span>
												<p>{{ column.displayName }}</p>
											</label>
										</p>
									</button>
								</template>
							</draggable>
						</template>
					</tippy>
				</div>
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
									v-if="
										!(
											column.name === 'select' &&
											data.length === 0
										) &&
										shownColumns.indexOf(column.name) !== -1
									"
									:class="{
										sortable: column.sortable,
										'item-draggable': column.draggable
									}"
									:style="{
										minWidth: Number.isNaN(column.minWidth)
											? column.minWidth
											: `${column.minWidth}px`,
										width: Number.isNaN(column.width)
											? column.width
											: `${column.width}px`,
										maxWidth: Number.isNaN(column.maxWidth)
											? column.maxWidth
											: `${column.maxWidth}px`
									}"
								>
									<p
										v-if="column.name === 'select'"
										class="checkbox"
									>
										<input
											type="checkbox"
											:checked="
												data.length ===
												selectedRows.length
											"
											@click="toggleAllRows()"
										/>
									</p>
									<div v-else>
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
												class="material-icons active"
												@click="changeSort(column)"
											>
												expand_more
											</span>
											<span
												v-if="
													sort[
														column.sortProperty
													] === 'descending'
												"
												class="material-icons active"
												@click="changeSort(column)"
											>
												expand_less
											</span>
										</span>
									</div>
									<div
										class="resizer"
										v-if="column.resizable"
										@mousedown.prevent.stop="
											columnResizingMouseDown(
												column,
												$event
											)
										"
										@mouseup="columnResizingMouseUp()"
										@dblclick="columnResetWidth(column)"
									></div>
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
						>
							<td
								v-for="column in sortedFilteredColumns"
								:key="`${item._id}-${column.name}`"
							>
								<slot
									:name="`column-${column.name}`"
									:item="item"
									v-if="
										column.properties.length === 0 ||
										column.properties.every(
											property =>
												item[property] !== undefined
										)
									"
								></slot>
								<p
									class="checkbox"
									v-if="column.name === 'select'"
								>
									<input
										type="checkbox"
										:checked="item.selected"
										@click="
											toggleSelectedRow(itemIndex, $event)
										"
									/>
								</p>
								<div
									class="resizer"
									v-if="column.resizable"
									@mousedown.prevent.stop="
										columnResizingMouseDown(column, $event)
									"
									@mouseup="columnResizingMouseUp()"
									@dblclick="columnResetWidth(column)"
								></div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
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
		<div
			v-if="selectedRows.length > 0"
			class="bulk-popup"
			:style="{
				top: bulkPopup.top + 'px',
				left: bulkPopup.left + 'px'
			}"
		>
			<button
				class="button is-primary"
				:content="
					selectedRows.length === 1
						? `${selectedRows.length} row selected`
						: `${selectedRows.length} rows selected`
				"
				v-tippy
			>
				{{ selectedRows.length }}
			</button>
			<slot name="bulk-actions" :item="selectedRows" />
			<div class="right">
				<slot name="bulk-actions-right" :item="selectedRows" />
				<span
					class="material-icons drag-icon"
					@mousedown.left="onDragBox"
					@dblclick="resetBulkActionsPosition()"
				>
					drag_indicator
				</span>
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
		draggable: Boolean for whether a column can be dragged/reordered,
		resizable: Boolean for whether a column can be resized
		minWidth: Minimum width of column, e.g. 50px
		width: Width of column, e.g. 100px
		maxWidth: Maximum width of column, e.g. 150px
		*/
		columnDefault: { type: Object, default: () => {} },
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
			editingFilters: [],
			appliedFilters: [],
			filterOperator: "or",
			appliedFilterOperator: "or",
			filterOperators: [
				{
					name: "or",
					displayName: "OR"
				},
				{
					name: "and",
					displayName: "AND"
				},
				{
					name: "nor",
					displayName: "NOR"
				}
			],
			resizing: {},
			allFilterTypes: {
				contains: {
					name: "contains",
					displayName: "Contains"
				},
				exact: {
					name: "exact",
					displayName: "Exact"
				},
				regex: {
					name: "regex",
					displayName: "Regex"
				}
			},
			bulkPopup: {
				top: 0,
				left: 0,
				pos1: 0,
				pos2: 0,
				pos3: 0,
				pos4: 0
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
		selectedRows() {
			return this.data.filter(data => data.selected);
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.orderedColumns = [
			{
				name: "select",
				displayName: "",
				properties: [],
				sortable: false,
				hidable: false,
				draggable: false,
				resizable: false,
				minWidth: 47,
				defaultWidth: 47,
				maxWidth: 47
			},
			...this.columns.map(column => ({
				...this.columnDefault,
				...column
			})),
			{
				name: "placeholder",
				displayName: "",
				properties: [],
				sortable: false,
				hidable: false,
				draggable: false,
				resizable: false,
				minWidth: "auto",
				width: "auto",
				maxWidth: "auto"
			}
		];

		// A column will be shown if the defaultVisibility is set to shown, OR if the defaultVisibility is not set to shown and hidable is false
		this.shownColumns = this.orderedColumns
			.filter(column => column.defaultVisibility !== "hidden")
			.map(column => column.name);

		this.recalculateWidths();

		const pageSize = parseInt(localStorage.getItem("adminPageSize"));
		if (!Number.isNaN(pageSize)) this.pageSize = pageSize;

		this.resetBulkActionsPosition();

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
				this.appliedFilters,
				this.appliedFilterOperator,
				res => {
					console.log(111, res);
					if (res.status === "success") {
						const { data, count } = res.data;
						this.data = data;
						this.count = count;
					} else {
						new Toast(res.message);
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
		toggleColumnVisibility(column) {
			if (this.shownColumns.indexOf(column.name) !== -1) {
				if (this.shownColumns.length <= 2)
					return new Toast(
						`Unable to hide column ${column.displayName}, there must be at least 1 visibile column`
					);
				this.shownColumns.splice(
					this.shownColumns.indexOf(column.name),
					1
				);
			} else {
				this.shownColumns.push(column.name);
			}
			this.recalculateWidths();
			return this.getData();
		},
		toggleSelectedRow(itemIndex, event) {
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
			// Ctrl was pressed, so attempt to unselect all items between the clicked item and last clicked item
			else if (ctrlKey) {
				// If there is a last clicked item
				if (this.lastSelectedItemIndex >= 0) {
					// Clicked item is lower than last item, so unselect upwards until it reaches the last selected item
					if (itemIndex > this.lastSelectedItemIndex) {
						for (
							let itemIndexUp = itemIndex;
							itemIndexUp > this.lastSelectedItemIndex;
							itemIndexUp -= 1
						) {
							this.data[itemIndexUp].selected = false;
						}
					}
					// Clicked item is higher than last item, so unselect downwards until it reaches the last selected item
					else if (itemIndex < this.lastSelectedItemIndex) {
						for (
							let itemIndexDown = itemIndex;
							itemIndexDown < this.lastSelectedItemIndex;
							itemIndexDown += 1
						) {
							this.data[itemIndexDown].selected = false;
						}
					}
				}
			}
			// Neither ctrl nor shift were pressed, so toggle clicked item
			else {
				this.data[itemIndex].selected = !this.data[itemIndex].selected;
			}

			// Set the last clicked item to no longer be highlighted, if it exists
			if (this.lastSelectedItemIndex >= 0)
				this.data[this.lastSelectedItemIndex].highlighted = false;
			// Set the clicked item to be highlighted
			this.data[itemIndex].highlighted = true;
		},
		toggleAllRows() {
			if (this.data.length > this.selectedRows.length) {
				this.data = this.data.map(row => ({ ...row, selected: true }));
			} else {
				this.data = this.data.map(row => ({ ...row, selected: false }));
			}
		},
		addFilterItem() {
			this.editingFilters.push({
				data: "",
				filter: this.addFilterValue,
				filterType: this.addFilterValue.defaultFilterType
			});
		},
		removeFilterItem(index) {
			this.editingFilters.splice(index, 1);
		},
		columnResizingMouseDown(column, event) {
			this.resizing.resizing = true;
			this.resizing.resizingColumn = column;
			this.resizing.width = event.target.parentElement.offsetWidth;
			this.resizing.lastX = event.x;
		},
		columnResizingMouseMove(event) {
			if (this.resizing.resizing) {
				if (event.buttons !== 1) {
					this.resizing.resizing = false;
				}
				this.resizing.width -= this.resizing.lastX - event.x;
				this.resizing.lastX = event.x;
				if (
					this.resizing.resizingColumn.minWidth &&
					this.resizing.resizingColumn.maxWidth
				) {
					this.resizing.resizingColumn.width = Math.max(
						Math.min(
							this.resizing.resizingColumn.maxWidth,
							this.resizing.width
						),
						this.resizing.resizingColumn.minWidth
					);
				} else if (this.resizing.resizingColumn.minWidth) {
					this.resizing.resizingColumn.width = Math.max(
						this.resizing.width,
						this.resizing.resizingColumn.minWidth
					);
				} else if (this.resizing.resizingColumn.maxWidth) {
					this.resizing.resizingColumn.width = Math.min(
						this.resizing.resizingColumn.maxWidth,
						this.resizing.width
					);
				} else {
					this.resizing.resizingColumn.width = this.resizing.width;
				}
				this.resizing.width = this.resizing.resizingColumn.width;
				console.log(`New width: ${this.resizing.width}px`);
			}
		},
		columnResizingMouseUp() {
			this.resizing.resizing = false;
		},
		columnResetWidth(column) {
			const index = this.orderedColumns.indexOf(column);
			if (column.defaultWidth && !Number.isNaN(column.defaultWidth))
				this.orderedColumns[index].width = column.defaultWidth;
			else if (
				column.calculatedWidth &&
				!Number.isNaN(column.calculatedWidth)
			)
				this.orderedColumns[index].width = column.calculatedWidth;
		},
		filterTypes(filter) {
			if (!filter || !filter.filterTypes) return [];
			return filter.filterTypes.map(
				filterType => this.allFilterTypes[filterType]
			);
		},
		changeFilterType(index) {
			this.editingFilters[index].filterType =
				this.editingFilters[index].filter.defaultFilterType;
		},
		onDragBox(e) {
			const e1 = e || window.event;
			e1.preventDefault();

			this.bulkPopup.pos3 = e1.clientX;
			this.bulkPopup.pos4 = e1.clientY;

			document.onmousemove = e => {
				const e2 = e || window.event;
				e2.preventDefault();
				// calculate the new cursor position:
				this.bulkPopup.pos1 = this.bulkPopup.pos3 - e.clientX;
				this.bulkPopup.pos2 = this.bulkPopup.pos4 - e.clientY;
				this.bulkPopup.pos3 = e.clientX;
				this.bulkPopup.pos4 = e.clientY;
				// set the element's new position:
				this.bulkPopup.top -= this.bulkPopup.pos2;
				this.bulkPopup.left -= this.bulkPopup.pos1;

				if (this.bulkPopup.top < 0) this.bulkPopup.top = 0;
				if (this.bulkPopup.top > document.body.clientHeight - 50)
					this.bulkPopup.top = document.body.clientHeight - 50;
				if (this.bulkPopup.left < 0) this.bulkPopup.left = 0;
				if (this.bulkPopup.left > document.body.clientWidth - 400)
					this.bulkPopup.left = document.body.clientWidth - 400;
			};

			document.onmouseup = () => {
				document.onmouseup = null;
				document.onmousemove = null;
			};
		},
		resetBulkActionsPosition() {
			this.bulkPopup.top = document.body.clientHeight - 56;
			this.bulkPopup.left = document.body.clientWidth / 2 - 200;
		},
		applyFilterAndGetData() {
			this.appliedFilters = JSON.parse(
				JSON.stringify(this.editingFilters)
			);
			this.appliedFilterOperator = this.filterOperator;
			this.getData();
		},
		recalculateWidths() {
			let noWidthCount = 0;
			let calculatedWidth = 0;
			this.orderedColumns.forEach(column => {
				if (this.shownColumns.indexOf(column.name) !== -1)
					if (Number.isFinite(column.width)) {
						calculatedWidth += column.width;
					} else if (Number.isFinite(column.defaultWidth)) {
						calculatedWidth += column.defaultWidth;
					} else {
						noWidthCount += 1;
					}
			});
			calculatedWidth = Math.round(
				(Math.min(1880, document.body.clientWidth) - calculatedWidth) /
					(noWidthCount - 1)
			);
			this.orderedColumns = this.orderedColumns.map(column => {
				const orderedColumn = column;
				if (
					this.shownColumns.indexOf(orderedColumn.name) !== -1 &&
					!Number.isFinite(orderedColumn.width)
				) {
					if (Number.isFinite(orderedColumn.defaultWidth)) {
						orderedColumn.width = orderedColumn.defaultWidth;
					} else {
						// eslint-disable-next-line no-param-reassign
						orderedColumn.width = orderedColumn.calculatedWidth =
							Math.min(
								Math.max(
									orderedColumn.minWidth || 100,
									calculatedWidth
								),
								orderedColumn.maxWidth || 1000
							);
					}
				}
				return orderedColumn;
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table-outer-container {
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
					background-color: var(--dark-grey-4);
				}
			}

			th,
			td {
				border-color: var(--dark-grey) !important;
			}
		}

		.table-header,
		.table-footer {
			background-color: var(--dark-grey-3);
			color: var(--light-grey-2);
		}
	}
	.bulk-popup {
		border: 0;
		background-color: var(--dark-grey-2);
		color: var(--white);

		.material-icons {
			color: var(--white);
		}
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
			table-layout: fixed;

			thead {
				tr {
					th {
						height: 40px;
						line-height: 40px;
						border: 1px solid var(--light-grey-2);
						border-width: 1px 1px 1px 0;

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
								margin-left: 5px;

								&:first-child {
									margin-left: 0;
									margin-right: auto;
								}

								& > .material-icons {
									font-size: 22px;
									position: relative;
									top: 6px;
									cursor: pointer;

									&.active {
										color: var(--primary-color);
									}

									&:hover,
									&:focus {
										filter: brightness(90%);
									}
								}
							}
						}
					}
				}
			}

			tbody {
				tr {
					&.highlighted {
						background-color: var(--light-grey);
					}

					td {
						border: 1px solid var(--light-grey-2);
						border-width: 0 1px 1px 0;

						&:last-child {
							border-width: 0 0 1px;
						}
					}
				}
			}
		}

		table thead tr th,
		table tbody tr td {
			position: relative;
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;

			.resizer {
				height: 100%;
				width: 5px;
				background-color: transparent;
				cursor: col-resize;
				position: absolute;
				right: 0;
				top: 0;
			}
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

	.table-header > div {
		display: flex;
		flex-direction: row;

		> span > .button {
			margin: 5px;
		}

		.filters-indicator {
			line-height: 46px;
			display: flex;
			align-items: center;
			column-gap: 4px;
		}
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

.control.is-grouped {
	display: flex;

	& > .control {
		&.label {
			height: 36px;
			background-color: var(--white);
			border: 1px solid var(--light-grey-2);
			color: var(--dark-grey-2);
			appearance: none;
			border-radius: 3px;
			font-size: 14px;
			line-height: 34px;
			padding-left: 8px;
			padding-right: 8px;
		}
		&.select.is-expanded > select {
			width: 100%;
		}
		& > input,
		& > select,
		& > .button,
		&.label {
			border-radius: 0;
		}
		&:first-child {
			& > input,
			& > select,
			& > .button,
			&.label {
				border-radius: 5px 0 0 5px;
			}
		}
		&:last-child {
			& > input,
			& > select,
			& > .button,
			&.label {
				border-radius: 0 5px 5px 0;
			}
		}
		& > .button {
			font-size: 22px;
		}
	}
}
.advanced-filter-bottom {
	display: flex;

	.button {
		font-size: 16px !important;
		width: 100%;
	}

	.control {
		margin: 0 !important;
	}
}

.bulk-popup {
	display: flex;
	position: fixed;
	flex-direction: row;
	width: 100%;
	max-width: 400px;
	line-height: 36px;
	z-index: 5;
	border: 1px solid var(--light-grey-3);
	border-radius: 5px;
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);
	color: var(--dark-grey);
	padding: 5px;

	.right {
		display: flex;
		flex-direction: row;
		margin-left: auto;
	}

	.drag-icon {
		position: relative;
		top: 6px;
		color: var(--dark-grey);
		cursor: move;
	}
}
</style>
