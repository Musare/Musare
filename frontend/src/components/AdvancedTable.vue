<script setup lang="ts">
import {
	defineAsyncComponent,
	PropType,
	useSlots,
	ref,
	computed,
	onMounted,
	onUnmounted,
	watch,
	nextTick
} from "vue";
import { useRoute, useRouter } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { DraggableList } from "vue-draggable-list";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import keyboardShortcuts from "@/keyboardShortcuts";
import { useDragBox } from "@/composables/useDragBox";
import {
	TableColumn,
	TableFilter,
	TableEvents,
	TableBulkActions
} from "@/types/advancedTable";

const { dragBox, setInitialBox, onDragBox, resetBoxPosition } = useDragBox();

const AutoSuggest = defineAsyncComponent(
	() => import("@/components/AutoSuggest.vue")
);

const props = defineProps({
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
	columnDefault: { type: Object as PropType<TableColumn>, default: () => {} },
	columns: {
		type: Array as PropType<TableColumn[]>,
		default: () => []
	},
	filters: {
		type: Array as PropType<TableFilter[]>,
		default: () => []
	},
	dataAction: { type: String, default: null },
	name: { type: String, default: null },
	maxWidth: { type: Number, default: 1880 },
	query: { type: Boolean, default: true },
	keyboardShortcuts: { type: Boolean, default: true },
	events: { type: Object as PropType<TableEvents>, default: () => {} },
	bulkActions: {
		type: Object as PropType<TableBulkActions>,
		default: () => {}
	}
});

const slots = useSlots();

const route = useRoute();
const router = useRouter();

const modalsStore = useModalsStore();
const { activeModals } = storeToRefs(modalsStore);

const { socket } = useWebsocketsStore();

const page = ref(1);
const pageSize = ref(10);
const rows = ref([]);
const count = ref(0);
const sort = ref({});
const orderedColumns = ref([]);
const shownColumns = ref([]);
const editingFilters = ref([]);
const appliedFilters = ref([]);
const filterOperator = ref("or");
const appliedFilterOperator = ref("or");
const filterOperators = ref([
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
]);
const resizing = ref({
	resizing: false,
	width: 0,
	lastX: 0,
	resizingColumn: {
		width: 0,
		minWidth: 0,
		maxWidth: 0
	}
});
const allFilterTypes = ref({
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
	},
	special: {
		name: "special",
		displayName: "Special"
	}
});
const addFilterValue = ref();
const showFiltersDropdown = ref(false);
const showColumnsDropdown = ref(false);
const lastColumnResizerTapped = ref();
const lastColumnResizerTappedDate = ref(0);
const autosuggest = ref({
	allItems: {}
});
const storeTableSettingsDebounceTimeout = ref();
const windowResizeDebounceTimeout = ref();
const columnOrderChangedDebounceTimeout = ref();
const lastSelectedItemIndex = ref(0);
const bulkPopup = ref();
const rowElements = ref([]);

const lastPage = computed(() => Math.ceil(count.value / pageSize.value));
const sortedFilteredColumns = computed(() =>
	orderedColumns.value.filter(
		column => shownColumns.value.indexOf(column.name) !== -1
	)
);
const hidableSortedColumns = computed(() =>
	orderedColumns.value.filter(column => column.hidable)
);
const selectedRows = computed(() => rows.value.filter(row => row.selected));
const properties = computed(() =>
	Array.from(
		new Set(
			sortedFilteredColumns.value.flatMap(column => column.properties)
		)
	)
);
const hasCheckboxes = computed(
	() => slots["bulk-actions"] != null || slots["bulk-actions-right"] != null
);
const aModalIsOpen = computed(() => Object.keys(activeModals.value).length > 0);

const getData = () => {
	socket.dispatch(
		props.dataAction,
		page.value,
		pageSize.value,
		properties.value,
		sort.value,
		appliedFilters.value.map(filter => ({
			...filter,
			filterType: filter.filterType.name
		})),
		appliedFilterOperator.value,
		res => {
			if (res.status === "success") {
				rows.value = res.data.data.map(row => ({
					...row,
					selected: false
				}));
				count.value = res.data.count;
			} else {
				new Toast(res.message);
			}
		}
	);
};

