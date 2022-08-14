/* eslint no-var: 0 */
/* eslint vars-on-top: 0 */

declare global {
	var lofig: any;
	var stationInterval: number;
	var YT: any;
	var stationNextSongTimeout: any;
	var grecaptcha: any;
	var addToPlaylistDropdown: any;
	var scrollDebounceId: any;
	var focusedElementBefore: any;
	var draggingItem:
		| undefined
		| {
				itemIndex: number;
				itemListUuid: string;
				itemGroup: string;
				itemOnMove: (index: number) => any;
				initialItemIndex: number;
				initialItemListUuid: string;
		  };
}

export {};
