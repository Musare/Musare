<template>
	<div>
		<div
			class="table-outer-container"
			@mousemove="columnResizing($event)"
			@touchmove="columnResizing($event)"
		>
			<div class="table-header">
				<div>
					<tippy
						v-if="filters.length > 0"
						:touch="true"
						:interactive="true"
						placement="bottom-start"
						theme="search"
						ref="search"
						trigger="click"
						@show="
							() => {
								showFiltersDropdown = true;
							}
						"
						@hide="
							() => {
								showFiltersDropdown = false;
							}
						"
					>
						<div class="control has-addons" ref="trigger">
							<button class="button is-primary">
								<i class="material-icons icon-with-button"
									>filter_list</i
								>
								Filters
							</button>
							<button class="button">
								<i class="material-icons">
									{{
										showFiltersDropdown
											? "expand_more"
											: "expand_less"
									}}
								</i>
							</button>
						</div>

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
										:disabled="!addFilterValue"
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
								class="
									advanced-filter
									control
									is-grouped is-expanded
								"
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
											:value="filterType"
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
								<div
									v-if="
										filter.filterType.name &&
										(filter.filterType.name === 'exact' ||
											filter.filterType.name ===
												'boolean') &&
										filter.filter.dropdown
									"
									class="control is-expanded select"
								>
									<select
										v-model="filter.data"
										:disabled="!filter.filterType"
									>
										<option
											v-for="[
												dropdownValue,
												dropdownDisplay
											] in filter.filter.dropdown"
											:key="dropdownValue"
											:value="dropdownValue"
										>
											{{ dropdownDisplay }}
										</option>
									</select>
								</div>
								<div
									v-else-if="
										filter.filterType.name &&
										filter.filterType.name === 'boolean'
									"
									class="control is-expanded select"
								>
									<select
										v-model="filter.data"
										:disabled="!filter.filterType"
									>
										<option :value="true">true</option>
										<option :value="false">false</option>
									</select>
								</div>
								<div v-else class="control is-expanded">
									<input
										v-if="
											filter.filterType.name &&
											filter.filterType.name.startsWith(
												'datetime'
											)
										"
										v-model="filter.data"
										class="input"
										type="datetime-local"
									/>
									<input
										v-else-if="
											filter.filterType.name &&
											filter.filterType.name.startsWith(
												'number'
											)
										"
										v-model="filter.data"
										class="input"
										type="number"
										:disabled="!filter.filterType"
										@keydown.enter="applyFilterAndGetData()"
									/>
									<auto-suggest
										v-else
										v-model="filter.data"
										placeholder="Search value"
										:disabled="!filter.filterType"
										:all-items="
											autosuggest.allItems[
												filter.filter.name
											]
										"
										@submitted="applyFilterAndGetData()"
									/>
								</div>
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
								v-if="editingFilters.length > 0"
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
								{{
									appliedFilters.length === 1 &&
									appliedFilterOperator === "nor"
										? "not"
										: ""
								}}
								{{
									filter.filterType.displayName.toLowerCase()
								}}
								"{{ filter.data }}"
								{{
									appliedFilters.length === index + 1
										? ""
										: appliedFilterOperator
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
						placement="bottom-end"
						theme="dropdown"
						ref="editColumns"
						trigger="click"
						@show="
							() => {
								showColumnsDropdown = true;
							}
						"
						@hide="
							() => {
								showColumnsDropdown = false;
							}
						"
					>
						<div class="control has-addons" ref="trigger">
							<button class="button is-primary">
								<i class="material-icons icon-with-button"
									>tune</i
								>
								Columns
							</button>
							<button class="button">
								<i class="material-icons">
									{{
										showColumnsDropdown
											? "expand_more"
											: "expand_less"
									}}
								</i>
							</button>
						</div>

						<template #content>
							<draggable
								item-key="name"
								v-model="orderedColumns"
								v-bind="columnDragOptions"
								tag="div"
								draggable=".item-draggable"
								class="nav-dropdown-items"
								@change="columnOrderChanged"
							>
								<template #item="{ element: column }">
									<button
										v-if="
											column.name !== 'select' &&
											column.name !== 'placeholder' &&
											column.name !== 'updatedPlaceholder'
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
				<table
					:class="{
						table: true,
						'has-checkboxes': hasCheckboxes
					}"
				>
					<thead>
						<draggable
							item-key="name"
							v-model="orderedColumns"
							v-bind="columnDragOptions"
							tag="tr"
							handle=".handle"
							draggable=".item-draggable"
							@change="columnOrderChanged"
						>
							<template #item="{ element: column }">
								<th
									v-if="
										shownColumns.indexOf(column.name) !==
											-1 &&
										(column.name !== 'updatedPlaceholder' ||
											rows.length > 0)
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
									<div v-if="column.name === 'select'">
										<p class="checkbox">
											<input
												v-if="rows.length === 0"
												type="checkbox"
												disabled
											/>
											<input
												v-else
												type="checkbox"
												:checked="
													rows.filter(
														row => !row.removed
													).length ===
													selectedRows.length
												"
												@click="toggleAllRows()"
											/>
										</p>
									</div>
									<div v-else class="handle">
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
											columnResizingStart(column, $event)
										"
										@touchstart.prevent.stop="
											columnResizingStart(column, $event)
										"
										@mouseup="columnResizingStop()"
										@touchend="columnResizingStop()"
										@dblclick="columnResetWidth(column)"
									></div>
								</th>
							</template>
						</draggable>
					</thead>
					<tbody>
						<tr
							v-for="(item, itemIndex) in rows"
							:key="item._id"
							:class="{
								selected: item.selected,
								highlighted: item.highlighted,
								updated: item.updated,
								removed: item.removed
							}"
							:ref="`row-${itemIndex}`"
							tabindex="0"
							@blur="unhighlightRow(itemIndex)"
							@keydown.up.prevent
							@keydown.down.prevent
							@keydown.space.prevent
							@click="highlightRow(itemIndex)"
							@keyup.up.exact="highlightUp(itemIndex)"
							@keyup.down.exact="highlightDown(itemIndex)"
							@keyup.shift.up.exact="selectUp(itemIndex)"
							@keyup.shift.down.exact="selectDown(itemIndex)"
							@keyup.ctrl.up.exact="unselectUp(itemIndex)"
							@keyup.ctrl.down.exact="unselectDown(itemIndex)"
							@keyup.space.exact="
								toggleSelectedRow(itemIndex, {})
							"
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
												property
													.split('.')
													.reduce(
														(previous, current) =>
															previous &&
															previous[
																current
															] !== null &&
															previous[
																current
															] !== undefined
																? previous[
																		current
																  ]
																: null,
														item
													) !== null
										)
									"
								></slot>
								<div
									v-if="
										column.name === 'updatedPlaceholder' &&
										item.updated
									"
									class="updated-tooltip"
									content="Row updated"
									v-tippy="{
										theme: 'info',
										placement: 'right'
									}"
								></div>
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
										:disabled="item.removed"
									/>
								</p>
								<span
									v-if="item.removed"
									class="removed-overlay"
									content="Item removed"
									v-tippy="{ theme: 'info' }"
								></span>
								<div
									class="resizer"
									v-if="column.resizable"
									@mousedown.prevent.stop="
										columnResizingStart(column, $event)
									"
									@touchstart.prevent.stop="
										columnResizingStart(column, $event)
									"
									@mouseup="columnResizingStop()"
									@touchend="columnResizingStop()"
									@dblclick="columnResetWidth(column)"
								></div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div v-if="rows.length === 0" class="table-no-results">
				No results found
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

					<p>Page {{ page }} / {{ lastPage > 0 ? lastPage : 1 }}</p>

					<button
						:class="{
							disabled: page === lastPage || lastPage === 0
						}"
						class="button is-primary material-icons"
						:disabled="page === lastPage"
						@click="changePage(page + 1)"
						content="Next Page"
						v-tippy
					>
						fast_forward
					</button>
					<button
						:class="{
							disabled: page === lastPage || lastPage === 0
						}"
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
			v-if="hasCheckboxes && selectedRows.length > 0"
			class="bulk-popup"
			:style="{
				top: bulkPopup.top + 'px',
				left: bulkPopup.left + 'px'
			}"
			ref="bulk-popup"
		>
			<button
				class="button is-primary"
				:content="
					selectedRows.length === 1
						? `${selectedRows.length} row selected`
						: `${selectedRows.length} rows selected`
				"
				v-tippy="{ theme: 'info' }"
			>
				{{ selectedRows.length }}
			</button>
			<slot name="bulk-actions" :item="selectedRows" />
			<div class="right">
				<span
					class="material-icons drag-icon"
					@mousedown.left="onDragBox"
					@touchstart="onDragBox"
					@dblclick="resetBulkActionsPosition()"
				>
					drag_indicator
				</span>
			</div>
		</div>
	</div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import draggable from "vuedraggable";