const setQuery = () => {
	const queryObject = {
		...route.query,
		page: page.value,
		pageSize: pageSize.value,
		filter: JSON.stringify({
			appliedFilters: appliedFilters.value,
			appliedFilterOperator: appliedFilterOperator.value
		}),
		columnSort: JSON.stringify(sort.value),
		columnOrder: JSON.stringify(
			orderedColumns.value.map(column => column.name)
		),
		columnWidths: JSON.stringify(
			orderedColumns.value.map(column => ({
				name: column.name,
				width: column.width
			}))
		),
		shownColumns: JSON.stringify(shownColumns.value)
	};

	const queryString = `?${Object.keys(queryObject)
		.map(key => `${key}=${queryObject[key]}`)
		.join("&")}`;

	window.history.replaceState(window.history.state, null, queryString);
};

const setLocalStorage = () => {
	localStorage.setItem(
		`advancedTableSettings:${props.name}`,
		JSON.stringify({
			pageSize: pageSize.value,
			filter: {
				appliedFilters: appliedFilters.value,
				appliedFilterOperator: appliedFilterOperator.value
			},
			columnSort: sort.value,
			columnOrder: orderedColumns.value.map(column => column.name),
			columnWidths: orderedColumns.value.map(column => ({
				name: column.name,
				width: column.width
			})),
			shownColumns: shownColumns.value
		})
	);
};

const storeTableSettings = () => {
	// Clear debounce timeout
	if (storeTableSettingsDebounceTimeout.value)
		clearTimeout(storeTableSettingsDebounceTimeout.value);

	// Resizing calls this function a lot, so rather than saving dozens of times a second, use debouncing
	storeTableSettingsDebounceTimeout.value = setTimeout(() => {
		if (props.query) setQuery();
		setLocalStorage();
	}, 250);
};

const changePageSize = () => {
	page.value = 1;
	getData();
	storeTableSettings();
};

const changePage = newPage => {
	if (newPage < 1) return;
	if (newPage > lastPage.value) return;
	if (newPage === page.value) return;
	page.value = newPage;
	getData();
	if (props.query) setQuery();
};

const changeSort = column => {
	if (column.sortable) {
		const { sortProperty } = column;
		if (sort.value[sortProperty] === undefined)
			sort.value[sortProperty] = "ascending";
		else if (sort.value[sortProperty] === "ascending")
			sort.value[sortProperty] = "descending";
		else if (sort.value[sortProperty] === "descending")
			delete sort.value[sortProperty];
		getData();
		storeTableSettings();
	}
};

