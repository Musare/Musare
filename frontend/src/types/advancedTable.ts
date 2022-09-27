export interface TableColumn {
	name?: string;
	displayName?: string;
	properties?: string[];
	sortable?: boolean;
	sortProperty?: string;
	hidable?: boolean;
	defaultVisibility?: string;
	draggable?: boolean;
	resizable?: boolean;
	minWidth?: number;
	width?: number;
	maxWidth?: number;
	defaultWidth?: number;
}

export interface TableFilter {
	name: string;
	displayName: string;
	property: string;
	filterTypes: string[];
	defaultFilterType: string;
	autosuggest?: boolean;
	autosuggestDataAction?: string;
	dropdown?: [string | boolean | number, string][];
}

export interface TableEvents {
	adminRoom: string;
	updated?: {
		event: string;
		id: string;
		item: string;
	};
	removed?: {
		event: string;
		id: string;
	};
}

export interface TableBulkActions {
	width?: number;
	height?: number;
}