import Toast from "toasters";
import AutoSuggest from "@/components/AutoSuggest.vue";

import keyboardShortcuts from "@/keyboardShortcuts";
import ws from "@/ws";

export default {
	components: {
		draggable,
		AutoSuggest
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
		dataAction: { type: String, default: null },
		name: { type: String, default: null },
		maxWidth: { type: Number, default: 1880 },
		query: { type: Boolean, default: true },
		keyboardShortcuts: { type: Boolean, default: true },
		events: { type: Object, default: () => {} }
	},
	data() {
		return {
			page: 1,
			pageSize: 10,
			rows: [],
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
				},
				datetimeBefore: {
					name: "datetimeBefore",
					displayName: "Before"
				},
				datetimeAfter: {
					name: "datetimeAfter",
					displayName: "After"
				},
				numberLesserEqual: {
					name: "numberLesserEqual",
					displayName: "Less than or equal to"
				},
				numberLesser: {
					name: "numberLesser",
					displayName: "Less than"
				},
				numberGreater: {
					name: "numberGreater",
					displayName: "Greater than"
				},
				numberGreaterEqual: {
					name: "numberGreaterEqual",
					displayName: "Greater than or equal to"
				},
				numberEquals: {
					name: "numberEquals",
					displayName: "Equals"
				},
				boolean: {
					name: "boolean",
					displayName: "Boolean"
				}
			},
			bulkPopup: {
				top: 0,
				left: 0,
				pos1: 0,
				pos2: 0,
				pos3: 0,
				pos4: 0
			},
			addFilterValue: null,
			showFiltersDropdown: false,
			showColumnsDropdown: false,
			lastColumnResizerTapped: null,
			lastColumnResizerTappedDate: 0,
			lastBulkActionsTappedDate: 0,
			autosuggest: {
				allItems: {}
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
			return this.rows.findIndex(item => item.highlighted);
		},
		selectedRows() {
			return this.rows.filter(row => row.selected);
		},
		hasCheckboxes() {
			return (
				this.$slots["bulk-actions"] != null ||
				this.$slots["bulk-actions-right"] != null
			);
		},
		aModalIsOpen() {
			return Object.keys(this.currentlyActive).length > 0;
		},
		...mapState({
			currentlyActive: state => state.modalVisibility.currentlyActive
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		selectedRows(newSelectedRows, oldSelectedRows) {
			// If selected rows goes from zero to one or more selected, trigger onWindowResize, as otherwise the popup could be out of bounds
			if (oldSelectedRows.length === 0 && newSelectedRows.length > 0)
				this.onWindowResize();
		}
	},
	mounted() {
		const tableSettings = this.getTableSettings();

		const columns = [
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

		if (this.hasCheckboxes)
			columns.unshift({
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
			});

		if (this.events && this.events.updated)
			columns.unshift({
				name: "updatedPlaceholder",
				displayName: "",
				properties: [],
				sortable: false,
				hidable: false,
				draggable: false,
				resizable: false,
				minWidth: 5,
				width: 5,
				maxWidth: 5
			});

		this.orderedColumns = columns.sort((columnA, columnB) => {
			// Always places updatedPlaceholder column in the first position
			if (columnA.name === "updatedPlaceholder") return -1;
			if (columnB.name === "updatedPlaceholder") return 1;
			// Always places select column in the second position
			if (columnA.name === "select") return -1;
			if (columnB.name === "select") return 1;
			// Always places placeholder column in the last position
			if (columnA.name === "placeholder") return 1;
			if (columnB.name === "placeholder") return -1;

			// If there are no table settings stored, use default ordering
			if (!tableSettings || !tableSettings.columnOrder) return 0;

			const indexA = tableSettings.columnOrder.indexOf(columnA.name);
			const indexB = tableSettings.columnOrder.indexOf(columnB.name);

			// If either of the columns is not stored in the table settings, use default ordering
			if (indexA === -1 || indexB === -1) return 0;

			return indexA - indexB;
		});

		this.shownColumns = this.orderedColumns
			.filter(column => {
				// If table settings exist, use shownColumns from settings to determine which columns to show
				if (tableSettings && tableSettings.shownColumns)
					return (
						tableSettings.shownColumns.indexOf(column.name) !== -1
					);
				// Table settings don't exist, only show if the default visibility isn't hidden
				return column.defaultVisibility !== "hidden";
			})
			.map(column => column.name);

		this.recalculateWidths();

		if (tableSettings) {
			// If table settings' page is an integer, use it for the page
			if (Number.isInteger(tableSettings?.page))
				this.page = tableSettings.page;

			// If table settings' pageSize is an integer, use it for the pageSize
			if (Number.isInteger(tableSettings?.pageSize))
				this.pageSize = tableSettings.pageSize;

			// If table settings' columnSort exists, sort all still existing columns based on table settings' columnSort object
			if (tableSettings.columnSort) {
				Object.entries(tableSettings.columnSort).forEach(
					([columnName, sortDirection]) => {
						if (
							this.columns.find(
								column => column.name === columnName
							)
						)
							this.sort[columnName] = sortDirection;
					}
				);
			}

			// If table settings' columnWidths exists, load the stored widths into the columns
			if (tableSettings.columnWidths) {
				this.orderedColumns = this.orderedColumns.map(orderedColumn => {
					const columnWidth = tableSettings.columnWidths.find(
						column => column.name === orderedColumn.name
					)?.width;
					if (orderedColumn.resizable && columnWidth)
						return { ...orderedColumn, width: columnWidth };
					return orderedColumn;
				});
			}

			if (
				tableSettings.filter &&
				tableSettings.filter.appliedFilters &&
				tableSettings.filter.appliedFilterOperator
			) {
				const { appliedFilters, appliedFilterOperator } =
					tableSettings.filter;
				// Set the applied filter operator and filter operator to the value stored in table settings
				this.appliedFilterOperator = this.filterOperator =
					appliedFilterOperator;
				// Set the applied filters and editing filters to the value stored in table settings, for all filters that are allowed
				this.appliedFilters = appliedFilters.filter(appliedFilter =>
					this.filters.find(
						filter => appliedFilter.filter.name === filter.name
					)
				);
				this.editingFilters = appliedFilters.filter(appliedFilter =>
					this.filters.find(
						filter => appliedFilter.filter.name === filter.name
					)
				);
			}
		}

		this.resetBulkActionsPosition();

		this.$nextTick(() => {
			this.onWindowResize();
			window.addEventListener("resize", this.onWindowResize);
		});

		ws.onConnect(this.init);

		if (this.events && this.events.updated)
			this.socket.on(`event:${this.events.updated.event}`, res => {
				const index = this.rows
					.map(row => row._id)
					.indexOf(
						this.events.updated.id
							.split(".")
							.reduce(
								(previous, current) =>
									previous &&
									previous[current] !== null &&
									previous[current] !== undefined
										? previous[current]
										: null,
								res.data
							)
					);
				const row = this.events.updated.item
					.split(".")
					.reduce(
						(previous, current) =>
							previous &&
							previous[current] !== null &&
							previous[current] !== undefined
								? previous[current]
								: null,
						res.data
					);
				this.updateData(index, row);
			});
		if (this.events && this.events.removed)
			this.socket.on(`event:${this.events.removed.event}`, res => {
				const index = this.rows
					.map(row => row._id)
					.indexOf(
						this.events.removed.id
							.split(".")
							.reduce(
								(previous, current) =>
									previous &&
									previous[current] !== null &&
									previous[current] !== undefined
										? previous[current]
										: null,
								res.data
							)
					);
				this.removeData(index);
			});

		if (this.keyboardShortcuts) {
			// Navigation section

			// Page navigation section
			keyboardShortcuts.registerShortcut("advancedTable.previousPage", {
				keyCode: 37, // 'Left arrow' key
				ctrl: true,
				preventDefault: false,
				handler: event => {
					// Previous page
					if (this.aModalIsOpen) return;
					if (
						document.activeElement.nodeName === "INPUT" ||
						document.activeElement.nodeName === "TEXTAREA"
					)
						return;
					event.preventDefault();
					this.changePage(this.page - 1);
				}
			});

			keyboardShortcuts.registerShortcut("advancedTable.nextPage", {
				keyCode: 39, // 'Right arrow' key
				ctrl: true,
				preventDefault: false,
				handler: event => {
					// Next page
					if (this.aModalIsOpen) return;
					if (
						document.activeElement.nodeName === "INPUT" ||
						document.activeElement.nodeName === "TEXTAREA"
					)
						return;
					event.preventDefault();
					this.changePage(this.page + 1);
				}
			});

			keyboardShortcuts.registerShortcut("advancedTable.firstPage", {
				keyCode: 37, // 'Left arrow' key
				ctrl: true,
				shift: true,
				preventDefault: false,
				handler: event => {
					// First page
					if (this.aModalIsOpen) return;
					if (
						document.activeElement.nodeName === "INPUT" ||
						document.activeElement.nodeName === "TEXTAREA"
					)
						return;
					event.preventDefault();
					this.changePage(1);
				}
			});

			keyboardShortcuts.registerShortcut("advancedTable.lastPage", {
				keyCode: 39, // 'Right arrow' key
				ctrl: true,
				shift: true,
				preventDefault: false,
				handler: event => {
					// Last page
					if (this.aModalIsOpen) return;
					if (
						document.activeElement.nodeName === "INPUT" ||
						document.activeElement.nodeName === "TEXTAREA"
					)
						return;
					event.preventDefault();
					this.changePage(this.lastPage);
				}
			});

			// Reset localStorage section
			keyboardShortcuts.registerShortcut(
				"advancedTable.resetLocalStorage",
				{
					keyCode: 116, // 'F5' key
					ctrl: true,
					preventDefault: false,
					handler: () => {
						// Reset local storage
						if (this.aModalIsOpen) return;
						console.log("Reset local storage");
						localStorage.removeItem(
							`advancedTableSettings:${this.name}`
						);
						this.$router.push({ query: "" });
					}
				}
			);

			// Selecting section
			keyboardShortcuts.registerShortcut("advancedTable.selectAll", {
				keyCode: 65, // 'A' key
				ctrl: true,
				preventDefault: false,
				handler: event => {
					if (this.aModalIsOpen) return;
					if (
						document.activeElement.nodeName === "INPUT" ||
						document.activeElement.nodeName === "TEXTAREA"
					)
						return;
					event.preventDefault();
					this.toggleAllRows();
				}
			});

			// Popup actions section
			for (let i = 1; i <= 9; i += 1) {
				keyboardShortcuts.registerShortcut(
					`advancedTable.executePopupAction${i}`,
					{
						keyCode: 48 + i, // '1-9' keys, where 49 is 1 and 57 is 9
						ctrl: true,
						preventDefault: true,
						handler: () => {
							// Execute popup action 1-9
							if (this.aModalIsOpen) return;
							if (this.selectedRows.length === 0) return;

							const bulkActionsElement =
								this.$refs["bulk-popup"].querySelector(
									".bulk-actions"
								);

							bulkActionsElement.children[i - 1].click();
						}
					}
				);
			}

			keyboardShortcuts.registerShortcut(
				`advancedTable.selectPopupAction1`,
				{
					keyCode: 48, // '0' key
					ctrl: true,
					preventDefault: true,
					handler: () => {
						// Select popup action 0
						if (this.aModalIsOpen) return;
						if (this.selectedRows.length === 0) return;

						const bulkActionsElement =
							this.$refs["bulk-popup"].querySelector(
								".bulk-actions"
							);

						bulkActionsElement.children[
							bulkActionsElement.children.length - 1
						].focus();
					}
				}
			);
		}
	},
	unmounted() {
		window.removeEventListener("resize", this.onWindowResize);
		if (this.storeTableSettingsDebounceTimeout)
			clearTimeout(this.storeTableSettingsDebounceTimeout);

		if (this.keyboardShortcuts) {
			const shortcutNames = [
				// Navigation
				"advancedTable.previousPage",
				"advancedTable.nextPage",
				"advancedTable.firstPage",
				"advancedTable.lastPage",
				// Reset localStorage
				"advancedTable.resetLocalStorage",
				// Selecting
				"advancedTable.selectAll",
				// Popup actions
				"advancedTable.executePopupAction1",
				"advancedTable.executePopupAction2",
				"advancedTable.executePopupAction3",
				"advancedTable.executePopupAction4",
				"advancedTable.executePopupAction5",
				"advancedTable.executePopupAction6",
				"advancedTable.executePopupAction7",
				"advancedTable.executePopupAction8",
				"advancedTable.executePopupAction9",
				"advancedTable.selectPopupAction1"
			];

			shortcutNames.forEach(shortcutName => {
				keyboardShortcuts.unregisterShortcut(shortcutName);
			});
		}
	},
	methods: {
		init() {
			this.getData();
			if (this.query) this.setQuery();
			if (this.events) {
				if (this.events.room)
					this.socket.dispatch(
						"apis.joinRoom",
						this.events.room,
						() => {}
					);
				if (this.events.adminRoom)
					this.socket.dispatch(
						"apis.joinAdminRoom",
						this.events.adminRoom,
						() => {}
					);
			}
			this.filters.forEach(filter => {
				if (filter.autosuggest && filter.autosuggestDataAction) {
					this.socket.dispatch(filter.autosuggestDataAction, res => {
						if (res.status === "success") {
							const { items } = res.data;
							this.autosuggest.allItems[filter.name] = items;
						} else {
							new Toast(res.message);
						}
					});
				}
			});
		},
		getData() {
			this.socket.dispatch(
				this.dataAction,
				this.page,
				this.pageSize,
				this.properties,
				this.sort,
				this.appliedFilters.map(filter => ({
					...filter,
					filterType: filter.filterType.name
				})),
				this.appliedFilterOperator,
				res => {
					if (res.status === "success") {
						const { data, count } = res.data;
						this.rows = data.map(row => ({
							...row,
							selected: false
						}));
						this.count = count;
					} else {
						new Toast(res.message);
					}
				}
			);
		},
		changePageSize() {
			this.page = 1;
			this.getData();
			this.storeTableSettings();
		},
		changePage(page) {
			if (page < 1) return;
			if (page > this.lastPage) return;
			if (page === this.page) return;
			this.page = page;
			this.getData();
			if (this.query) this.setQuery();
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
				this.storeTableSettings();
			}
		},
		toggleColumnVisibility(column) {
			if (!column.hidable) return false;
			if (this.shownColumns.indexOf(column.name) !== -1) {
				if (this.shownColumns.length <= 3)
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
			this.getData();
			return this.storeTableSettings();
		},
		toggleSelectedRow(itemIndex, event) {
			const { shiftKey, ctrlKey } = event;
			// Shift was pressed, so attempt to select all items between the clicked item and last clicked item
			if (shiftKey) {
				// If the clicked item is already selected, prevent default, otherwise the checkbox will be unchecked
				if (this.rows[itemIndex].selected) event.preventDefault();
				// If there is a last clicked item
				if (this.lastSelectedItemIndex >= 0) {
					// Clicked item is lower than last item, so select upwards until it reaches the last selected item
					if (itemIndex > this.lastSelectedItemIndex) {
						for (
							let itemIndexUp = itemIndex;
							itemIndexUp > this.lastSelectedItemIndex;
							itemIndexUp -= 1
						) {
							if (!this.rows[itemIndexUp].removed)
								this.rows[itemIndexUp].selected = true;
						}
					}
					// Clicked item is higher than last item, so select downwards until it reaches the last selected item
					else if (itemIndex < this.lastSelectedItemIndex) {
						for (
							let itemIndexDown = itemIndex;
							itemIndexDown < this.lastSelectedItemIndex;
							itemIndexDown += 1
						) {
							if (!this.rows[itemIndexDown].removed)
								this.rows[itemIndexDown].selected = true;
						}
					}
				}
			}
			// Ctrl was pressed, so attempt to unselect all items between the clicked item and last clicked item
			else if (ctrlKey) {
				// If the clicked item is already unselected, prevent default, otherwise the checkbox will be checked
				if (!this.rows[itemIndex].selected) event.preventDefault();
				// If there is a last clicked item
				if (this.lastSelectedItemIndex >= 0) {
					// Clicked item is lower than last item, so unselect upwards until it reaches the last selected item
					if (itemIndex > this.lastSelectedItemIndex) {
						for (
							let itemIndexUp = itemIndex;
							itemIndexUp >= this.lastSelectedItemIndex;
							itemIndexUp -= 1
						) {
							if (!this.rows[itemIndexUp].removed)
								this.rows[itemIndexUp].selected = false;
						}
					}
					// Clicked item is higher than last item, so unselect downwards until it reaches the last selected item
					else if (itemIndex < this.lastSelectedItemIndex) {
						for (
							let itemIndexDown = itemIndex;
							itemIndexDown <= this.lastSelectedItemIndex;
							itemIndexDown += 1
						) {
							if (!this.rows[itemIndexDown].removed)
								this.rows[itemIndexDown].selected = false;
						}
					}
				}
			}
			// Neither ctrl nor shift were pressed, so toggle clicked item
			else {
				this.rows[itemIndex].selected = !this.rows[itemIndex].selected;
			}

			// Set the last clicked item to no longer be highlighted, if it exists
			if (this.lastSelectedItemIndex >= 0)
				this.rows[this.lastSelectedItemIndex].highlighted = false;
			// Set the clicked item to be highlighted
			this.rows[itemIndex].highlighted = true;
		},
		toggleAllRows() {
			if (
				this.rows.filter(row => !row.removed).length >
				this.selectedRows.length
			) {
				this.rows = this.rows.map(row => {
					if (row.removed) return row;
					return { ...row, selected: true };
				});
			} else {
				this.rows = this.rows.map(row => {
					if (row.removed) return row;
					return { ...row, selected: false };
				});
			}
		},
		highlightUp(itemIndex) {
			if (itemIndex === 0) return;
			const newItemIndex = itemIndex - 1;
			this.highlightRow(newItemIndex);
		},
		highlightDown(itemIndex) {
			if (itemIndex === this.rows.length - 1) return;
			const newItemIndex = itemIndex + 1;
			this.highlightRow(newItemIndex);
		},
		highlightRow(itemIndex) {
			const rowElement = this.$refs[`row-${itemIndex}`];
			// Set the last clicked item to no longer be highlighted, if it exists
			if (this.lastSelectedItemIndex >= 0)
				this.rows[this.lastSelectedItemIndex].highlighted = false;
			if (rowElement) rowElement.focus();
			// Set the item to be highlighted
			this.rows[itemIndex].highlighted = true;
		},
		unhighlightRow(itemIndex) {
			const rowElement = this.$refs[`row-${itemIndex}`];
			if (rowElement) rowElement.blur();
			// Set the item to no longer be highlighted
			this.rows[itemIndex].highlighted = false;
		},
		selectUp(itemIndex) {
			if (itemIndex === 0) return;
			const newItemIndex = itemIndex - 1;
			if (!this.rows[itemIndex].removed)
				this.rows[itemIndex].selected = true;
			if (!this.rows[newItemIndex].removed)
				this.rows[newItemIndex].selected = true;
			this.highlightRow(newItemIndex);
		},
		selectDown(itemIndex) {
			if (itemIndex === this.rows.length - 1) return;
			const newItemIndex = itemIndex + 1;
			if (!this.rows[itemIndex].removed)
				this.rows[itemIndex].selected = true;
			if (!this.rows[newItemIndex].removed)
				this.rows[newItemIndex].selected = true;
			this.highlightRow(newItemIndex);
		},
		unselectUp(itemIndex) {
			if (itemIndex === 0) return;
			const newItemIndex = itemIndex - 1;
			if (!this.rows[itemIndex].removed)
				this.rows[itemIndex].selected = false;
			if (!this.rows[newItemIndex].removed)
				this.rows[newItemIndex].selected = false;
			this.highlightRow(newItemIndex);
		},
		unselectDown(itemIndex) {
			if (itemIndex === this.rows.length - 1) return;
			const newItemIndex = itemIndex + 1;
			if (!this.rows[itemIndex].removed)
				this.rows[itemIndex].selected = false;
			if (!this.rows[newItemIndex].removed)
				this.rows[newItemIndex].selected = false;
			this.highlightRow(newItemIndex);
		},
		addFilterItem() {
			let data = "";
			if (this.addFilterValue.defaultFilterType.startsWith("datetime")) {
				const now = new Date();
				now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
				data = now.toISOString().slice(0, 16);
			}

			this.editingFilters.push({
				data,
				filter: this.addFilterValue,
				filterType:
					this.allFilterTypes[this.addFilterValue.defaultFilterType]
			});
		},
		removeFilterItem(index) {
			this.editingFilters.splice(index, 1);
		},
		columnResizingStart(column, event) {
			const eventIsTouch = event.type === "touchstart";
			if (eventIsTouch) {
				// Handle double click from touch (if this method is called for the same column twice in a row within one second)
				if (
					this.lastColumnResizerTapped === column &&
					Date.now() - this.lastColumnResizerTappedDate <= 1000
				) {
					this.columnResetWidth(column);
					this.lastColumnResizerTapped = null;
					this.lastColumnResizerTappedDate = 0;
					return;
				}
				this.lastColumnResizerTapped = column;
				this.lastColumnResizerTappedDate = Date.now();
			}
			this.resizing.resizing = true;
			this.resizing.resizingColumn = column;
			this.resizing.width = event.target.parentElement.offsetWidth;
			this.resizing.lastX = eventIsTouch
				? event.targetTouches[0].clientX
				: event.x;
		},
		columnResizing(event) {
			if (this.resizing.resizing) {
				const eventIsTouch = event.type === "touchmove";
				if (!eventIsTouch && event.buttons !== 1) {
					this.resizing.resizing = false;
					this.storeTableSettings();
				}
				const x = eventIsTouch
					? event.changedTouches[0].clientX
					: event.x;

				this.resizing.width -= this.resizing.lastX - x;
				this.resizing.lastX = x;
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
				this.storeTableSettings();
			}
		},
		columnResizingStop() {
			this.resizing.resizing = false;
			this.storeTableSettings();
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
			this.storeTableSettings();
		},
		filterTypes(filter) {
			if (!filter || !filter.filterTypes) return [];
			return filter.filterTypes.map(
				filterType => this.allFilterTypes[filterType]
			);
		},
		changeFilterType(index) {
			this.editingFilters[index].filterType =
				this.allFilterTypes[
					this.editingFilters[index].filter.defaultFilterType
				];
		},
		onDragBox(e) {
			const e1 = e || window.event;
			const e1IsTouch = e1.type === "touchstart";
			e1.preventDefault();

			if (e1IsTouch) {
				// Handle double click from touch (if this method is twice in a row within one second)
				if (Date.now() - this.lastBulkActionsTappedDate <= 1000) {
					this.resetBulkActionsPosition();
					this.lastBulkActionsTappedDate = 0;
					return;
				}
				this.lastBulkActionsTappedDate = Date.now();
			}

			this.bulkPopup.pos3 = e1IsTouch
				? e1.changedTouches[0].clientX
				: e1.clientX;
			this.bulkPopup.pos4 = e1IsTouch
				? e1.changedTouches[0].clientY
				: e1.clientY;

			document.onmousemove = document.ontouchmove = e => {
				const e2 = e || window.event;
				const e2IsTouch = e2.type === "touchmove";
				if (!e2IsTouch) e2.preventDefault();

				// Get the clientX and clientY
				const e2ClientX = e2IsTouch
					? e2.changedTouches[0].clientX
					: e2.clientX;
				const e2ClientY = e2IsTouch
					? e2.changedTouches[0].clientY
					: e2.clientY;

				// calculate the new cursor position:
				this.bulkPopup.pos1 = this.bulkPopup.pos3 - e2ClientX;
				this.bulkPopup.pos2 = this.bulkPopup.pos4 - e2ClientY;
				this.bulkPopup.pos3 = e2ClientX;
				this.bulkPopup.pos4 = e2ClientY;
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

			document.onmouseup = document.ontouchend = () => {
				document.onmouseup = null;
				document.ontouchend = null;
				document.onmousemove = null;
				document.ontouchmove = null;
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
			this.page = 1;
			this.getData();
			this.storeTableSettings();
		},
		recalculateWidths() {
			let noWidthCount = 0;
			let calculatedWidth = 0;
			this.orderedColumns.forEach(column => {
				if (this.shownColumns.indexOf(column.name) !== -1)
					if (
						Number.isFinite(column.width) &&
						!Number.isFinite(column.calculatedWidth)
					) {
						calculatedWidth += column.width;
					} else if (Number.isFinite(column.defaultWidth)) {
						calculatedWidth += column.defaultWidth;
					} else {
						noWidthCount += 1;
					}
			});
			calculatedWidth = Math.floor(
				(Math.min(this.maxWidth, document.body.clientWidth) -
					calculatedWidth) /
					(noWidthCount - 1)
			);
			this.orderedColumns = this.orderedColumns.map(column => {
				const orderedColumn = column;
				if (this.shownColumns.indexOf(orderedColumn.name) !== -1) {
					let newWidth;
					if (Number.isFinite(orderedColumn.defaultWidth)) {
						newWidth = orderedColumn.defaultWidth;
					} else {
						// eslint-disable-next-line no-param-reassign
						newWidth = orderedColumn.calculatedWidth = Math.min(
							Math.max(
								orderedColumn.minWidth || 100, // fallback 100px min width
								calculatedWidth
							),
							orderedColumn.maxWidth || 1000 // fallback 1000px max width
						);
					}
					if (newWidth && !Number.isFinite(orderedColumn.width))
						orderedColumn.width = newWidth;
				}
				return orderedColumn;
			});
		},
		columnOrderChanged() {
			this.storeTableSettings();
		},
		getTableSettings() {
			const urlTableSettings = {};
			if (this.query) {
				if (this.$route.query.page)
					urlTableSettings.page = Number.parseInt(
						this.$route.query.page
					);
				if (this.$route.query.pageSize)
					urlTableSettings.pageSize = Number.parseInt(
						this.$route.query.pageSize
					);
				if (this.$route.query.shownColumns)
					urlTableSettings.shownColumns = JSON.parse(
						this.$route.query.shownColumns
					);
				if (this.$route.query.columnOrder)
					urlTableSettings.columnOrder = JSON.parse(
						this.$route.query.columnOrder
					);
				if (this.$route.query.columnWidths)
					urlTableSettings.columnWidths = JSON.parse(
						this.$route.query.columnWidths
					);
				if (this.$route.query.columnSort)
					urlTableSettings.columnSort = JSON.parse(
						this.$route.query.columnSort
					);
				if (this.$route.query.filter)
					urlTableSettings.filter = JSON.parse(
						this.$route.query.filter
					);
			}

			const localStorageTableSettings = JSON.parse(
				localStorage.getItem(`advancedTableSettings:${this.name}`)
			);

			return {
				...localStorageTableSettings,
				...urlTableSettings
			};
		},
		storeTableSettings() {
			// Clear debounce timeout
			if (this.storeTableSettingsDebounceTimeout)
				clearTimeout(this.storeTableSettingsDebounceTimeout);

			// Resizing calls this function a lot, so rather than saving dozens of times a second, use debouncing
			this.storeTableSettingsDebounceTimeout = setTimeout(() => {
				if (this.query) this.setQuery();
				this.setLocalStorage();
			}, 250);
		},
		setQuery() {
			const queryObject = {
				...this.$route.query,
				page: this.page,
				pageSize: this.pageSize,
				filter: JSON.stringify({
					appliedFilters: this.appliedFilters,
					appliedFilterOperator: this.appliedFilterOperator
				}),
				columnSort: JSON.stringify(this.sort),
				columnOrder: JSON.stringify(
					this.orderedColumns.map(column => column.name)
				),
				columnWidths: JSON.stringify(
					this.orderedColumns.map(column => ({
						name: column.name,
						width: column.width
					}))
				),
				shownColumns: JSON.stringify(this.shownColumns)
			};

			const queryString = `?${Object.keys(queryObject)
				.map(key => `${key}=${queryObject[key]}`)
				.join("&")}`;

			window.history.replaceState(null, null, queryString);
		},
		setLocalStorage() {
			localStorage.setItem(
				`advancedTableSettings:${this.name}`,
				JSON.stringify({
					pageSize: this.pageSize,
					filter: {
						appliedFilters: this.appliedFilters,
						appliedFilterOperator: this.appliedFilterOperator
					},
					columnSort: this.sort,
					columnOrder: this.orderedColumns.map(column => column.name),
					columnWidths: this.orderedColumns.map(column => ({
						name: column.name,
						width: column.width
					})),
					shownColumns: this.shownColumns
				})
			);
		},
		onWindowResize() {
			// Only change the position if the popup is actually visible
			if (this.selectedRows.length === 0) return;
			if (this.bulkPopup.top < 0) this.bulkPopup.top = 0;
			if (this.bulkPopup.top > document.body.clientHeight - 50)
				this.bulkPopup.top = document.body.clientHeight - 50;
			if (this.bulkPopup.left < 0) this.bulkPopup.left = 0;
			if (this.bulkPopup.left > document.body.clientWidth - 400)
				this.bulkPopup.left = document.body.clientWidth - 400;
		},
		updateData(index, data) {
			this.rows[index] = { ...this.rows[index], ...data, updated: true };
		},
		removeData(index) {
			this.rows[index] = {
				...this.rows[index],
				selected: false,
				removed: true
			};
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
				background-color: var(--dark-grey-3) !important;
				color: var(--light-grey-2);
			}

			tr {
				th,
				td {
					border-color: var(--dark-grey) !important;
					background-color: var(--dark-grey-3) !important;
				}

				&:nth-child(even) td {
					background-color: var(--dark-grey-2) !important;
				}

				&:hover,
				&:focus,
				&.highlighted {
					th,
					td {
						background-color: var(--dark-grey-4) !important;
					}
				}

				&.updated td:first-child {
					background-color: var(--primary-color) !important;
				}
			}

			&.has-checkboxes tbody tr {
				td:nth-child(2) {
					background-color: var(--dark-grey-3) !important;
				}
				&:nth-child(even) td:nth-child(2) {
					background-color: var(--dark-grey-2) !important;
				}
				&.updated td:first-child {
					background-color: var(--primary-color) !important;
				}
				&:hover,
				&:focus,
				&.highlighted {
					th,
					td {
						&:nth-child(2) {
							background-color: var(--dark-grey-4) !important;
						}
					}
				}
			}
		}

		.table-header,
		.table-footer {
			background-color: var(--dark-grey-3);
			color: var(--light-grey-2);
		}

		.table-no-results {
			background-color: var(--dark-grey-3);
			color: var(--light-grey-2);
			border-color: var(--dark-grey) !important;
		}

		.label.control {
			background-color: var(--dark-grey) !important;
			border-color: var(--grey-3) !important;
			color: var(--white) !important;
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
						padding: 0;

						&:last-child {
							border-width: 1px 0 1px;
						}

						&.sortable {
							cursor: pointer;
						}

						& > div {
							display: flex;
							white-space: nowrap;
							padding: 8px 10px;

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
					&.updated {
						td:first-child {
							background-color: var(--primary-color) !important;
						}
					}

					&:nth-child(even) td {
						background-color: rgb(250, 250, 250);
					}

					td {
						border: 1px solid var(--light-grey-2);
						border-width: 0 1px 1px 0;

						&:last-child {
							border-width: 0 0 1px;
						}

						/deep/ .row-options {
							display: flex;
							justify-content: space-evenly;

							.icon-with-button {
								height: 30px;
								width: 30px;
							}
						}
					}

					&.removed {
						filter: grayscale(100%);
						cursor: not-allowed;
						user-select: none;

						td .removed-overlay {
							position: absolute;
							top: 0;
							left: 0;
							bottom: 0;
							right: 5px;
							z-index: 5;
						}
					}
				}
			}
		}

		table {
			thead tr,
			tbody tr {
				th,
				td {
					position: relative;
					white-space: nowrap;
					text-overflow: ellipsis;
					overflow: hidden;
					background-color: var(--white);

					&:first-child {
						display: table-cell;
						position: sticky;
						left: 0;
						z-index: 2;

						& > .updated-tooltip {
							position: absolute;
							top: 0;
							left: 0;
							bottom: 0;
							right: 0;
						}
					}

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

				&:hover,
				&:focus,
				&.highlighted {
					th,
					td {
						background-color: rgb(240, 240, 240);
					}
				}
			}

			&.has-checkboxes {
				thead,
				tbody {
					tr {
						th,
						td {
							&:nth-child(2) {
								display: table-cell;
								position: sticky;
								left: 5px;
								z-index: 2;
							}
						}
						&.updated td:first-child {
							background-color: var(--primary-color);
						}
					}
				}
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

	.table-header {
		& > div {
			display: flex;
			flex-direction: row;

			> span > .control {
				margin: 5px;
			}

			.filters-indicator {
				line-height: 46px;
				display: flex;
				align-items: center;
				column-gap: 4px;
			}
		}

		@media screen and (max-width: 400px) {
			flex-direction: column;

			& > div {
				justify-content: center;
			}
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

		@media screen and (max-width: 600px) {
			flex-direction: column;

			.page-controls,
			.page-size > .control {
				justify-content: center;
			}
		}
	}

	.table-no-results {
		display: flex;
		flex-direction: row;
		justify-content: center;
		border-bottom: 1px solid var(--light-grey-2);
		font-size: 18px;
		line-height: 50px;
		background-color: var(--white);
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
		/deep/ & > div > input,
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

	@media screen and (max-width: 600px) {
		&.advanced-filter {
			flex-wrap: wrap;
			.control.select {
				width: 50%;
				select {
					width: 100%;
				}
			}
			.control {
				margin-bottom: 0 !important;
				&:nth-child(1) > select {
					border-radius: 5px 0 0 0;
				}
				&:nth-child(2) > select {
					border-radius: 0 5px 0 0;
				}
				/deep/ &:nth-child(3) {
					& > input,
					& > div > input,
					& > select {
						border-radius: 0 0 0 5px;
					}
				}
				&:nth-child(4) > button {
					border-radius: 0 0 5px 0;
				}
			}
		}
	}
}

.advanced-filter {
	.control {
		position: relative;
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

/deep/ .bulk-popup {
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

	.bulk-actions {
		display: flex;
		flex-direction: row;
		width: 100%;
		justify-content: space-evenly;

		.material-icons {
			position: relative;
			top: 6px;
			margin-left: 5px;
			cursor: pointer;
			color: var(--primary-color);
			height: 25px;

			&:hover,
			&:focus {
				filter: brightness(90%);
			}
		}
		.delete-icon {
			color: var(--dark-red);
		}
	}
}
</style>