const recalculateWidths = () => {
	let noWidthCount = 0;
	let calculatedWidth = 0;
	orderedColumns.value.forEach(column => {
		if (orderedColumns.value.indexOf(column.name) !== -1)
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
		(Math.min(props.maxWidth, document.body.clientWidth) -
			calculatedWidth) /
			(noWidthCount - 1)
	);
	orderedColumns.value = orderedColumns.value.map(column => {
		const orderedColumn = column;
		if (shownColumns.value.indexOf(orderedColumn.name) !== -1) {
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
};

const toggleColumnVisibility = column => {
	if (!column.hidable) return false;
	if (shownColumns.value.indexOf(column.name) !== -1) {
		if (shownColumns.value.length <= 3)
			return new Toast(
				`Unable to hide column ${column.displayName}, there must be at least 1 visibile column`
			);
		shownColumns.value.splice(shownColumns.value.indexOf(column.name), 1);
	} else {
		shownColumns.value.push(column.name);
	}
	recalculateWidths();
	getData();
	return storeTableSettings();
};

const toggleSelectedRow = (itemIndex, event) => {
	const { shiftKey, ctrlKey } = event;
	// Shift was pressed, so attempt to select all items between the clicked item and last clicked item
	if (shiftKey && !ctrlKey) {
		// If the clicked item is already selected, prevent default, otherwise the checkbox will be unchecked
		if (rows.value[itemIndex].selected) event.preventDefault();
		rows.value[itemIndex].selected = true;
		// If there is a last clicked item
		if (lastSelectedItemIndex.value >= 0) {
			// Clicked item is lower than last item, so select upwards until it reaches the last selected item
			if (itemIndex > lastSelectedItemIndex.value) {
				for (
					let itemIndexUp = itemIndex;
					itemIndexUp > lastSelectedItemIndex.value;
					itemIndexUp -= 1
				) {
					if (!rows.value[itemIndexUp].removed)
						rows.value[itemIndexUp].selected = true;
				}
			}
			// Clicked item is higher than last item, so select downwards until it reaches the last selected item
			else if (itemIndex < lastSelectedItemIndex.value) {
				for (
					let itemIndexDown = itemIndex;
					itemIndexDown < lastSelectedItemIndex.value;
					itemIndexDown += 1
				) {
					if (!rows.value[itemIndexDown].removed)
						rows.value[itemIndexDown].selected = true;
				}
			}
		}
	}
	// Ctrl was pressed, so attempt to unselect all items between the clicked item and last clicked item
	else if (!shiftKey && ctrlKey) {
		// If the clicked item is already unselected, prevent default, otherwise the checkbox will be checked
		if (!rows.value[itemIndex].selected) event.preventDefault();
		rows.value[itemIndex].selected = false;
		// If there is a last clicked item
		if (lastSelectedItemIndex.value >= 0) {
			// Clicked item is lower than last item, so unselect upwards until it reaches the last selected item
			if (itemIndex >= lastSelectedItemIndex.value) {
				for (
					let itemIndexUp = itemIndex;
					itemIndexUp >= lastSelectedItemIndex.value;
					itemIndexUp -= 1
				) {
					if (!rows.value[itemIndexUp].removed)
						rows.value[itemIndexUp].selected = false;
				}
			}
			// Clicked item is higher than last item, so unselect downwards until it reaches the last selected item
			else if (itemIndex < lastSelectedItemIndex.value) {
				for (
					let itemIndexDown = itemIndex;
					itemIndexDown <= lastSelectedItemIndex.value;
					itemIndexDown += 1
				) {
					if (!rows.value[itemIndexDown].removed)
						rows.value[itemIndexDown].selected = false;
				}
			}
		}
	}
	// Neither ctrl nor shift were pressed, so toggle clicked item
	else {
		rows.value[itemIndex].selected = !rows.value[itemIndex].selected;
	}

	rows.value[itemIndex].highlighted = rows.value[itemIndex].selected;
	// Set the last clicked item to no longer be highlighted, if it exists
	if (lastSelectedItemIndex.value >= 0)
		rows.value[lastSelectedItemIndex.value].highlighted = false;
	lastSelectedItemIndex.value = itemIndex;
};

const toggleAllRows = () => {
	if (
		rows.value.filter(row => !row.removed).length >
		selectedRows.value.length
	) {
		rows.value = rows.value.map(row => {
			if (row.removed) return row;
			return { ...row, selected: true };
		});
	} else {
		rows.value = rows.value.map(row => {
			if (row.removed) return row;
			return { ...row, selected: false };
		});
	}
};

const highlightRow = async itemIndex => {
	const rowElement = rowElements.value[`row-${itemIndex}`]
		? rowElements.value[`row-${itemIndex}`][0]
		: null;
	// Set the last clicked item to no longer be highlighted, if it exists
	if (lastSelectedItemIndex.value >= 0)
		rows.value[lastSelectedItemIndex.value].highlighted = false;
	if (rowElement) {
		await nextTick();
		rowElement.focus();
	}
	// Set the item to be highlighted
	rows.value[itemIndex].highlighted = true;
};

const highlightUp = itemIndex => {
	if (itemIndex === 0) return;
	const newItemIndex = itemIndex - 1;
	highlightRow(newItemIndex);
};

const highlightDown = itemIndex => {
	if (itemIndex === rows.value.length - 1) return;
	const newItemIndex = itemIndex + 1;
	highlightRow(newItemIndex);
};

const unhighlightRow = async itemIndex => {
	const rowElement = rowElements.value[`row-${itemIndex}`]
		? rowElements.value[`row-${itemIndex}`][0]
		: null;
	if (rowElement) {
		await nextTick();
		rowElement.blur();
	}
	// Set the item to no longer be highlighted
	rows.value[itemIndex].highlighted = false;
};

const selectUp = itemIndex => {
	if (itemIndex === 0) return;
	const newItemIndex = itemIndex - 1;
	if (!rows.value[itemIndex].removed) rows.value[itemIndex].selected = true;
	if (!rows.value[newItemIndex].removed)
		rows.value[newItemIndex].selected = true;
	highlightRow(newItemIndex);
};

const selectDown = itemIndex => {
	if (itemIndex === rows.value.length - 1) return;
	const newItemIndex = itemIndex + 1;
	if (!rows.value[itemIndex].removed) rows.value[itemIndex].selected = true;
	if (!rows.value[newItemIndex].removed)
		rows.value[newItemIndex].selected = true;
	highlightRow(newItemIndex);
};

const unselectUp = itemIndex => {
	if (itemIndex === 0) return;
	const newItemIndex = itemIndex - 1;
	if (!rows.value[itemIndex].removed) rows.value[itemIndex].selected = false;
	if (!rows.value[newItemIndex].removed)
		rows.value[newItemIndex].selected = false;
	highlightRow(newItemIndex);
};

const unselectDown = itemIndex => {
	if (itemIndex === rows.value.length - 1) return;
	const newItemIndex = itemIndex + 1;
	if (!rows.value[itemIndex].removed) rows.value[itemIndex].selected = false;
	if (!rows.value[newItemIndex].removed)
		rows.value[newItemIndex].selected = false;
	highlightRow(newItemIndex);
};

const addFilterItem = () => {
	let data = "";
	if (addFilterValue.value.defaultFilterType.startsWith("datetime")) {
		const now = new Date();
		now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
		data = now.toISOString().slice(0, 16);
	}

	editingFilters.value.push({
		data,
		filter: addFilterValue.value,
		filterType: allFilterTypes.value[addFilterValue.value.defaultFilterType]
	});
};

const removeFilterItem = index => {
	editingFilters.value.splice(index, 1);
};

const columnResetWidth = column => {
	const index = orderedColumns.value.indexOf(column);
	if (column.defaultWidth && !Number.isNaN(column.defaultWidth))
		orderedColumns.value[index].width = column.defaultWidth;
	else if (column.calculatedWidth && !Number.isNaN(column.calculatedWidth))
		orderedColumns.value[index].width = column.calculatedWidth;
	storeTableSettings();
};

const columnResizingStart = (column, event) => {
	const eventIsTouch = event.type === "touchstart";
	if (eventIsTouch) {
		// Handle double click from touch (if this method is called for the same column twice in a row within one second)
		if (
			lastColumnResizerTapped.value === column &&
			Date.now() - lastColumnResizerTappedDate.value <= 1000
		) {
			columnResetWidth(column);
			lastColumnResizerTapped.value = null;
			lastColumnResizerTappedDate.value = 0;
			return;
		}
		lastColumnResizerTapped.value = column;
		lastColumnResizerTappedDate.value = Date.now();
	}
	resizing.value.resizing = true;
	resizing.value.resizingColumn = column;
	resizing.value.width = event.target.parentElement.offsetWidth;
	resizing.value.lastX = eventIsTouch
		? event.targetTouches[0].clientX
		: event.x;
};

const columnResizing = event => {
	if (resizing.value.resizing) {
		const eventIsTouch = event.type === "touchmove";
		if (!eventIsTouch && event.buttons !== 1) {
			resizing.value.resizing = false;
			storeTableSettings();
		}
		const x = eventIsTouch ? event.changedTouches[0].clientX : event.x;

		resizing.value.width -= resizing.value.lastX - x;
		resizing.value.lastX = x;
		if (
			resizing.value.resizingColumn.minWidth &&
			resizing.value.resizingColumn.maxWidth
		) {
			resizing.value.resizingColumn.width = Math.max(
				Math.min(
					resizing.value.resizingColumn.maxWidth,
					resizing.value.width
				),
				resizing.value.resizingColumn.minWidth
			);
		} else if (resizing.value.resizingColumn.minWidth) {
			resizing.value.resizingColumn.width = Math.max(
				resizing.value.width,
				resizing.value.resizingColumn.minWidth
			);
		} else if (resizing.value.resizingColumn.maxWidth) {
			resizing.value.resizingColumn.width = Math.min(
				resizing.value.resizingColumn.maxWidth,
				resizing.value.width
			);
		} else {
			resizing.value.resizingColumn.width = resizing.value.width;
		}
		resizing.value.width = resizing.value.resizingColumn.width;
		console.log(`New width: ${resizing.value.width}px`);
		storeTableSettings();
	}
};

const columnResizingStop = () => {
	resizing.value.resizing = false;
	storeTableSettings();
};

const filterTypes = filter => {
	if (!filter || !filter.filterTypes) return [];
	return filter.filterTypes.map(
		filterType => allFilterTypes.value[filterType]
	);
};

const changeFilterType = index => {
	editingFilters.value[index].filterType =
		allFilterTypes.value[
			editingFilters.value[index].filter.defaultFilterType
		];
};

const applyFilterAndGetData = () => {
	appliedFilters.value = JSON.parse(JSON.stringify(editingFilters.value));
	appliedFilterOperator.value = filterOperator.value;
	page.value = 1;
	getData();
	storeTableSettings();
};

const columnOrderChanged = () => {
	storeTableSettings();
};

const getTableSettings = () => {
	const urlTableSettings = <
		{
			page: number;
			pageSize: number;
			shownColumns: string[];
			columnOrder: string[];
			columnWidths: {
				name: string;
				width: number;
			}[];
			columnSort: {
				[name: string]: string;
			};
			filter: {
				appliedFilters: TableFilter[];
				appliedFilterOperator: string;
			};
		}
	>{};
	if (props.query) {
		if (route.query.page)
			urlTableSettings.page = Number.parseInt(<string>route.query.page);
		if (route.query.pageSize)
			urlTableSettings.pageSize = Number.parseInt(
				<string>route.query.pageSize
			);
		if (route.query.shownColumns)
			urlTableSettings.shownColumns = JSON.parse(
				<string>route.query.shownColumns
			);
		if (route.query.columnOrder)
			urlTableSettings.columnOrder = JSON.parse(
				<string>route.query.columnOrder
			);
		if (route.query.columnWidths)
			urlTableSettings.columnWidths = JSON.parse(
				<string>route.query.columnWidths
			);
		if (route.query.columnSort)
			urlTableSettings.columnSort = JSON.parse(
				<string>route.query.columnSort
			);
		if (route.query.filter)
			urlTableSettings.filter = JSON.parse(<string>route.query.filter);
	}

	const localStorageTableSettings = JSON.parse(
		localStorage.getItem(`advancedTableSettings:${props.name}`)
	);

	return {
		...localStorageTableSettings,
		...urlTableSettings
	};
};

const onWindowResize = () => {
	if (windowResizeDebounceTimeout.value)
		clearTimeout(windowResizeDebounceTimeout.value);

	windowResizeDebounceTimeout.value = setTimeout(() => {
		// Only change the position if the popup is actually visible
		if (selectedRows.value.length === 0) return;

		const bulkActions = {
			height: 46,
			width: 400,
			...props.bulkActions
		};

		setInitialBox(
			{
				top: document.body.clientHeight - bulkActions.height - 10,
				left: (document.body.clientWidth - bulkActions.width) / 2,
				...bulkActions
			},
			true
		);
	}, 50);
};

const updateData = (index, data) => {
	rows.value[index] = { ...rows.value[index], ...data, updated: true };
};

const removeData = index => {
	rows.value[index] = {
		...rows.value[index],
		selected: false,
		removed: true
	};
};

onMounted(async () => {
	const tableSettings = getTableSettings();

	const columns = [
		...props.columns.map(column => ({
			...props.columnDefault,
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

	if (hasCheckboxes.value)
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

	if (props.events && props.events.updated)
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

	orderedColumns.value = columns.sort((columnA, columnB) => {
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

	shownColumns.value = orderedColumns.value
		.filter(column => {
			// If table settings exist, use shownColumns from settings to determine which columns to show
			if (tableSettings && tableSettings.shownColumns)
				return tableSettings.shownColumns.indexOf(column.name) !== -1;
			// Table settings don't exist, only show if the default visibility isn't hidden
			return column.defaultVisibility !== "hidden";
		})
		.map(column => column.name);

	recalculateWidths();

	if (tableSettings) {
		// If table settings' page is an integer, use it for the page
		if (Number.isInteger(tableSettings?.page))
			page.value = tableSettings.page;

		// If table settings' pageSize is an integer, use it for the pageSize
		if (Number.isInteger(tableSettings?.pageSize))
			pageSize.value = tableSettings.pageSize;

		// If table settings' columnSort exists, sort all still existing columns based on table settings' columnSort object
		if (tableSettings.columnSort) {
			Object.entries(tableSettings.columnSort).forEach(
				([columnName, sortDirection]) => {
					if (
						props.columns.find(column => column.name === columnName)
					)
						sort.value[columnName] = sortDirection;
				}
			);
		}

		// If table settings' columnWidths exists, load the stored widths into the columns
		if (tableSettings.columnWidths) {
			orderedColumns.value = orderedColumns.value.map(orderedColumn => {
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
			// Set the applied filter operator and filter operator to the value stored in table settings
			appliedFilterOperator.value = filterOperator.value =
				tableSettings.filter.appliedFilterOperator;
			// Set the applied filters and editing filters to the value stored in table settings, for all filters that are allowed
			appliedFilters.value = tableSettings.filter.appliedFilters.filter(
				appliedFilter =>
					props.filters.find(
						(filter: { name: string }) =>
							appliedFilter.filter.name === filter.name
					)
			);
			editingFilters.value = tableSettings.filter.appliedFilters.filter(
				appliedFilter =>
					props.filters.find(
						(filter: { name: string }) =>
							appliedFilter.filter.name === filter.name
					)
			);
		}
	}

	socket.onConnect(() => {
		getData();
		if (props.query) setQuery();
		if (props.events) {
			// if (props.events.room)
			// 	socket.dispatch("apis.joinRoom", props.events.room, () => {});
			if (props.events.adminRoom)
				socket.dispatch(
					"apis.joinAdminRoom",
					props.events.adminRoom,
					() => {}
				);
		}
		props.filters.forEach(filter => {
			if (filter.autosuggest && filter.autosuggestDataAction) {
				socket.dispatch(filter.autosuggestDataAction, res => {
					if (res.status === "success") {
						const { items } = res.data;
						autosuggest.value.allItems[filter.name] = items;
					} else {
						new Toast(res.message);
					}
				});
			}
		});
		// TODO, this doesn't address special properties
		if (props.events && props.events.updated)
			socket.on(`event:${props.events.updated.event}`, res => {
				const index = rows.value
					.map(row => row._id)
					.indexOf(
						props.events.updated.id
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
				const row = props.events.updated.item
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
				updateData(index, row);
			});
		if (props.events && props.events.removed)
			socket.on(`event:${props.events.removed.event}`, res => {
				const index = rows.value
					.map(row => row._id)
					.indexOf(
						props.events.removed.id
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
				removeData(index);
			});
	});

	if (props.keyboardShortcuts) {
		// Navigation section

		// Page navigation section
		keyboardShortcuts.registerShortcut("advancedTable.previousPage", {
			keyCode: 37, // 'Left arrow' key
			ctrl: true,
			preventDefault: false,
			handler: event => {
				// Previous page
				if (aModalIsOpen.value) return;
				if (
					document.activeElement.nodeName === "INPUT" ||
					document.activeElement.nodeName === "TEXTAREA"
				)
					return;
				event.preventDefault();
				changePage(page.value - 1);
			}
		});

		keyboardShortcuts.registerShortcut("advancedTable.nextPage", {
			keyCode: 39, // 'Right arrow' key
			ctrl: true,
			preventDefault: false,
			handler: event => {
				// Next page
				if (aModalIsOpen.value) return;
				if (
					document.activeElement.nodeName === "INPUT" ||
					document.activeElement.nodeName === "TEXTAREA"
				)
					return;
				event.preventDefault();
				changePage(page.value + 1);
			}
		});

		keyboardShortcuts.registerShortcut("advancedTable.firstPage", {
			keyCode: 37, // 'Left arrow' key
			ctrl: true,
			shift: true,
			preventDefault: false,
			handler: event => {
				// First page
				if (aModalIsOpen.value) return;
				if (
					document.activeElement.nodeName === "INPUT" ||
					document.activeElement.nodeName === "TEXTAREA"
				)
					return;
				event.preventDefault();
				changePage(1);
			}
		});

		keyboardShortcuts.registerShortcut("advancedTable.lastPage", {
			keyCode: 39, // 'Right arrow' key
			ctrl: true,
			shift: true,
			preventDefault: false,
			handler: event => {
				// Last page
				if (aModalIsOpen.value) return;
				if (
					document.activeElement.nodeName === "INPUT" ||
					document.activeElement.nodeName === "TEXTAREA"
				)
					return;
				event.preventDefault();
				changePage(lastPage.value);
			}
		});

		// Reset localStorage section
		keyboardShortcuts.registerShortcut("advancedTable.resetLocalStorage", {
			keyCode: 116, // 'F5' key
			ctrl: true,
			preventDefault: false,
			handler: () => {
				// Reset local storage
				if (aModalIsOpen.value) return;
				console.log("Reset local storage");
				localStorage.removeItem(`advancedTableSettings:${props.name}`);
				router.push({ query: {} });
			}
		});

		// Selecting section
		keyboardShortcuts.registerShortcut("advancedTable.selectAll", {
			keyCode: 65, // 'A' key
			ctrl: true,
			preventDefault: false,
			handler: event => {
				if (aModalIsOpen.value) return;
				if (
					document.activeElement.nodeName === "INPUT" ||
					document.activeElement.nodeName === "TEXTAREA"
				)
					return;
				event.preventDefault();
				toggleAllRows();
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
						if (aModalIsOpen.value) return;
						if (selectedRows.value.length === 0) return;
						const bulkActionsElement =
							bulkPopup.value.querySelector(".bulk-actions");
						bulkActionsElement.children[i - 1].click();
					}
				}
			);
		}

		keyboardShortcuts.registerShortcut(`advancedTable.selectPopupAction1`, {
			keyCode: 48, // '0' key
			ctrl: true,
			preventDefault: true,
			handler: () => {
				// Select popup action 0
				if (aModalIsOpen.value) return;
				if (selectedRows.value.length === 0) return;
				const bulkActionsElement =
					bulkPopup.value.querySelector(".bulk-actions");
				bulkActionsElement.children[
					bulkActionsElement.children.length - 1
				].focus();
			}
		});
	}

	await nextTick();

	onWindowResize();
	window.addEventListener("resize", onWindowResize);
});

onUnmounted(() => {
	window.removeEventListener("resize", onWindowResize);
	if (storeTableSettingsDebounceTimeout.value)
		clearTimeout(storeTableSettingsDebounceTimeout.value);
	if (windowResizeDebounceTimeout.value)
		clearTimeout(windowResizeDebounceTimeout.value);
	if (columnOrderChangedDebounceTimeout.value)
		clearTimeout(columnOrderChangedDebounceTimeout.value);

	if (props.keyboardShortcuts) {
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
});

watch(selectedRows, (newSelectedRows, oldSelectedRows) => {
	// If selected rows goes from zero to one or more selected, trigger onWindowResize, as otherwise the popup could be out of bounds
	if (oldSelectedRows.length === 0 && newSelectedRows.length > 0)
		onWindowResize();
});
</script>

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
							<button class="button dropdown-toggle">
								<i class="material-icons">
									{{
										showFiltersDropdown
											? "expand_less"
											: "expand_more"
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
								class="advanced-filter control is-grouped is-expanded"
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
											class="material-icons icon-with-button"
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
											class="material-icons icon-with-button"
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
							<button class="button dropdown-toggle">
								<i class="material-icons">
									{{
										showColumnsDropdown
											? "expand_less"
											: "expand_more"
									}}
								</i>
							</button>
						</div>

						<template #content>
							<div class="nav-dropdown-items">
								<draggable-list
									v-model:list="orderedColumns"
									item-key="name"
									@update="columnOrderChanged"
									:attributes="{
										class: column => ({
											sortable: column.sortable,
											'nav-item': true
										})
									}"
									:disabled="column => !column.draggable"
									tag="button"
								>
									<template #item="{ element: column }">
										<template
											v-if="
												column.name !== 'select' &&
												column.name !== 'placeholder' &&
												column.name !==
													'updatedPlaceholder'
											"
										>
											<div
												@click.prevent="
													toggleColumnVisibility(
														column
													)
												"
											>
												<p
													class="control is-expanded checkbox-control"
												>
													<label class="switch">
														<input
															type="checkbox"
															:id="`column-dropdown-checkbox-${column.name}`"
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
													<label
														:for="`column-dropdown-checkbox-${column.name}`"
													>
														<span></span>
														<p>
															{{
																column.displayName
															}}
														</p>
													</label>
												</p>
											</div>
										</template>
									</template>
								</draggable-list>
							</div>
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
						<tr>
							<draggable-list
								v-model:list="orderedColumns"
								item-key="name"
								@update="columnOrderChanged"
								tag="th"
								:attributes="{
									style: column => ({
										minWidth: Number.isNaN(column.minWidth)
											? column.minWidth
											: `${column.minWidth}px`,
										width: Number.isNaN(column.width)
											? column.width
											: `${column.width}px`,
										maxWidth: Number.isNaN(column.maxWidth)
											? column.maxWidth
											: `${column.maxWidth}px`
									}),
									class: column => ({
										sortable: column.sortable
									})
								}"
								:disabled="column => !column.draggable"
							>
								<template #item="{ element: column }">
									<template
										v-if="
											shownColumns.indexOf(
												column.name
											) !== -1 &&
											(column.name !==
												'updatedPlaceholder' ||
												rows.length > 0)
										"
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
														!sort[
															column.sortProperty
														]
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
												columnResizingStart(
													column,
													$event
												)
											"
											@touchstart.prevent.stop="
												columnResizingStart(
													column,
													$event
												)
											"
											@mouseup="columnResizingStop()"
											@touchend="columnResizingStop()"
											@dblclick="columnResetWidth(column)"
										></div>
									</template>
								</template>
							</draggable-list>
						</tr>
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
							:ref="el => (rowElements[`row-${itemIndex}`] = el)"
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
				top: dragBox.top + 'px',
				left: dragBox.left + 'px',
				width: dragBox.width + 'px',
				height: dragBox.height + 'px'
			}"
			ref="bulkPopup"
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
					@dblclick="resetBoxPosition()"
				>
					drag_indicator
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.table-outer-container {
		.table-container .table {
			&,
			:deep(thead th) {
				background-color: var(--dark-grey-3) !important;
				color: var(--light-grey-2);
			}

			tr {
				:deep(th),
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
					:deep(th),
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
	border-radius: @border-radius;
	box-shadow: @box-shadow;
	margin: 10px 0;
	overflow: hidden;

	.table-container {
		overflow-x: auto;

		table {
			border-collapse: separate;
			table-layout: fixed;

			:deep(thead) {
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

						:deep(.row-options) {
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
			:deep(thead tr),
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
				:deep(thead),
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
			font-size: 14px;
			line-height: 34px;
			padding-left: 8px;
			padding-right: 8px;
		}
		:deep(& > div > input) {
			border-radius: 0;
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
			}
			.control {
				margin-bottom: 0 !important;
				&:nth-child(1) > select {
					border-radius: @border-radius 0 0 0;
				}
				&:nth-child(2) > select {
					border-radius: 0 @border-radius 0 0;
				}
				:deep(&:nth-child(3)) {
					& > input,
					& > div > input,
					& > select {
						border-radius: 0 0 0 @border-radius;
					}
				}
				&:nth-child(4) > button {
					border-radius: 0 0 @border-radius 0;
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

:deep(.bulk-popup) {
	display: flex;
	position: fixed;
	flex-direction: row;
	width: 100%;
	max-width: 400px;
	line-height: 36px;
	z-index: 5;
	border: 1px solid var(--light-grey-3);
	border-radius: @border-radius;
	box-shadow: @box-shadow-dropdown;
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

		.import-album-icon {
			color: var(--purple);
		}
	}
}
</style>
