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
	var draggingItemIndex: undefined | number;
	var draggingItemListName: undefined | string;
	var draggingItemOnMove: undefined | ((index: number) => any);
}

export {};
